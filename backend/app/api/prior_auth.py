from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional
from datetime import datetime
import json

from app.db.database import get_db
from app.models.schemas import PriorAuthRequest, PriorAuthPackage, SubmissionHistory
from app.services.prior_auth_service import PriorAuthService
from app.services.audit_service import log_llm_call
from app.core.config import settings

router = APIRouter(prefix="/prior-auth", tags=["prior-auth"])


class PaginatedHistory:
    pass  # Defined inline as dict in response for simplicity


@router.post("/generate", response_model=PriorAuthPackage)
async def generate_prior_auth(request: PriorAuthRequest, db: AsyncSession = Depends(get_db)):
    """
    Generate complete prior authorization package.
    Stores submission in database for history.
    """
    service = PriorAuthService()

    try:
        package = service.generate(
            fhir_bundle=request.fhir_bundle,
            coverage_result=request.coverage_result,
            raw_note=request.raw_note,
            patient_id=request.patient_id,
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Prior auth generation failed: {str(e)}")

    # Store in database
    try:
        await db.execute(
            text("""
                INSERT INTO prior_auth_submissions
                (id, raw_note, fhir_bundle, coverage_result, prior_auth_package, decision)
                VALUES (:id, :raw_note, :fhir_bundle::jsonb, :coverage_result::jsonb, :prior_auth_package::jsonb, :decision)
            """),
            {
                "id": package.submission_id,
                "raw_note": request.raw_note,
                "fhir_bundle": json.dumps(request.fhir_bundle.model_dump()),
                "coverage_result": json.dumps(request.coverage_result.model_dump()),
                "prior_auth_package": json.dumps(package.model_dump()),
                "decision": package.coverage_decision,
            },
        )
        await db.commit()
    except Exception:
        await db.rollback()
        # Non-fatal — still return the package

    # Audit log for prior_auth_generated
    await log_llm_call(
        db=db,
        event_type="prior_auth_generated",
        submission_id=package.submission_id,
    )

    return package


@router.get("/history")
async def list_submissions(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    decision: Optional[str] = Query(None, description="Filter by decision: APPROVED, DENIED, NEEDS_MORE_INFO"),
    from_date: Optional[str] = Query(None, alias="from", description="ISO date string, e.g. 2025-01-01"),
):
    """
    List prior auth submissions with pagination and optional filters.

    Response: {"total": N, "page": 1, "items": [...]}
    """
    filters = []
    params: dict = {"limit": limit, "offset": (page - 1) * limit}

    if decision:
        filters.append("decision = :decision")
        params["decision"] = decision

    if from_date:
        try:
            datetime.fromisoformat(from_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid 'from' date format. Use ISO 8601 (e.g. 2025-01-01).")
        filters.append("created_at >= :from_date")
        params["from_date"] = from_date

    where_clause = ("WHERE " + " AND ".join(filters)) if filters else ""

    count_result = await db.execute(
        text(f"SELECT COUNT(*) FROM prior_auth_submissions {where_clause}"),
        params,
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        text(f"""
            SELECT id, created_at, decision, LEFT(raw_note, 200) as raw_note_preview
            FROM prior_auth_submissions
            {where_clause}
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """),
        params,
    )
    rows = result.fetchall()
    items = [
        SubmissionHistory(
            id=str(row.id),
            created_at=row.created_at,
            decision=row.decision,
            raw_note_preview=row.raw_note_preview,
        )
        for row in rows
    ]

    return {"total": total, "page": page, "items": [i.model_dump() for i in items]}


@router.get("/{submission_id}/audit")
async def get_submission_audit(submission_id: str, db: AsyncSession = Depends(get_db)):
    """Return all audit log entries for a given submission."""
    result = await db.execute(
        text("""
            SELECT id, submission_id, event_type, model_used,
                   prompt_tokens, completion_tokens, latency_ms,
                   mcp_tools_called, created_at
            FROM audit_log
            WHERE submission_id = :submission_id
            ORDER BY created_at ASC
        """),
        {"submission_id": submission_id},
    )
    rows = result.fetchall()
    return [
        {
            "id": str(row.id),
            "submission_id": str(row.submission_id),
            "event_type": row.event_type,
            "model_used": row.model_used,
            "prompt_tokens": row.prompt_tokens,
            "completion_tokens": row.completion_tokens,
            "latency_ms": row.latency_ms,
            "mcp_tools_called": row.mcp_tools_called,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]


@router.get("/{submission_id}/pdf")
async def download_prior_auth_pdf(submission_id: str, db: AsyncSession = Depends(get_db)):
    """
    Generate and return a PDF prior authorization letter for a submission.

    Requires ENABLE_PDF_EXPORT=true (default).
    """
    if not settings.ENABLE_PDF_EXPORT:
        raise HTTPException(status_code=403, detail="PDF export is disabled.")

    result = await db.execute(
        text("SELECT prior_auth_package FROM prior_auth_submissions WHERE id = :id"),
        {"id": submission_id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Submission {submission_id} not found")

    prior_auth = row.prior_auth_package
    if not prior_auth:
        raise HTTPException(status_code=422, detail="No prior auth package on this submission yet.")

    try:
        from app.services.pdf_service import generate_prior_auth_pdf
        pdf_bytes = generate_prior_auth_pdf(prior_auth)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="prior_auth_{submission_id[:8]}.pdf"',
        },
    )
