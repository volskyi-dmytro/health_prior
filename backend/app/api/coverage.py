from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.schemas import CoverageEvaluationRequest, CoverageResult
from app.services.llm_service import LLMService
from app.services.coverage_service import CoverageService
from app.services.audit_service import log_llm_call

router = APIRouter(prefix="/coverage", tags=["coverage"])


@router.post("/evaluate", response_model=CoverageResult)
async def evaluate_coverage(
    request: CoverageEvaluationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Evaluate FHIR bundle against Molina MCR-621 coverage criteria.
    Returns coverage decision with matched/unmet criteria and justification.
    Logs the LLM call in audit_log.
    """
    llm = LLMService()
    service = CoverageService(llm)

    try:
        result, meta = await service.evaluate_with_meta(request.fhir_bundle, request.policy_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Coverage evaluation failed: {str(e)}")

    # Audit log (non-fatal)
    await log_llm_call(
        db=db,
        event_type="coverage_evaluated",
        model_used=llm.model,
        prompt_tokens=meta.prompt_tokens if meta else None,
        completion_tokens=meta.completion_tokens if meta else None,
        latency_ms=meta.latency_ms if meta else None,
        mcp_tools_called=["get_coverage_criteria"],
        submission_id=request.session_id,
    )

    return result
