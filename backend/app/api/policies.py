from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Any, Optional
from datetime import datetime
import json

from app.db.database import get_db

router = APIRouter(prefix="/policies", tags=["policies"])


class PolicyResponse(BaseModel):
    id: str
    payer: str
    procedure_name: str
    cpt_code: str
    criteria: dict
    created_at: datetime


class PolicyCreate(BaseModel):
    id: str
    payer: str
    procedure_name: str
    cpt_code: str
    criteria: dict


@router.get("", response_model=list[PolicyResponse])
async def list_policies(db: AsyncSession = Depends(get_db)):
    """List all available coverage policies."""
    result = await db.execute(
        text("SELECT id, payer, procedure_name, cpt_code, criteria, created_at FROM policies ORDER BY created_at DESC")
    )
    rows = result.fetchall()
    return [
        PolicyResponse(
            id=row.id,
            payer=row.payer,
            procedure_name=row.procedure_name,
            cpt_code=row.cpt_code,
            criteria=row.criteria,
            created_at=row.created_at,
        )
        for row in rows
    ]


@router.post("", response_model=PolicyResponse, status_code=201)
async def create_policy(policy: PolicyCreate, db: AsyncSession = Depends(get_db)):
    """Create a new coverage policy."""
    # Check for duplicate
    existing = await db.execute(
        text("SELECT id FROM policies WHERE id = :id"),
        {"id": policy.id},
    )
    if existing.fetchone():
        raise HTTPException(status_code=409, detail=f"Policy {policy.id} already exists")

    await db.execute(
        text("""
            INSERT INTO policies (id, payer, procedure_name, cpt_code, criteria)
            VALUES (:id, :payer, :procedure_name, :cpt_code, :criteria::jsonb)
        """),
        {
            "id": policy.id,
            "payer": policy.payer,
            "procedure_name": policy.procedure_name,
            "cpt_code": policy.cpt_code,
            "criteria": json.dumps(policy.criteria),
        },
    )
    await db.commit()

    result = await db.execute(
        text("SELECT id, payer, procedure_name, cpt_code, criteria, created_at FROM policies WHERE id = :id"),
        {"id": policy.id},
    )
    row = result.fetchone()
    return PolicyResponse(
        id=row.id,
        payer=row.payer,
        procedure_name=row.procedure_name,
        cpt_code=row.cpt_code,
        criteria=row.criteria,
        created_at=row.created_at,
    )


@router.get("/{policy_id}", response_model=PolicyResponse)
async def get_policy(policy_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve a single policy by ID."""
    result = await db.execute(
        text("SELECT id, payer, procedure_name, cpt_code, criteria, created_at FROM policies WHERE id = :id"),
        {"id": policy_id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Policy {policy_id} not found")
    return PolicyResponse(
        id=row.id,
        payer=row.payer,
        procedure_name=row.procedure_name,
        cpt_code=row.cpt_code,
        criteria=row.criteria,
        created_at=row.created_at,
    )
