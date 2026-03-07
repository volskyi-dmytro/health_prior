import asyncio
import httpx
import json
from typing import Any
from app.core.config import settings

OPENROUTER_BASE = "https://openrouter.ai/api/v1"

FHIR_EXTRACTION_SYSTEM = """You are a clinical informatics specialist. Extract structured FHIR-like resources from a clinical note.

Return a JSON object with this exact structure:
{
  "patient_demographics": {
    "id": "patient_id_from_note",
    "name": "patient name or initials",
    "dob": "DOB if present",
    "mrn": "MRN if present",
    "gender": "male|female|unknown"
  },
  "entry": [
    {
      "resourceType": "Condition",
      "id": "cond_001",
      "code": {"text": "condition name", "coding": [{"system": "ICD-10", "code": "M54.5"}]},
      "clinicalStatus": "active",
      "evidence": [{"detail": [{"display": "brief supporting evidence from note"}]}],
      "_sourceRef": "EXACT section name from note where this was found, e.g. 'ASSESSMENT & PLAN'"
    },
    {
      "resourceType": "MedicationRequest",
      "id": "med_001",
      "medication": {"text": "drug name and dose"},
      "status": "active",
      "dosageInstruction": [{"text": "dosing instructions"}],
      "_sourceRef": "MEDICATIONS section"
    },
    {
      "resourceType": "Observation",
      "id": "obs_001",
      "code": {"text": "finding name", "coding": [{"system": "SNOMED", "code": ""}]},
      "valueString": "finding value or description",
      "status": "final",
      "_sourceRef": "PHYSICAL EXAMINATION section"
    }
  ]
}

Rules:
- Extract ALL conditions, medications, and relevant physical exam observations
- Each resource MUST have a _sourceRef field citing the exact section of the note
- Use real ICD-10 codes where known
- For Observations, capture: SLR result, reflexes, motor strength, sensory findings, vital signs
- Return ONLY valid JSON, no markdown, no explanations"""

COVERAGE_EVALUATION_SYSTEM = """You are a prior authorization clinical reviewer. Compare patient FHIR clinical data against Molina Healthcare MCR-621 coverage criteria for Lumbar Spine MRI.

You will receive:
1. A FHIR bundle of patient clinical data
2. The Molina MCR-621 coverage criteria

Analyze each criterion and determine if the patient's clinical data supports it.

Return a JSON object:
{
  "decision": "APPROVED" | "DENIED" | "NEEDS_MORE_INFO",
  "matched_criteria": ["list of criterion IDs that are met"],
  "unmet_criteria": ["list of criterion IDs checked but not met"],
  "justification": "A 2-3 paragraph clinical justification referencing specific findings from the note. Be specific about which findings support or contradict approval.",
  "confidence_score": 0.0-1.0
}

Decision rules:
- APPROVED: Patient meets at least ONE coverage criterion
- DENIED: Patient meets NO coverage criteria AND has exclusion criteria (acute uncomplicated pain without neurological findings, no conservative therapy trial)
- NEEDS_MORE_INFO: Unclear clinical picture, missing key information

Return ONLY valid JSON."""


class LLMService:
    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.api_key = api_key or settings.OPENROUTER_API_KEY
        self.model = model or settings.DEFAULT_MODEL

    async def complete(self, system: str, user: str, retries: int = 3) -> str:
        """Call OpenRouter LLM with retry on rate limit."""
        for attempt in range(retries):
            try:
                async with httpx.AsyncClient(timeout=90.0) as client:
                    response = await client.post(
                        f"{OPENROUTER_BASE}/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "HTTP-Referer": "https://healthprior.volskyi-dmytro.com",
                            "X-Title": "HealthPrior",
                        },
                        json={
                            "model": self.model,
                            "messages": [
                                {"role": "system", "content": system},
                                {"role": "user", "content": user},
                            ],
                            "temperature": 0.1,
                            "max_tokens": 4096,
                        },
                    )
                    response.raise_for_status()
                    return response.json()["choices"][0]["message"]["content"]
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429 and attempt < retries - 1:
                    wait = 2 ** attempt
                    await asyncio.sleep(wait)
                    continue
                raise

        raise RuntimeError("LLM service failed after retries")

    async def structure_note(self, raw_note: str, mcp_context: dict | None = None) -> dict:
        """Structure a clinical note into FHIR resources.

        Calls MCP server for guideline context before prompting LLM.
        Returns FHIRBundle-compatible dict.
        """
        # Get MCP context to enrich the prompt
        context_str = ""
        if mcp_context:
            context_str = f"\n\nCoverage criteria context from MCP server:\n{json.dumps(mcp_context, indent=2)}"

        user_prompt = f"""Extract FHIR resources from this clinical note:{context_str}

CLINICAL NOTE:
{raw_note}"""

        result_str = await self.complete(FHIR_EXTRACTION_SYSTEM, user_prompt)

        # Clean JSON from markdown fences if present
        result_str = result_str.strip()
        if result_str.startswith("```"):
            result_str = result_str.split("```")[1]
            if result_str.startswith("json"):
                result_str = result_str[4:]
        result_str = result_str.strip()

        return json.loads(result_str)

    async def evaluate_coverage(self, fhir_bundle: dict, policy_criteria: dict) -> dict:
        """Compare FHIR patient data against coverage criteria.

        Returns coverage decision dict.
        """
        user_prompt = f"""Patient FHIR Bundle:
{json.dumps(fhir_bundle, indent=2)}

Molina MCR-621 Coverage Criteria:
{json.dumps(policy_criteria, indent=2)}

Evaluate coverage and return JSON decision."""

        result_str = await self.complete(COVERAGE_EVALUATION_SYSTEM, user_prompt)

        result_str = result_str.strip()
        if result_str.startswith("```"):
            result_str = result_str.split("```")[1]
            if result_str.startswith("json"):
                result_str = result_str[4:]
        result_str = result_str.strip()

        return json.loads(result_str)
