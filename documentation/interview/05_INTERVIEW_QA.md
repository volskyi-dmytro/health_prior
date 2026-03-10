# Interview Q&A Cheat Sheet

Likely technical interview questions with honest, precise answers. Each answer reflects the actual implementation — prototype limitations are acknowledged directly, because interviewers respect candor more than overselling.

---

## Architecture & Design

**Q: Why did you use microservices / multiple containers instead of a monolith?**

The system has three distinct deployment concerns: the React frontend (static assets served via Nginx), the FastAPI backend (stateful LLM calls, PostgreSQL), and the MCP server (stateless tool execution). Separating them means each can be rebuilt and redeployed independently — changing a tool's logic in the MCP server doesn't require redeploying the backend, and Nginx can be scaled or replaced without touching business logic. That said, for a prototype this adds operational overhead, and a monolith would have been faster to build initially. The payoff is that the architecture demonstrates production-relevant patterns (service discovery, health checks, inter-service HTTP) that a toy monolith wouldn't show.

**Q: Why is the MCP server a separate service and not just a module in the backend?**

Two reasons: protocol compliance and reusability. MCP is a network protocol — its transport is JSON-RPC 2.0 over HTTP, and the discovery mechanism (`/.well-known/mcp.json`) assumes a distinct HTTP server that any MCP-compatible client can call. If the tools were internal Python functions, the system wouldn't be demonstrating MCP at all — it would just be function calls with a label. Keeping the MCP server separate also means any other agent (a second Clinical Agent, a third-party tool) can call the same tools without going through the backend. The cost is an extra network hop on every LLM call, which is worth it for the protocol demonstration.

**Q: Why A2A for coverage evaluation instead of calling the evaluation logic directly?**

The honest answer is that it's a deliberate architectural demonstration. The Payer Agent could be a module. But A2A models how real multi-payer infrastructure would work: each payer runs their own evaluation agent with their own policy data and potentially their own fine-tuned model. A2A gives you the async task lifecycle (202 + poll), SSE streaming for real-time status, and the `input-required` loop for multi-turn clarification — none of which you get from a direct function call. The decoupling also means the Payer Agent can be updated (e.g., a new policy version loaded) without the Clinical Agent needing to know. In a production system this separation would be essential; in a prototype it's a design statement about where the system is headed.

**Q: How does the `session_id` work and why thread it through all three API calls?**

The frontend generates a UUID (`crypto.randomUUID()`) at wizard start and includes it in the request body for `/notes/structure`, `/coverage/evaluate`, and `/prior-auth/generate`. The backend writes this `session_id` into every `audit_log` row created during that wizard run. The Audit Trail tab then queries `GET /prior-auth/submissions/{id}/audit`, which joins on `session_id` to return all three audit entries together — note structuring, coverage evaluation, and prior auth generation — with their individual token counts, latency, and MCP tools called. Without threading the `session_id`, you could only audit the final packaging step, not the full chain of LLM calls that produced it. It's a simple correlation mechanism but it makes the audit trail genuinely useful for debugging a submission end-to-end.

**Q: Why PostgreSQL with JSONB instead of a document database like MongoDB?**

The core submission record (`PriorAuthSubmission`) is a mix of typed relational fields (timestamps, decision enum, policy_id FK) and semi-structured blobs (FHIR bundle, coverage result, prior auth package). JSONB handles the blobs without a schema migration every time the FHIR structure changes, while the relational fields give you indexed queries for things like `SELECT * WHERE decision = 'APPROVED' AND created_at > '2025-01-01'`. PostgreSQL also lets you join the `audit_log` table against submissions using standard SQL, and the async SQLAlchemy / asyncpg stack is well-supported in production. MongoDB would have been fine for the document storage but would lose the relational querying and audit join without additional effort.

---

## AI / LLM Engineering

**Q: How do you ensure the LLM output is reliable for a clinical use case?**

Three layers: grounding, validation, and retry. Grounding means the LLM never has to recall clinical facts from training — MCP tools inject the actual MCR-621 policy criteria and FHIR StructureDefinitions into the prompt before the call. Validation means every FHIR resource the LLM returns is checked by `validate_fhir_resource` for required fields and `_sourceRef` citations; if validation fails, the backend retries once with a clarifying prompt. Structured output means the prompt demands JSON in a specific schema, and the response is parsed with Pydantic — a response that doesn't parse returns HTTP 422 rather than silently passing bad data downstream. These three layers don't make the output perfect, but they make failures loud and auditable rather than quiet and dangerous.

**Q: What's the FHIR validation retry mechanism and why?**

After the LLM returns a FHIR bundle, the backend calls `validate_fhir_resource` on each resource via the MCP server. If any resource has errors (not just warnings — missing required fields), the backend makes a second LLM call with the original prompt plus an appended note: "The previous response had validation errors: [list]. Please correct them and return the full bundle again." If the retry also fails validation, the backend returns HTTP 422 to the frontend with the validation errors. The retry is single-attempt — it doesn't loop — because a second failure usually indicates a structural prompt problem, not a transient LLM error, and infinite retries would mask the real issue while burning tokens.

**Q: How does model comparison work under the hood?**

The frontend Step 1 has a "Compare Models" toggle that reveals a second model picker. When submitted with a `model_b` field, the backend's note structuring endpoint uses `asyncio.gather` to call the OpenRouter LLM API twice in parallel — once with `model` and once with `model_b` — with identical prompts and MCP context. Both responses are returned in a single JSON object. The frontend Step 2 renders both FHIR bundles side by side in separate columns. Total latency is `max(model_a_latency, model_b_latency)` rather than the sum, so the comparison costs no more time than the slower model alone. Both calls are logged separately in `audit_log` with their respective token counts and latencies.

**Q: What temperature do you use for LLM calls and why?**

Temperature 0 (or as close to 0 as OpenRouter allows per model) for all three LLM tasks — note structuring, coverage evaluation, and prior auth generation. Clinical AI requires determinism and reproducibility. A temperature above 0 means two identical inputs could produce different FHIR bundles or different coverage decisions, which is unacceptable in a healthcare context where the same note should always yield the same result. The tradeoff is that low temperature can make the model more rigid when the input is ambiguous, but for structured extraction and rule-based evaluation, that rigidity is a feature rather than a bug.

**Q: How do you prevent prompt injection when a user pastes arbitrary clinical notes?**

Honestly, the current implementation does not have robust prompt injection defenses — it's a prototype. The clinical note is inserted into the user message section of the prompt (not the system message), and the system prompt is written to be instruction-focused rather than data-focused, which provides some structural separation. A production system would need: input length limits, content filtering before the LLM call, output validation to ensure the LLM stayed on task (the FHIR validation catches gross deviations), and audit logging so injected attempts are detectable after the fact. This is a known gap and worth being direct about in an interview.

---

## FHIR & Healthcare Standards

**Q: What is FHIR and why is it the right format for this use case?**

FHIR (Fast Healthcare Interoperability Resources) is the HL7 R4 standard for representing clinical data as typed JSON resources — Condition, MedicationRequest, Observation, Patient, etc. — each with defined fields, terminology bindings, and cardinality rules. It's the right format here because prior authorization decisions are based on specific clinical criteria that map directly to FHIR resource fields: a Condition has an ICD-10 code (for diagnosis), an Observation has a value and a LOINC code (for test results), a MedicationRequest has a medication and status (for conservative therapy documentation). Using FHIR means the structured output is interoperable with real EHRs, payer systems, and the DaVinci PAS IG that governs prior auth standards — even if full compliance isn't implemented yet.

**Q: What are the `_sourceRef` fields and why do they matter?**

`_sourceRef` is a custom extension field added to every FHIR resource the LLM extracts. It contains a short verbatim quote from the original clinical note that the LLM used as evidence for that resource. For example, a Condition for lumbar radiculopathy might have `_sourceRef: "radiating pain down the left leg for 8 weeks"`. This serves two purposes: it gives clinicians a way to audit the extraction ("did the AI get this right?") without reading the full note, and it surfaces in the Step 2 UI as a citation tooltip. In a clinical system, unexplained AI output is a liability; `_sourceRef` makes the reasoning traceable. The `validate_fhir_resource` tool issues a warning (not an error) for resources missing `_sourceRef`, because the field is required by convention but not by the FHIR spec.

**Q: How does the MCR-621 policy get loaded and evaluated?**

The policy lives as a structured JSON file at `backend/app/data/mcr_621_criteria.json`, extracted from the Molina MCR-621 PDF using the `scripts/ingest_policy.py` script. At startup, `policy_loader.py` reads all JSON files in `app/data/` and makes them available by policy ID. The MCP `get_coverage_criteria` tool calls `load_policy("MCR-621")` and returns the full criteria dict. The Payer Agent's evaluation LLM prompt includes this criteria verbatim, then receives the FHIR bundle, and reasons over whether the bundle's contents satisfy each criterion. The decision is rule-following with an LLM as the reasoner, not a trained classifier — which means it generalizes to new policies just by adding a new JSON file.

**Q: Is this DaVinci PAS compliant? What would full compliance require?**

No, and being direct about this gap is important. The DaVinci Prior Authorization Support (PAS) IG requires the prior auth request to be a FHIR `Claim` resource conforming to the PAS Claim profile, the decision to come back as a FHIR `ClaimResponse`, and the exchange to happen via a `$submit` operation against the payer's FHIR endpoint — not an A2A task. HealthPrior uses `ServiceRequest` instead of `Claim`, returns the decision as custom JSON, and uses A2A for the transport. The system is *inspired* by DaVinci PAS and uses FHIR R4 bundles with a `transaction` type (which PAS does require), but a production implementation would need to replace the ServiceRequest-based bundle with a conformant PAS Claim profile and wire up the `$submit` operation. This is a known and documented gap in the README.

---

## Infrastructure & Ops

**Q: Walk me through what happens when you push code to main.**

A GitHub Actions workflow triggers on push to main. It builds Docker images for the backend, frontend, and payer agent, tags them with the commit SHA, and pushes to Docker Hub. A second job SSHs into the VPS using `VPS_SSH_KEY`, pulls the new images, and runs `docker compose up -d --build` to do a rolling replacement. Nginx continues serving the old containers until the new ones pass their health checks. The pipeline is straightforward — no blue/green deployment, no Kubernetes, no zero-downtime guarantee. For a prototype on a single VPS this is fine; at scale you'd want a proper orchestrator and canary deploys.

**Q: How is the app secured? What about the LLM API keys?**

User-facing auth is GitHub OAuth — the backend redirects to GitHub, receives a code, exchanges it for a token, and stores the GitHub user ID in a signed session cookie. All non-health endpoints require a valid session (the `require_auth` FastAPI dependency). The `OPENROUTER_API_KEY` and `DATABASE_URL` live in `.env`, which is gitignored and injected as Docker environment variables at runtime; they're also stored as GitHub Secrets for CI/CD. The MCP server and Payer Agent are not externally exposed — Nginx only proxies the frontend and backend; the internal services communicate over Docker's internal network. The main security gap is that the MCP server and Payer Agent have no authentication between themselves and the backend — in production, mutual TLS or API key auth between services would be needed.

**Q: What are the known limitations / what's not production-ready?**

Several honest gaps: (1) The MCP server's ICD-10 lookup is a hand-coded table of ~10 conditions — it would need a real ICD-10 database for general use. (2) FHIR validation is structural only — it doesn't check terminology bindings or value set membership. (3) The `/.well-known/smart-configuration` endpoint is a stub; real EHR integration would require full SMART App Launch. (4) Task state for the Payer Agent is in-memory (the `task_store` is a dict), so it doesn't survive restarts and won't work across multiple Payer Agent replicas. (5) No rate limiting on LLM calls. (6) No prompt injection defenses. (7) The DaVinci PAS compliance gaps described above. These are all addressable, but they reflect the prototype's scope honestly.

**Q: How would you scale this to handle 10,000 requests/day?**

At 10,000 requests/day (~7 per minute average, but likely spiky), the bottleneck is LLM call latency, not throughput. The current synchronous-per-request model would handle this fine on a single backend instance given async I/O. Real scaling concerns: (1) Replace the in-memory task store with Redis so Payer Agent tasks survive restarts and work across replicas. (2) Add a task queue (Celery + Redis or AWS SQS) for LLM calls so they don't block HTTP workers. (3) Add read replicas for PostgreSQL for history/audit queries. (4) Cache `get_coverage_criteria` results at the backend level (policy files don't change) to reduce MCP round trips. (5) Add request rate limiting per user to protect LLM API costs. The architecture is already async (FastAPI + asyncpg + httpx), so the path to horizontal scaling is relatively clean.

---

## Observability & Reliability

**Q: How do you debug a failed LLM call?**

Start with the `audit_log` table. Every LLM call writes a row with: `session_id`, `model`, `input_tokens`, `output_tokens`, `latency_ms`, `mcp_tools_called` (array), and `error` (null on success, exception string on failure). The `GET /prior-auth/submissions/{id}/audit` endpoint returns all audit rows for a session grouped by step. If a call failed, the `error` field tells you whether it was an HTTP error from OpenRouter, a Pydantic parse failure on the LLM's JSON output, or a validation error. If the LLM output was malformed, the raw response is logged at DEBUG level in the backend container logs (`docker compose logs backend`). The combination of structured audit rows for aggregate analysis and container logs for raw output covers most debugging scenarios.

**Q: What's in the audit log and how do you use it?**

The `audit_log` table has one row per LLM call with: `id`, `session_id`, `step` (structuring/evaluation/generation), `model`, `input_tokens`, `output_tokens`, `latency_ms`, `mcp_tools_called` (string array), `error`, `created_at`. In the UI, the Audit Trail tab on Step 4 fetches all rows for the current session and displays them in a timeline — you can see exactly which MCP tools were called before the structuring LLM, how many tokens the evaluation used, and where latency was spent. Operationally, the audit log is how you'd answer "why was this patient denied?" (examine the coverage evaluation row's model and which criteria were checked), "how much did this submission cost?" (sum input + output tokens and multiply by model pricing), and "is the system slower than usual?" (monitor `latency_ms` over time).

**Q: What happens if the payer agent goes down during coverage evaluation?**

If the Payer Agent is unreachable when the backend calls `A2AClient.send_task()`, the `httpx.RequestError` is caught and re-raised as HTTP 502 to the frontend, which shows an error state in Step 3. If the Payer Agent goes down *after* the task is submitted (while `working`), the backend's polling loop (`GET /tasks/{task_id}`) will eventually get a 502 and return an error to the frontend. The task state is lost because the Payer Agent's task store is in-memory — there is no recovery mechanism. In production, you'd want the task store in Redis (so tasks survive restarts), a retry queue for submitted tasks that lost their worker, and a dead-letter queue for tasks that failed permanently. For the prototype, the user can simply resubmit from Step 3, since the FHIR bundle from Step 2 is still in frontend state.
