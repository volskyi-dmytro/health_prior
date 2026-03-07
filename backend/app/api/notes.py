from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.models.schemas import NoteStructureRequest, NoteStructureResponse, SampleNote
from app.services.llm_service import LLMService
from app.services.fhir_service import FHIRService
from app.services.mcp_client import MCPClient
from app.data.sample_notes import get_sample_notes, get_sample_note_by_id
from app.core.config import settings

router = APIRouter(prefix="/notes", tags=["notes"])


def get_services():
    llm = LLMService()
    mcp = MCPClient()
    fhir = FHIRService(llm)
    return llm, mcp, fhir


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


@router.post("/structure", response_model=NoteStructureResponse)
async def structure_note(request: NoteStructureRequest, db: AsyncSession = Depends(get_db)):
    """
    Structure a raw clinical note into FHIR resources.

    This endpoint:
    1. Calls the MCP server to retrieve coverage criteria context
    2. Passes context + note to LLM for FHIR extraction
    3. Returns structured FHIR bundle with source citations
    """
    llm = LLMService(model=request.model)
    mcp = MCPClient()
    fhir = FHIRService(llm)

    # Step 1: Get guideline context from MCP server (real MCP orchestration)
    mcp_context = await mcp.get_coverage_criteria("MCR-621")

    # Step 2: Structure the note using LLM + MCP context
    try:
        bundle = await fhir.structure_note(request.note, mcp_context)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to structure note: {str(e)}")

    return NoteStructureResponse(
        fhir_bundle=bundle,
        raw_note=request.note,
        model_used=request.model or settings.DEFAULT_MODEL,
    )
