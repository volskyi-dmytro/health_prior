from app.services.llm_service import LLMService
from app.data.molina_mcr621_criteria import MOLINA_MCR621
from app.models.schemas import FHIRBundle, CoverageResult


class CoverageService:
    def __init__(self, llm_service: LLMService):
        self.llm = llm_service
        self._policies = {"MCR-621": MOLINA_MCR621}

    def get_policy(self, policy_id: str) -> dict:
        if policy_id not in self._policies:
            raise ValueError(f"Unknown policy: {policy_id}")
        return self._policies[policy_id]

    async def evaluate(self, fhir_bundle: FHIRBundle, policy_id: str = "MCR-621") -> CoverageResult:
        """Evaluate FHIR bundle against policy criteria using LLM."""
        policy = self.get_policy(policy_id)
        bundle_dict = fhir_bundle.model_dump()

        result_dict = await self.llm.evaluate_coverage(bundle_dict, policy)

        return CoverageResult(
            decision=result_dict.get("decision", "NEEDS_MORE_INFO"),
            matched_criteria=result_dict.get("matched_criteria", []),
            unmet_criteria=result_dict.get("unmet_criteria", []),
            justification=result_dict.get("justification", ""),
            confidence_score=float(result_dict.get("confidence_score", 0.5)),
            policy_id=policy_id,
        )
