from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from app.db.database import get_db
from app.models.schemas import CoverageEvaluationRequest
from app.models.a2a import Task
from app.services.a2a_client import A2AClient
from app.services.audit_service import log_llm_call

router = APIRouter(prefix="/coverage", tags=["coverage"])


class TaskReplyRequest(BaseModel):
    answer: str


@router.post("/evaluate", status_code=202)
async def evaluate_coverage(
    request: CoverageEvaluationRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Submit FHIR bundle to the Payer Agent for coverage evaluation via A2A protocol.
    Returns task_id and initial state immediately (HTTP 202). Poll
    GET /coverage/tasks/{task_id} for results.
    """
    client = A2AClient()

    fhir_bundle_dict = request.fhir_bundle.model_dump(mode="json")

    response = await client.send_task(
        fhir_bundle=fhir_bundle_dict,
        policy_id=request.policy_id,
        session_id=request.session_id,
    )

    # Audit log — record the A2A task_id in mcp_tools_called since there are
    # no LLM tokens to record (the actual inference is inside the payer agent).
    await log_llm_call(
        db=db,
        event_type="coverage_evaluated",
        model_used=None,
        prompt_tokens=None,
        completion_tokens=None,
        latency_ms=None,
        mcp_tools_called=[f"a2a:task:{response.id}"],
        submission_id=request.session_id,
    )

    return {"task_id": response.id, "state": response.status.state}


@router.get("/tasks/{task_id}", response_model=Task)
async def get_coverage_task(task_id: str) -> Task:
    """
    Poll the Payer Agent for the current state of a coverage evaluation task.
    Returns 404 if the task does not exist on the payer agent.
    """
    client = A2AClient()
    return await client.get_task(task_id)


@router.post("/tasks/{task_id}/reply", response_model=Task)
async def reply_to_coverage_task(
    task_id: str,
    body: TaskReplyRequest,
) -> Task:
    """
    Submit a user answer to a paused (input-required) coverage evaluation task.
    Returns the updated Task from the Payer Agent.
    """
    client = A2AClient()
    return await client.reply_to_task(task_id, body.answer)
