"""
HealthPrior Clinical MCP Server
Real HTTP MCP server using fastmcp — invoked by the backend LLM workflow.
"""
import asyncio
import json
import uvicorn
import httpx
from fastmcp import FastMCP
from app.data.policy_loader import load_policy

mcp = FastMCP("HealthPrior Clinical MCP Server")

# ICD-10 lookup table for common lumbar/spine conditions
ICD10_LOOKUP = {
    "low back pain": [{"code": "M54.5", "description": "Low back pain"}],
    "lumbar radiculopathy": [{"code": "M54.4", "description": "Lumbago with sciatica"}, {"code": "M54.3", "description": "Sciatica"}],
    "lumbar disc herniation": [{"code": "M51.16", "description": "Intervertebral disc degeneration, lumbar region"}, {"code": "M51.17", "description": "Intervertebral disc degeneration, lumbosacral region"}],
    "spinal stenosis": [{"code": "M48.06", "description": "Spinal stenosis, lumbar region"}],
    "cauda equina syndrome": [{"code": "G83.4", "description": "Cauda equina syndrome"}],
    "spondylolisthesis": [{"code": "M43.16", "description": "Spondylolisthesis, lumbar region"}],
    "vertebral fracture": [{"code": "S32.009A", "description": "Unspecified fracture of unspecified lumbar vertebra"}],
    "spinal metastasis": [{"code": "C79.51", "description": "Secondary malignant neoplasm of bone"}],
    "muscle spasm": [{"code": "M62.838", "description": "Muscle spasm, other site"}],
    "degenerative disc disease": [{"code": "M51.36", "description": "Other intervertebral disc degeneration, lumbar region"}],
}

# Module-level cache for StructureDefinitions to avoid redundant network fetches
_sd_cache: dict[str, dict] = {}

FHIR_HEADERS = {"Accept": "application/fhir+json"}


def _extract_bundle_entries(bundle: dict) -> list[dict]:
    """Return the resource objects from a FHIR searchset Bundle."""
    return [e.get("resource", e) for e in bundle.get("entry", [])]


@mcp.tool()
async def get_coverage_criteria(policy_id: str) -> dict:
    """Retrieve clinical coverage criteria for a given payer policy ID.

    Returns structured decision criteria from Molina MCR-621 for Lumbar Spine MRI.

    Args:
        policy_id: Policy identifier (e.g., 'MCR-621')
    """
    try:
        return load_policy(policy_id)
    except FileNotFoundError:
        return {"error": f"Policy {policy_id} not found"}


@mcp.tool()
async def search_icd10_codes(condition_description: str) -> list[dict]:
    """Search ICD-10 codes relevant to a clinical condition description.

    Args:
        condition_description: Plain English description of the condition
    """
    condition_lower = condition_description.lower()
    results = []

    for key, codes in ICD10_LOOKUP.items():
        # Check for keyword overlap
        key_words = set(key.split())
        desc_words = set(condition_lower.split())
        if key_words & desc_words or key in condition_lower:
            results.extend(codes)

    # Deduplicate by code
    seen = set()
    unique = []
    for r in results:
        if r["code"] not in seen:
            seen.add(r["code"])
            unique.append(r)

    return unique or [{"code": "M54.5", "description": "Low back pain (default)"}]


@mcp.tool()
async def validate_fhir_resource(resource: dict) -> dict:
    """Validate a FHIR resource structure and return validation results.

    Args:
        resource: FHIR resource dict to validate
    """
    errors = []
    warnings = []

    resource_type = resource.get("resourceType")
    if not resource_type:
        errors.append("Missing required field: resourceType")
        return {"valid": False, "errors": errors, "warnings": warnings}

    required_by_type = {
        "Condition": ["code", "clinicalStatus"],
        "MedicationRequest": ["medication", "status"],
        "Observation": ["code", "status"],
        "Bundle": ["type"],
    }

    required_fields = required_by_type.get(resource_type, [])
    for field in required_fields:
        if field not in resource:
            errors.append(f"Missing required field for {resource_type}: {field}")

    if "_sourceRef" not in resource:
        warnings.append("Missing _sourceRef — source citation to clinical note is recommended")

    if not resource.get("id"):
        warnings.append("Missing id field — recommended for all resources")

    return {
        "valid": len(errors) == 0,
        "resource_type": resource_type,
        "errors": errors,
        "warnings": warnings,
    }


@mcp.tool()
async def get_prior_auth_requirements(procedure_code: str, payer: str) -> dict:
    """Get prior authorization requirements for a procedure code and payer.

    Args:
        procedure_code: CPT code (e.g., '72148')
        payer: Payer name (e.g., 'Molina Healthcare')
    """
    requirements_db = {
        ("72148", "molina"): {
            "required": True,
            "policy_id": "MCR-621",
            "procedure": "MRI Lumbar Spine without contrast",
            "documentation_required": [
                "Clinical notes documenting duration and nature of symptoms",
                "Documentation of conservative therapy trial (minimum 6 weeks for non-neurological cases)",
                "Physical examination findings including neurological assessment",
                "Relevant prior imaging reports",
                "ICD-10 diagnosis codes",
            ],
            "turnaround_days": 3,
            "urgent_criteria": "Cauda equina syndrome, progressive neurological deficit, suspected malignancy",
        },
        ("72149", "molina"): {
            "required": True,
            "policy_id": "MCR-621",
            "procedure": "MRI Lumbar Spine with contrast",
            "documentation_required": [
                "Same as 72148 plus",
                "Reason for contrast enhancement",
            ],
            "turnaround_days": 3,
        },
    }

    key = (procedure_code, payer.lower().split()[0] if payer else "")
    result = requirements_db.get(key, requirements_db.get((procedure_code, "molina"), None))

    if not result:
        return {
            "required": True,
            "note": f"No specific data for procedure {procedure_code} and payer {payer}. Prior auth generally required for MRI.",
            "turnaround_days": 3,
        }

    return result


@mcp.tool()
async def health_check() -> dict:
    """Health check endpoint for the MCP server."""
    return {"status": "ok", "service": "healthprior-mcp", "tools": 8}


@mcp.tool()
async def fetch_patient_record(fhir_server_url: str, patient_id: str) -> dict:
    """Fetch a complete patient clinical record from a FHIR R4 server.

    Retrieves Patient demographics, active Conditions, current MedicationRequests,
    and recent Observations using FHIR search operations.

    Args:
        fhir_server_url: Base URL of the FHIR R4 server (e.g. https://hapi.fhir.org/baseR4)
        patient_id: FHIR Patient resource ID
    """
    base = fhir_server_url.rstrip("/")

    async def _get(client: httpx.AsyncClient, url: str, params: dict | None = None) -> dict | None:
        try:
            resp = await client.get(url, params=params, headers=FHIR_HEADERS)
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError:
            return None
        except Exception:
            return None

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            patient_data, conditions_data, medications_data, observations_data = await asyncio.gather(
                _get(client, f"{base}/Patient/{patient_id}"),
                _get(client, f"{base}/Condition", {"patient": patient_id, "clinical-status": "active"}),
                _get(client, f"{base}/MedicationRequest", {"patient": patient_id, "status": "active"}),
                _get(client, f"{base}/Observation", {"patient": patient_id, "_sort": "-date", "_count": "20"}),
            )
    except Exception as exc:
        return {"error": f"Connection error reaching FHIR server: {exc}"}

    if patient_data is None:
        return {"error": f"Patient {patient_id} not found on FHIR server {fhir_server_url}"}

    conditions = _extract_bundle_entries(conditions_data) if conditions_data else []
    medications = _extract_bundle_entries(medications_data) if medications_data else []
    observations = _extract_bundle_entries(observations_data) if observations_data else []

    bundle = {
        "resourceType": "Bundle",
        "type": "searchset",
        "entry": [
            {"resource": patient_data},
            *[{"resource": r} for r in conditions],
            *[{"resource": r} for r in medications],
            *[{"resource": r} for r in observations],
        ],
    }
    return bundle


@mcp.tool()
async def search_fhir_resources(
    fhir_server_url: str,
    resource_type: str,
    search_params: dict,
) -> dict:
    """Search FHIR resources by type and search parameters.

    Executes a FHIR search operation using standard SearchParameters.

    Args:
        fhir_server_url: Base URL of the FHIR R4 server
        resource_type: FHIR resource type (Patient, Condition, Observation, etc.)
        search_params: Dict of FHIR search parameter name→value pairs
    """
    base = fhir_server_url.rstrip("/")
    params = {**search_params, "_format": "json"}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{base}/{resource_type}",
                params=params,
                headers=FHIR_HEADERS,
            )
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as exc:
        return {"error": f"FHIR server returned {exc.response.status_code}", "resource_type": resource_type}
    except Exception as exc:
        return {"error": f"Connection error: {exc}", "resource_type": resource_type}


@mcp.tool()
async def get_structure_definition(resource_type: str) -> dict:
    """Retrieve the FHIR R4 StructureDefinition for a resource type.

    Provides schema grounding — field names, cardinality, data types,
    and required elements — enabling accurate FHIR resource construction.

    Args:
        resource_type: FHIR resource type name (e.g. Condition, MedicationRequest)
    """
    if resource_type in _sd_cache:
        return _sd_cache[resource_type]

    url = f"https://hl7.org/fhir/R4/{resource_type}.profile.json"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            sd = resp.json()
            _sd_cache[resource_type] = sd
            return sd
    except Exception:
        return {"error": "StructureDefinition not available", "resource_type": resource_type}


# ---------------------------------------------------------------------------
# Build the ASGI app: get FastMCP's Starlette app (which owns the lifespan
# that initialises StreamableHTTPSessionManager) and inject our extra routes
# directly so we never break the session manager lifecycle.
# ---------------------------------------------------------------------------
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

app = mcp.http_app()


async def _health(request: Request):
    return JSONResponse({"status": "ok", "service": "healthprior-mcp"})


async def _mcp_discovery(request: Request):
    """Machine-readable MCP tool discovery document (Braman pattern)."""
    return JSONResponse({
        "schema_version": "1.0",
        "name": "HealthPrior Clinical MCP Server",
        "description": "FHIR-aware MCP tooling for prior authorization clinical workflows",
        "tools": [
            {
                "name": "get_coverage_criteria",
                "description": "Retrieve clinical coverage criteria for a given payer policy ID. Returns structured decision criteria from Molina MCR-621 for Lumbar Spine MRI.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "policy_id": {"type": "string", "description": "Policy identifier (e.g., 'MCR-621')"},
                    },
                    "required": ["policy_id"],
                },
            },
            {
                "name": "search_icd10_codes",
                "description": "Search ICD-10 codes relevant to a clinical condition description.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "condition_description": {"type": "string", "description": "Plain English description of the condition"},
                    },
                    "required": ["condition_description"],
                },
            },
            {
                "name": "validate_fhir_resource",
                "description": "Validate a FHIR resource structure and return validation results.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "resource": {"type": "object", "description": "FHIR resource dict to validate"},
                    },
                    "required": ["resource"],
                },
            },
            {
                "name": "get_prior_auth_requirements",
                "description": "Get prior authorization requirements for a procedure code and payer.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "procedure_code": {"type": "string", "description": "CPT code (e.g., '72148')"},
                        "payer": {"type": "string", "description": "Payer name (e.g., 'Molina Healthcare')"},
                    },
                    "required": ["procedure_code", "payer"],
                },
            },
            {
                "name": "health_check",
                "description": "Health check endpoint for the MCP server.",
                "input_schema": {"type": "object", "properties": {}, "required": []},
            },
            {
                "name": "fetch_patient_record",
                "description": "Fetch a complete patient clinical record from a FHIR R4 server. Retrieves Patient demographics, active Conditions, current MedicationRequests, and recent Observations using FHIR search operations.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "fhir_server_url": {"type": "string", "description": "Base URL of the FHIR R4 server (e.g. https://hapi.fhir.org/baseR4)"},
                        "patient_id": {"type": "string", "description": "FHIR Patient resource ID"},
                    },
                    "required": ["fhir_server_url", "patient_id"],
                },
            },
            {
                "name": "search_fhir_resources",
                "description": "Search FHIR resources by type and search parameters. Executes a FHIR search operation using standard SearchParameters.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "fhir_server_url": {"type": "string", "description": "Base URL of the FHIR R4 server"},
                        "resource_type": {"type": "string", "description": "FHIR resource type (Patient, Condition, Observation, etc.)"},
                        "search_params": {"type": "object", "description": "Dict of FHIR search parameter name→value pairs"},
                    },
                    "required": ["fhir_server_url", "resource_type", "search_params"],
                },
            },
            {
                "name": "get_structure_definition",
                "description": "Retrieve the FHIR R4 StructureDefinition for a resource type. Provides schema grounding for accurate FHIR resource construction.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "resource_type": {"type": "string", "description": "FHIR resource type name (e.g. Condition, MedicationRequest)"},
                    },
                    "required": ["resource_type"],
                },
            },
        ],
        "fhir_base": "https://hapi.fhir.org/baseR4",
        "capabilities": ["fhir_search", "fhir_read", "icd10_lookup", "fhir_validation", "coverage_criteria"],
    })


async def _oauth_protected_resource(request: Request):
    """RFC 9728 OAuth 2.0 Protected Resource Metadata.

    Claude.ai probes this endpoint to discover auth requirements before
    connecting. Returning an empty authorization_servers list signals that
    this MCP server requires no authentication.
    """
    base = "https://healthprior.volskyi-dmytro.com"
    return JSONResponse({
        "resource": f"{base}/mcp/mcp/",
        "authorization_servers": [],
        "scopes_supported": [],
        "bearer_methods_supported": [],
    })


# Inject extra routes before FastMCP's catch-all /mcp route.
app.routes.insert(0, Route("/health", _health, methods=["GET", "HEAD"]))
app.routes.insert(1, Route("/.well-known/mcp.json", _mcp_discovery, methods=["GET"]))
app.routes.insert(2, Route("/.well-known/oauth-protected-resource", _oauth_protected_resource, methods=["GET"]))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
