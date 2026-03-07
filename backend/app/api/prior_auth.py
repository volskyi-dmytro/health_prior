from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import json

from app.db.database import get_db
from app.models.schemas import PriorAuthRequest, PriorAuthPackage, SubmissionHistory
from app.services.prior_auth_service import PriorAuthService

router = APIRouter(prefix="/prior-auth", tags=["prior-auth"])


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
        pass

    return package


@router.get("/history", response_model=list[SubmissionHistory])
async def list_submissions(db: AsyncSession = Depends(get_db), limit: int = 20):
    """List recent prior auth submissions."""
    result = await db.execute(
        text("""
            SELECT id, created_at, decision, LEFT(raw_note, 200) as raw_note_preview
            FROM prior_auth_submissions
            ORDER BY created_at DESC
            LIMIT :limit
        """),
        {"limit": limit},
    )
    rows = result.fetchall()
    return [
        SubmissionHistory(
            id=str(row.id),
            created_at=row.created_at,
            decision=row.decision,
            raw_note_preview=row.raw_note_preview,
        )
        for row in rows
    ]
