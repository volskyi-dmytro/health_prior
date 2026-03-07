import uuid
from app.services.llm_service import LLMService
from app.models.schemas import FHIRBundle


class FHIRService:
    def __init__(self, llm_service: LLMService):
        self.llm = llm_service

    def ensure_ids(self, bundle_dict: dict) -> dict:
        """Ensure all resources have unique IDs."""
        for i, entry in enumerate(bundle_dict.get("entry", [])):
            if not entry.get("id"):
                entry["id"] = f"{entry.get('resourceType', 'resource').lower()}_{i}_{uuid.uuid4().hex[:8]}"
        return bundle_dict

    def validate_bundle(self, bundle_dict: dict) -> tuple[bool, list[str]]:
        """Basic validation that required fields are present."""
        errors = []
        required_by_type = {
            "Condition": ["resourceType", "code", "clinicalStatus"],
            "MedicationRequest": ["resourceType", "medication", "status"],
            "Observation": ["resourceType", "code", "valueString", "status"],
        }
        for entry in bundle_dict.get("entry", []):
            r_type = entry.get("resourceType", "Unknown")
            required = required_by_type.get(r_type, ["resourceType"])
            for field in required:
                if field not in entry:
                    errors.append(f"{r_type} (id={entry.get('id', '?')}) missing: {field}")
        return len(errors) == 0, errors

    async def structure_note(self, raw_note: str, mcp_context: dict | None = None) -> FHIRBundle:
        """Call LLM to structure note into FHIR bundle."""
        bundle_dict = await self.llm.structure_note(raw_note, mcp_context)
        bundle_dict = self.ensure_ids(bundle_dict)
        bundle_dict.setdefault("resourceType", "Bundle")
        bundle_dict.setdefault("type", "collection")
        bundle_dict.setdefault("patient_demographics", {})
        return FHIRBundle(**bundle_dict)
