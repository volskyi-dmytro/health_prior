from app.services.llm_service import LLMService, LLMCallResult
from app.data.policy_loader import load_policy
from app.models.schemas import FHIRBundle, CoverageResult


class CoverageService:
    def __init__(self, llm_service: LLMService):
        self.llm = llm_service
        self._policies: dict[str, dict] = {}

    def get_policy(self, policy_id: str) -> dict:
        if policy_id not in self._policies:
            self._policies[policy_id] = load_policy(policy_id)
        return self._policies[policy_id]

    async def evaluate(self, fhir_bundle: FHIRBundle, policy_id: str = "MCR-621") -> CoverageResult:
        """Evaluate FHIR bundle against policy criteria using LLM."""
        result, _meta = await self.evaluate_with_meta(fhir_bundle, policy_id)
        return result

    async def evaluate_with_meta(
        self, fhir_bundle: FHIRBundle, policy_id: str = "MCR-621"
    ) -> tuple[CoverageResult, LLMCallResult | None]:
        """Like evaluate() but also returns the LLMCallResult for audit logging."""
        policy = self.get_policy(policy_id)
        bundle_dict = fhir_bundle.model_dump()

        try:
            result_dict, meta = await self.llm.evaluate_coverage_with_meta(bundle_dict, policy)
        except Exception:
            # Fallback: call without metadata
            result_dict = await self.llm.evaluate_coverage(bundle_dict, policy)
            meta = None

        coverage_result = CoverageResult(
            decision=result_dict.get("decision", "NEEDS_MORE_INFO"),
            matched_criteria=result_dict.get("matched_criteria", []),
            unmet_criteria=result_dict.get("unmet_criteria", []),
            justification=result_dict.get("justification", ""),
            confidence_score=float(result_dict.get("confidence_score", 0.5)),
            policy_id=policy_id,
        )
        return coverage_result, meta
