import asyncio
import json
from typing import Optional, AsyncGenerator

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db, AsyncSessionLocal
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


class FHIRFetchRequest(BaseModel):
    fhir_server_url: str = "https://hapi.fhir.org/baseR4"
    patient_id: str
    policy_id: str = "MCR-621"
    session_id: str | None = None


class FHIRFetchResponse(BaseModel):
    fhir_bundle: dict
    patient_name: str
    source: str  # "fhir_server"
    fhir_server_url: str
    patient_id: str
    resource_counts: dict  # {"Condition": 3, "MedicationRequest": 2, ...}


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
    session_id: str | None = None,
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
        session_id=session_id,
    )

    return NoteStructureResponse(
        fhir_bundle=fhir_bundle,
        raw_note=raw_note,
        model_used=model,
    )


@router.post("/structure", response_model=None)
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
                _structure_with_model(request.note, model_a_name, mcp_context, db, "note_structured_model_a", request.session_id),
                _structure_with_model(request.note, request.model_b, mcp_context, db, "note_structured_model_b", request.session_id),
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
        return await _structure_with_model(request.note, model_a_name, mcp_context, db, session_id=request.session_id)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to structure note: {str(e)}")


async def _sse_note_stream(raw_note: str, model: str, mcp_context: dict | None, session_id: str | None = None) -> AsyncGenerator[str, None]:
    """
    Stream FHIR resource cards via SSE as the LLM produces them.

    We call the LLM once, then parse and emit each resource entry as
    a separate SSE event so the client can render cards progressively.
    """
    yield "event: start\ndata: {}\n\n"

    llm = LLMService(model=model)
    try:
        bundle_dict, meta = await llm.structure_note_retry(raw_note, mcp_context)
    except Exception as e:
        yield f"event: error\ndata: {json.dumps({'detail': str(e)})}\n\n"
        return

    # Audit log using a fresh session (SSE generator outlives the request session)
    async with AsyncSessionLocal() as db:
        await log_llm_call(
            db=db,
            event_type="note_structured",
            model_used=model,
            prompt_tokens=meta.prompt_tokens,
            completion_tokens=meta.completion_tokens,
            latency_ms=meta.latency_ms,
            mcp_tools_called=["get_coverage_criteria"],
            session_id=session_id,
        )

    # Emit patient demographics
    demographics = bundle_dict.get("patient_demographics", {})
    if demographics:
        yield f"event: demographics\ndata: {json.dumps(demographics)}\n\n"

    # Emit each FHIR entry
    for entry in bundle_dict.get("entry", []):
        yield f"event: resource\ndata: {json.dumps(entry)}\n\n"
        await asyncio.sleep(0)  # yield control to event loop between emissions

    # Emit complete bundle as final event (frontend listens for "complete")
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
        _sse_note_stream(request.note, model, mcp_context, request.session_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


def _extract_patient_name(bundle: dict) -> str:
    """Pull a human-readable name from the Patient resource in a FHIR Bundle."""
    for entry in bundle.get("entry", []):
        resource = entry.get("resource", entry)
        if resource.get("resourceType") == "Patient":
            names = resource.get("name", [])
            if names:
                name_obj = names[0]
                given = " ".join(name_obj.get("given", []))
                family = name_obj.get("family", "")
                full = f"{given} {family}".strip()
                if full:
                    return full
                if name_obj.get("text"):
                    return name_obj["text"]
    return "Unknown"


def _count_resources(bundle: dict) -> dict:
    """Return a dict of {resourceType: count} for all entries in the bundle."""
    counts: dict[str, int] = {}
    for entry in bundle.get("entry", []):
        resource = entry.get("resource", entry)
        rt = resource.get("resourceType")
        if rt:
            counts[rt] = counts.get(rt, 0) + 1
    return counts


_FHIR_HEADERS = {"Accept": "application/fhir+json", "Content-Type": "application/fhir+json"}


def _extract_bundle_entries(bundle: dict) -> list[dict]:
    """Return the resource objects from a FHIR searchset Bundle."""
    return [e.get("resource", e) for e in bundle.get("entry", [])]


@router.post("/fetch-fhir", response_model=FHIRFetchResponse)
async def fetch_fhir_patient(
    request: FHIRFetchRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch a live patient record from a FHIR R4 server directly via httpx.

    - Fetches Patient, Conditions, MedicationRequests, and Observations in parallel
    - Assembles a FHIR Bundle from the results
    - Writes an audit log entry for observability
    """
    base = request.fhir_server_url.rstrip("/")
    patient_id = request.patient_id

    async def _get(client: httpx.AsyncClient, url: str, params: dict | None = None) -> dict | None:
        try:
            resp = await client.get(url, params=params, headers=_FHIR_HEADERS)
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError:
            return None
        except Exception:
            return None

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            patient_data, conditions_data, medications_data, observations_data = await asyncio.gather(
                _get(client, f"{base}/Patient/{patient_id}"),
                _get(client, f"{base}/Condition", {"patient": patient_id, "clinical-status": "active"}),
                _get(client, f"{base}/MedicationRequest", {"patient": patient_id, "status": "active"}),
                _get(client, f"{base}/Observation", {"patient": patient_id, "_sort": "-date", "_count": "20"}),
            )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Connection error reaching FHIR server: {exc}")

    if patient_data is None:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found on FHIR server {request.fhir_server_url}")

    conditions = _extract_bundle_entries(conditions_data) if conditions_data else []
    medications = _extract_bundle_entries(medications_data) if medications_data else []
    observations = _extract_bundle_entries(observations_data) if observations_data else []

    fhir_bundle = {
        "resourceType": "Bundle",
        "type": "searchset",
        "entry": [
            {"resource": patient_data},
            *[{"resource": r} for r in conditions],
            *[{"resource": r} for r in medications],
            *[{"resource": r} for r in observations],
        ],
    }

    patient_name = _extract_patient_name(fhir_bundle)
    resource_counts = _count_resources(fhir_bundle)

    # Audit log — non-fatal
    await log_llm_call(
        db=db,
        event_type="fhir_fetch",
        model_used=None,
        prompt_tokens=None,
        completion_tokens=None,
        latency_ms=None,
        mcp_tools_called=["fetch_patient_record", request.fhir_server_url],
        session_id=request.session_id,
    )

    return FHIRFetchResponse(
        fhir_bundle=fhir_bundle,
        patient_name=patient_name,
        source="fhir_server",
        fhir_server_url=request.fhir_server_url,
        patient_id=request.patient_id,
        resource_counts=resource_counts,
    )
