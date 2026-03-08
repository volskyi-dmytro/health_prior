import asyncio
import json
from typing import Optional, AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.schemas import (
    NoteStructureRequest,
    NoteStructureResponse,
    FHIRBundle,
    SampleNote,
)
from app.services.llm_service import LLMService
from app.services.fhir_service import FHIRService
from app.services.fhir_validator import validate_fhir_bundle
from app.services.mcp_client import MCPClient
from app.services.audit_service import log_llm_call
from app.data.sample_notes import get_sample_notes, get_sample_note_by_id
from app.core.config import settings

router = APIRouter(prefix="/notes", tags=["notes"])


class NoteStructureRequestExtended(NoteStructureRequest):
    model_b: Optional[str] = None


class ModelComparisonResponse(BaseModel):
    model_a: NoteStructureResponse
    model_b: NoteStructureResponse


@router.get("/samples", response_model=list[SampleNote])
async def list_sample_notes():
    """Return pre-loaded synthetic clinical notes for demo."""
    return get_sample_notes()


@router.get("/samples/{note_id}", response_model=SampleNote)
async def get_sample_note(note_id: str):
    note = get_sample_note_by_id(note_id)
    if not note:
        raise HTTPException(status_code=404, detail=f"Sample note {note_id} not found")
    return note


async def _structure_with_model(
    raw_note: str,
    model: str,
    mcp_context: dict | None,
    db: AsyncSession,
    event_type: str = "note_structured",
) -> NoteStructureResponse:
    """Internal helper: structure a note with a given model, validate, and log."""
    llm = LLMService(model=model)
    fhir_svc = FHIRService(llm)

    # Use the retry-aware method on LLMService
    bundle_dict, meta = await llm.structure_note_retry(raw_note, mcp_context)
    bundle_dict = fhir_svc.ensure_ids(bundle_dict)
    bundle_dict.setdefault("resourceType", "Bundle")
    bundle_dict.setdefault("type", "collection")
    bundle_dict.setdefault("patient_demographics", {})
    fhir_bundle = FHIRBundle(**bundle_dict)

    # Audit log (non-fatal)
    await log_llm_call(
        db=db,
        event_type=event_type,
        model_used=model,
        prompt_tokens=meta.prompt_tokens,
        completion_tokens=meta.completion_tokens,
        latency_ms=meta.latency_ms,
        mcp_tools_called=["get_coverage_criteria"],
    )

    return NoteStructureResponse(
        fhir_bundle=fhir_bundle,
        raw_note=raw_note,
        model_used=model,
    )


@router.post("/structure", response_model=NoteStructureResponse)
async def structure_note(
    request: NoteStructureRequestExtended,
    db: AsyncSession = Depends(get_db),
):
    """
    Structure a raw clinical note into FHIR resources.

    - Calls MCP server for coverage criteria context
    - Passes context + note to LLM for FHIR extraction
    - Validates the bundle and retries once with a clarifying prompt if fields are missing
    - Logs the LLM call in audit_log
    - If model_b is provided, runs both models in parallel and returns a comparison response
    """
    mcp = MCPClient()
    mcp_context = await mcp.get_coverage_criteria("MCR-621")

    model_a_name = request.model or settings.DEFAULT_MODEL

    # Model comparison mode
    if request.model_b:
        try:
            result_a, result_b = await asyncio.gather(
                _structure_with_model(request.note, model_a_name, mcp_context, db, "note_structured_model_a"),
                _structure_with_model(request.note, request.model_b, mcp_context, db, "note_structured_model_b"),
            )
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Model comparison failed: {str(e)}")

        # Return both as a dict; the frontend can handle this extended shape
        return {
            "model_a": result_a.model_dump(),
            "model_b": result_b.model_dump(),
            # Also expose top-level fields matching NoteStructureResponse for backward compat
            "fhir_bundle": result_a.fhir_bundle.model_dump(),
            "raw_note": result_a.raw_note,
            "model_used": model_a_name,
        }

    try:
        return await _structure_with_model(request.note, model_a_name, mcp_context, db)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to structure note: {str(e)}")


async def _sse_note_stream(raw_note: str, model: str, mcp_context: dict | None) -> AsyncGenerator[str, None]:
    """
    Stream FHIR resource cards via SSE as the LLM produces them.

    We call the LLM once, then parse and emit each resource entry as
    a separate SSE event so the client can render cards progressively.
    """
    yield "event: start\ndata: {}\n\n"

    llm = LLMService(model=model)
    try:
        bundle_dict, _meta = await llm.structure_note_retry(raw_note, mcp_context)
    except Exception as e:
        yield f"event: error\ndata: {json.dumps({'detail': str(e)})}\n\n"
        return

    # Emit patient demographics
    demographics = bundle_dict.get("patient_demographics", {})
    if demographics:
        yield f"event: demographics\ndata: {json.dumps(demographics)}\n\n"

    # Emit each FHIR entry
    for entry in bundle_dict.get("entry", []):
        yield f"event: resource\ndata: {json.dumps(entry)}\n\n"
        await asyncio.sleep(0)  # yield control to event loop between emissions

    # Emit complete bundle as final event
    yield f"event: complete\ndata: {json.dumps(bundle_dict)}\n\n"


@router.post("/structure/stream")
async def structure_note_stream(
    request: NoteStructureRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Stream FHIR resource cards as Server-Sent Events (SSE).

    Events:
    - start: stream started
    - demographics: patient demographics object
    - resource: individual FHIR resource entry (one per event)
    - complete: full bundle dict
    - error: error detail on failure
    """
    mcp = MCPClient()
    mcp_context = await mcp.get_coverage_criteria("MCR-621")
    model = request.model or settings.DEFAULT_MODEL

    return StreamingResponse(
        _sse_note_stream(request.note, model, mcp_context),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
