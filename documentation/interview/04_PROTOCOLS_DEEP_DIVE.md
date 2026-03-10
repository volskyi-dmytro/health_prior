# Protocol Deep Dives: MCP, A2A, and SMART on FHIR

HealthPrior demonstrates three interoperability protocols working in concert. This document explains each in depth for technical interview discussions.

---

## Section 1: MCP — Model Context Protocol

### What It Is

MCP (Model Context Protocol) is Anthropic's open protocol for giving AI models structured, reliable access to external tools and data. Rather than asking an LLM to recall facts from training, MCP lets the model call a well-defined tool, get back real structured data, and reason over it. Think of it as a type-safe RPC layer sitting between the LLM and the outside world.

In HealthPrior, the MCP server runs as its own process (port 8001) built with [fastmcp](https://github.com/jlowin/fastmcp). The backend calls it before every LLM invocation to ground the prompt in real data.

### Transport: JSON-RPC 2.0

MCP uses JSON-RPC 2.0 over HTTP. Tool calls are POST requests to `/mcp/` with a JSON body like:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": { "name": "get_coverage_criteria", "arguments": { "policy_id": "MCR-621" } },
  "id": 1
}
```

The response wraps the tool's return value in the standard JSON-RPC result envelope.

### Tool Discovery: `/.well-known/mcp.json`

Any agent or client can issue a GET to `http://localhost:8001/.well-known/mcp.json` to receive a machine-readable document describing every registered tool: its name, description, and full JSON Schema for inputs. This is the discovery pattern that makes the MCP server self-describing — an A2A-compatible agent can read this document and know what the server can do before making any tool call.

The discovery document also publishes the FHIR base URL (`https://hapi.fhir.org/baseR4`) and a `capabilities` array (`["fhir_search", "fhir_read", "icd10_lookup", "fhir_validation", "coverage_criteria"]`).

### All 8 Tools

**Coverage and policy tools:**

| Tool | Input | Output | What it does |
|------|-------|--------|--------------|
| `get_coverage_criteria` | `policy_id: str` (e.g. `"MCR-621"`) | Structured criteria dict loaded from JSON | Reads the MCR-621 policy file from `app/data/` and returns the full decision criteria — indications, documentation requirements, and denial criteria — that the LLM uses to evaluate coverage. |
| `search_icd10_codes` | `condition_description: str` (plain English) | `list[{"code": str, "description": str}]` | Keyword-matches the description against a lookup table of common lumbar/spine conditions and returns relevant ICD-10 codes. Falls back to `M54.5` (low back pain) if no match. |
| `validate_fhir_resource` | `resource: dict` (a FHIR resource object) | `{"valid": bool, "errors": list, "warnings": list}` | Checks required fields by resource type (e.g. Condition requires `code` + `clinicalStatus`). Warns if `_sourceRef` is missing. Used by the backend retry loop after LLM structuring. |
| `get_prior_auth_requirements` | `procedure_code: str` (CPT), `payer: str` | Dict with `required`, `documentation_required`, `turnaround_days`, `urgent_criteria` | Returns prior auth documentation requirements for CPT 72148 / 72149 against Molina. Provides the LLM with the exact list of documents needed in the prior auth package. |
| `health_check` | (none) | `{"status": "ok", "service": "healthprior-mcp", "tools": 8}` | Liveness probe. |

**FHIR data access tools (SMART on FHIR):**

| Tool | Input | Output | What it does |
|------|-------|--------|--------------|
| `fetch_patient_record` | `fhir_server_url: str`, `patient_id: str` | FHIR `Bundle` (searchset) | Fires four concurrent HTTP requests (`asyncio.gather`) for Patient demographics, active Conditions, active MedicationRequests, and the 20 most recent Observations. Assembles them into a single FHIR Bundle. This is the backbone of the "Fetch from FHIR Server" input mode in Step 1. |
| `search_fhir_resources` | `fhir_server_url: str`, `resource_type: str`, `search_params: dict` | FHIR searchset Bundle | Generic FHIR search — passes `search_params` as query parameters. Use this when you need a single resource type with custom SearchParameters. |
| `get_structure_definition` | `resource_type: str` (e.g. `"Condition"`) | Full FHIR R4 StructureDefinition JSON | Fetches the canonical StructureDefinition from `hl7.org/fhir/R4/{ResourceType}.profile.json` and caches it in memory. Provides schema grounding — field names, cardinality, data types — so the LLM constructs valid FHIR resources. |

### The Grounding Pattern: MCP Before LLM

The critical design principle: the backend always calls MCP tools *before* sending the prompt to the LLM.

For note structuring (`/notes/structure`):
1. Call `get_coverage_criteria("MCR-621")` — inject the policy criteria into the system prompt
2. Call `get_structure_definition("Condition")` etc. — inject FHIR schema into the prompt
3. Now prompt the LLM to extract FHIR resources from the clinical note

For coverage evaluation (`/coverage/evaluate`), handled by the Payer Agent:
1. Payer Agent calls `get_coverage_criteria` to get the live policy document
2. Evaluation prompt is built around the real criteria, not training knowledge

Why this matters: an LLM asked to recall MCR-621 criteria from memory may hallucinate details, get thresholds wrong, or use outdated policy text. With MCP grounding, the LLM receives the authoritative JSON — exact indications, exact documentation requirements — and reasons over it. This is the difference between a demo toy and a clinically credible system.

### Graceful Degradation

In `mcp_client.py`, MCP calls are wrapped in try/except. If the MCP server is unreachable or returns an error, the backend logs the failure and continues with a fallback context string (e.g., "coverage criteria unavailable — evaluate based on general lumbar MRI guidelines"). The LLM call still proceeds. This means the system degrades gracefully rather than hard-failing, which is important for a prototype where the MCP server might be cold-starting.

---

## Section 2: A2A — Agent-to-Agent Protocol

### What It Is

A2A (Agent-to-Agent) is a protocol for AI agents to communicate with each other, delegate tasks, and coordinate work asynchronously. Where MCP is the interface between a model and its tools, A2A is the interface between two autonomous agents — each potentially running a different model, with its own tools and business logic.

In HealthPrior, the Clinical Agent (backend, port 8100) delegates coverage evaluation to the Payer Agent (port 8200) via A2A. The Payer Agent is a separate FastAPI process that owns the MCR-621 evaluation logic and its own LLM calls.

### AgentCard: `/.well-known/agent.json`

Before calling an agent, a client discovers what it can do by fetching its AgentCard:

```
GET http://localhost:8200/.well-known/agent.json
```

The HealthPrior Payer Agent's card declares:
- **name**: `"HealthPrior Payer Agent"`
- **description**: `"Molina MCR-621 prior authorization coverage evaluator — A2A compliant"`
- **capabilities**: `{ "streaming": true }` — the agent supports SSE task subscriptions
- **skills**: one skill — `evaluate_mcr621` — which accepts a FHIR R4 Bundle as a `DataPart` and returns `APPROVED`/`DENIED` decisions, with an `input-required` loop for `NEEDS_MORE_INFO`

The AgentCard is the agent's self-describing "business card." The Clinical Agent fetches it at startup (via `A2AClient.get_agent_card()`) to verify the Payer Agent is reachable and capable before submitting tasks.

### Task Lifecycle States

```
submitted → working → completed
                    → input-required → working → completed
                    → failed
```

- **submitted**: Task accepted, evaluation not yet started. Returned immediately in the 202 response.
- **working**: Background evaluation is running (the LLM call is in flight).
- **completed**: Decision reached (APPROVED or DENIED). The task's `status.message` contains a `DataPart` with the full result dict.
- **input-required**: LLM returned `NEEDS_MORE_INFO`. The task's `status.message` contains a `TextPart` with the question text and the criterion at stake. The calling agent can reply via `POST /tasks/{task_id}/send`.
- **failed**: Unhandled exception or timeout (120s SSE timeout). `status.message` contains an error string.

### The Four Task Endpoints

| Endpoint | When to use |
|----------|-------------|
| `POST /tasks/send` | Standard async submission. Returns `202` with `task_id` immediately. The Clinical Agent then polls `GET /tasks/{task_id}` until the state is terminal. |
| `GET /tasks/{task_id}` | Poll for task status. Returns the full `Task` object including current state, history, and any artifacts. |
| `POST /tasks/sendSubscribe` | SSE stream. The connection stays open; the server pushes `TaskStatusUpdateEvent` frames as state transitions happen. Client gets the `submitted` event immediately, then `working`, then the terminal event. |
| `POST /tasks/{task_id}/send` | Continue a task that is in `input-required` state. Appends a user `Message` (TextPart with the answer) to the task history and re-runs evaluation with the full history as context. Returns `409 Conflict` if the task is not in `input-required` state. |

### SSE Streaming for Real-Time Updates

`POST /tasks/sendSubscribe` creates an `asyncio.Queue`, starts `_run_evaluation` as a background coroutine feeding state-change events into the queue, and immediately begins streaming them to the client as `data: {...}\n\n` SSE frames. The frontend (or calling agent) sees the `submitted → working → completed` transitions in real time without polling. A 120-second `asyncio.wait_for` timeout guards against hung evaluations.

### Multi-Turn Q&A: The `input-required` Flow

When the Payer Agent's LLM evaluation returns `NEEDS_MORE_INFO`, it means the FHIR bundle doesn't contain enough information to make a coverage decision on a specific criterion (e.g., duration of conservative therapy is not documented). The flow:

1. Task transitions to `input-required`; `status.message` contains the question
2. Clinical Agent (or the UI) displays the question to the user
3. User provides additional clinical context
4. `POST /tasks/{task_id}/send` with the answer — the full conversation history is replayed to the LLM so it has both the original FHIR bundle and the clarification
5. Evaluation re-runs and reaches a terminal state

This multi-turn capability means the system can handle ambiguous cases without a hard DENIED, matching how real prior auth works (payers often request additional information before deciding).

### Why A2A Instead of a Direct Function Call

The coverage evaluation logic could have been a module in the backend. A2A was chosen for several reasons:

- **Decoupling**: The Payer Agent can be updated, redeployed, or swapped without touching the Clinical Agent. In production, different payers would run their own agents.
- **Independent scaling**: Coverage evaluation is LLM-heavy and slower. It can be scaled on separate infrastructure from the note structuring service.
- **Different LLM per agent**: The Clinical Agent and Payer Agent could run different models optimized for their respective tasks (e.g., a fine-tuned payer policy model for the Payer Agent).
- **Async processing**: The 202 + poll pattern means the Clinical Agent is not blocked during the LLM call. In a production system with thousands of requests, this matters for throughput.
- **Protocol reuse**: Any A2A-compatible client can call the Payer Agent without knowing anything about HealthPrior internals.

---

## Section 3: SMART on FHIR

### What It Is

SMART on FHIR (Substitutable Medical Applications and Reusable Technologies) is the OAuth2-based authorization framework for EHR app integration and FHIR data access. It defines how a third-party application launches from within an EHR context, requests scoped access to patient data, and receives FHIR resources back from the EHR's FHIR server.

In HealthPrior, SMART on FHIR is the *data access layer* — the protocol that would, in production, govern how the system retrieves patient records from Epic or Cerner.

### The `fetch_patient_record` MCP Tool

This is the practical implementation of FHIR data access today. Given a `fhir_server_url` and `patient_id`, it fires four parallel HTTP requests using `asyncio.gather`:

1. `GET {base}/Patient/{patient_id}` — demographics
2. `GET {base}/Condition?patient={patient_id}&clinical-status=active` — active diagnoses
3. `GET {base}/MedicationRequest?patient={patient_id}&status=active` — current medications
4. `GET {base}/Observation?patient={patient_id}&_sort=-date&_count=20` — 20 most recent observations

All four run concurrently (not sequentially), so the fetch takes as long as the slowest query rather than the sum of all four. Results are assembled into a single FHIR `Bundle` of type `searchset` and returned to the backend, which uses it directly in Step 1b without any LLM processing.

### The `/.well-known/smart-configuration` Discovery Endpoint

The SMART App Launch Framework requires EHRs to publish a discovery document at `/.well-known/smart-configuration` (following RFC 8414). HealthPrior's backend serves this stub at:

```
GET http://localhost:8100/.well-known/smart-configuration
```

It returns:
```json
{
  "issuer": "https://healthprior.volskyi-dmytro.com",
  "authorization_endpoint": "https://healthprior.volskyi-dmytro.com/auth/github",
  "token_endpoint": null,
  "capabilities": ["launch-standalone", "client-public"],
  "scopes_supported": ["openid", "profile", "launch", "patient/*.read"],
  "grant_types_supported": ["authorization_code"]
}
```

`token_endpoint: null` honestly documents that the token exchange is not yet wired. The endpoint exists to signal intent and provide a foundation for future EHR integration — an EHR discovery client would find this document and know the authorization server is GitHub OAuth, not a full SMART token endpoint.

### Current State: Public HAPI Sandbox, No Auth Required

The HAPI FHIR sandbox (`https://hapi.fhir.org/baseR4`) is a public server with no authentication. The current `fetch_patient_record` implementation makes unauthenticated HTTP calls. This is appropriate for a prototype and demo, but means:

- Any valid patient ID on the HAPI sandbox can be fetched
- There is no patient consent check
- There is no audit of who accessed what

### What Production Would Need

Connecting to a real EHR (Epic, Cerner) requires the full SMART App Launch sequence:

1. **EHR registration**: Register HealthPrior as a SMART app with the EHR vendor, receive `client_id`
2. **Launch sequence**: EHR launches the app with a `launch` parameter; app exchanges it at `authorization_endpoint` for an auth code
3. **Token exchange**: Auth code is exchanged at `token_endpoint` for an access token scoped to specific resources (e.g., `patient/Condition.read patient/Observation.read`)
4. **Authenticated FHIR calls**: All FHIR requests include `Authorization: Bearer {access_token}`
5. **Token refresh**: Handle token expiry for long-running sessions

The `fetch_patient_record` tool would need to accept an `access_token` parameter and pass it in the `Authorization` header. The rest of the FHIR query logic stays the same — only the authentication layer changes.
