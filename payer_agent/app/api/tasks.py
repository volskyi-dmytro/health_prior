"""A2A task endpoints: send, poll, subscribe, and continue."""
from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncGenerator

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse

from app.models.a2a import (
    DataPart,
    Message,
    SendTaskRequest,
    SendTaskResponse,
    Task,
    TaskContinueRequest,
    TaskState,
    TaskStatus,
    TaskStatusUpdateEvent,
    TextPart,
)
from app.services import evaluation_service
from app.services.llm_service import LLMService
from app.store.task_store import task_store

logger = logging.getLogger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _make_status(state: TaskState, message: Message | None = None) -> TaskStatus:
    return TaskStatus(state=state, message=message, timestamp=_now())


def _extract_fhir_and_policy(message: Message) -> tuple[dict[str, Any], str]:
    """Pull the FHIR bundle dict and optional policy_id out of a Message."""
    fhir_bundle: dict[str, Any] = {}
    policy_id = "MCR-621"
    for part in message.parts:
        if isinstance(part, DataPart):
            fhir_bundle = part.data.get("fhir_bundle", part.data)
            policy_id = part.data.get("policy_id", policy_id)
            break
    return fhir_bundle, policy_id


# ---------------------------------------------------------------------------
# Core evaluation coroutine — updates store at every state transition
# ---------------------------------------------------------------------------

async def _run_evaluation(
    task_id: str,
    fhir_bundle: dict[str, Any],
    policy_id: str,
    *,
    sse_queue: asyncio.Queue | None = None,
) -> None:
    """Drive the evaluation state machine for a task.

    Transitions: submitted -> working -> completed | input-required | failed
    Each state change is persisted to the task store immediately.
    If `sse_queue` is provided, TaskStatusUpdateEvent objects are pushed there
    for the sendSubscribe endpoint to forward as SSE frames.
    """
    llm_service = LLMService()

    async def _set_status(status: TaskStatus, final: bool = False) -> None:
        task = await task_store.get(task_id)
        if task is None:
            return
        task.status = status
        await task_store.update(task)
        if sse_queue is not None:
            event = TaskStatusUpdateEvent(id=task_id, status=status, final=final)
            await sse_queue.put(event)

    # Transition: working
    await _set_status(_make_status("working"))

    try:
        task = await task_store.get(task_id)
        history: list[Message] = task.history if task else []

        result = await evaluation_service.evaluate(
            fhir_bundle=fhir_bundle,
            policy_id=policy_id,
            history=history,
            llm_service=llm_service,
        )

        decision = result.get("decision")

        if decision in ("APPROVED", "DENIED"):
            # Attach the full result as a DataPart artifact message
            result_message = Message(
                role="agent",
                parts=[DataPart(data=result)],
            )
            status = _make_status("completed", result_message)
            # Record in history
            task = await task_store.get(task_id)
            if task:
                task.history.append(result_message)
                task.artifacts.append(result)
                await task_store.update(task)
            await _set_status(status, final=True)

        elif decision == "NEEDS_MORE_INFO":
            question = result.get("question", "Please provide additional clinical information.")
            criterion = result.get("criterion_at_stake", "")
            question_text = question
            if criterion:
                question_text = f"{question}\n\n(Criterion at stake: {criterion})"

            question_message = Message(
                role="agent",
                parts=[TextPart(text=question_text)],
            )
            status = _make_status("input-required", question_message)
            task = await task_store.get(task_id)
            if task:
                task.history.append(question_message)
                await task_store.update(task)
            await _set_status(status, final=False)

        else:
            # Unexpected decision value — treat as failure
            error_message = Message(
                role="agent",
                parts=[TextPart(text=f"Unexpected decision value: {decision!r}")],
            )
            await _set_status(_make_status("failed", error_message), final=True)

    except Exception as exc:  # noqa: BLE001
        logger.exception("Evaluation failed for task %s", task_id)
        error_message = Message(
            role="agent",
            parts=[TextPart(text=f"Evaluation error: {exc}")],
        )
        await _set_status(_make_status("failed", error_message), final=True)


# ---------------------------------------------------------------------------
# POST /tasks/send — fire-and-forget, 202 response
# ---------------------------------------------------------------------------

@router.post("/send", response_model=SendTaskResponse, status_code=202)
async def send_task(
    req: SendTaskRequest,
    background_tasks: BackgroundTasks,
) -> SendTaskResponse:
    task_id = req.id or str(uuid.uuid4())
    initial_status = _make_status("submitted")
    task = Task(
        id=task_id,
        session_id=req.session_id,
        status=initial_status,
        history=[req.message],
        metadata=req.metadata,
    )
    await task_store.create(task)

    fhir_bundle, policy_id = _extract_fhir_and_policy(req.message)
    background_tasks.add_task(_run_evaluation, task_id, fhir_bundle, policy_id)

    return SendTaskResponse(id=task_id, status=initial_status)


# ---------------------------------------------------------------------------
# GET /tasks/{task_id} — poll status
# ---------------------------------------------------------------------------

@router.get("/{task_id}", response_model=Task)
async def get_task(task_id: str) -> Task:
    task = await task_store.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task {task_id!r} not found")
    return task


# ---------------------------------------------------------------------------
# POST /tasks/sendSubscribe — SSE stream
# ---------------------------------------------------------------------------

async def _sse_generator(
    task_id: str,
    fhir_bundle: dict[str, Any],
    policy_id: str,
    queue: asyncio.Queue,
) -> AsyncGenerator[str, None]:
    """Run evaluation and stream SSE events from the queue."""
    # Run evaluation as a concurrent task feeding the queue
    eval_task = asyncio.create_task(
        _run_evaluation(task_id, fhir_bundle, policy_id, sse_queue=queue)
    )

    try:
        while True:
            event: TaskStatusUpdateEvent = await asyncio.wait_for(queue.get(), timeout=120.0)
            payload = json.dumps(event.model_dump(mode="json"))
            yield f"data: {payload}\n\n"
            if event.final:
                break
    except asyncio.TimeoutError:
        # Evaluation took too long — send a failed event
        task = await task_store.get(task_id)
        if task and task.status.state not in ("completed", "failed", "canceled"):
            timeout_status = _make_status("failed", Message(role="agent", parts=[TextPart(text="Evaluation timed out")]))
            timeout_event = TaskStatusUpdateEvent(id=task_id, status=timeout_status, final=True)
            yield f"data: {json.dumps(timeout_event.model_dump(mode='json'))}\n\n"
    finally:
        if not eval_task.done():
            eval_task.cancel()


@router.post("/sendSubscribe")
async def send_subscribe(req: SendTaskRequest) -> StreamingResponse:
    task_id = req.id or str(uuid.uuid4())
    initial_status = _make_status("submitted")
    task = Task(
        id=task_id,
        session_id=req.session_id,
        status=initial_status,
        history=[req.message],
        metadata=req.metadata,
    )
    await task_store.create(task)

    # Yield the initial submitted event immediately
    initial_event = TaskStatusUpdateEvent(id=task_id, status=initial_status, final=False)
    initial_payload = json.dumps(initial_event.model_dump(mode="json"))

    fhir_bundle, policy_id = _extract_fhir_and_policy(req.message)
    queue: asyncio.Queue = asyncio.Queue()

    async def combined() -> AsyncGenerator[str, None]:
        yield f"data: {initial_payload}\n\n"
        async for chunk in _sse_generator(task_id, fhir_bundle, policy_id, queue):
            yield chunk

    return StreamingResponse(combined(), media_type="text/event-stream")


# ---------------------------------------------------------------------------
# POST /tasks/{task_id}/send — continue after input-required
# ---------------------------------------------------------------------------

@router.post("/{task_id}/send", response_model=SendTaskResponse, status_code=202)
async def continue_task(
    task_id: str,
    req: TaskContinueRequest,
    background_tasks: BackgroundTasks,
) -> SendTaskResponse:
    task = await task_store.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task {task_id!r} not found")

    if task.status.state != "input-required":
        raise HTTPException(
            status_code=409,
            detail=f"Task is in state {task.status.state!r}, expected 'input-required'",
        )

    # Append the user's reply to history
    task.history.append(req.message)
    await task_store.update(task)

    # Determine fhir_bundle and policy_id from the original user message in history
    fhir_bundle: dict[str, Any] = {}
    policy_id = "MCR-621"
    for msg in task.history:
        if msg.role == "user":
            fhir_bundle, policy_id = _extract_fhir_and_policy(msg)
            if fhir_bundle:
                break

    background_tasks.add_task(_run_evaluation, task_id, fhir_bundle, policy_id)

    status = _make_status("submitted")
    return SendTaskResponse(id=task_id, status=status)
