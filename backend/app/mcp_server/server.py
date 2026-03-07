"""
HealthPrior Clinical MCP Server
Real HTTP MCP server using fastmcp — invoked by the backend LLM workflow.
"""
import json
import uvicorn
from fastmcp import FastMCP
from app.data.molina_mcr621_criteria import MOLINA_MCR621

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


@mcp.tool()
async def get_coverage_criteria(policy_id: str) -> dict:
    """Retrieve clinical coverage criteria for a given payer policy ID.

    Returns structured decision criteria from Molina MCR-621 for Lumbar Spine MRI.

    Args:
        policy_id: Policy identifier (e.g., 'MCR-621')
    """
    policies = {"MCR-621": MOLINA_MCR621}
    if policy_id not in policies:
        return {"error": f"Policy {policy_id} not found", "available": list(policies.keys())}
    return policies[policy_id]


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
    return {"status": "ok", "service": "healthprior-mcp", "tools": 5}


# HTTP health endpoint (non-MCP) for Docker health checks
app = mcp.http_app()

@app.get("/health")
async def health():
    return {"status": "ok", "service": "healthprior-mcp"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
