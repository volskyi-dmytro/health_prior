from fastapi import APIRouter, HTTPException
from app.models.schemas import CoverageEvaluationRequest, CoverageResult
from app.services.llm_service import LLMService
from app.services.coverage_service import CoverageService

router = APIRouter(prefix="/coverage", tags=["coverage"])


@router.post("/evaluate", response_model=CoverageResult)
async def evaluate_coverage(request: CoverageEvaluationRequest):
    """
    Evaluate FHIR bundle against Molina MCR-621 coverage criteria.
    Returns coverage decision with matched/unmet criteria and justification.
    """
    llm = LLMService()
    service = CoverageService(llm)

    try:
        result = await service.evaluate(request.fhir_bundle, request.policy_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Coverage evaluation failed: {str(e)}")

    return result
