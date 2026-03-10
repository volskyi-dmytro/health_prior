import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Integer, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base


class PriorAuthSubmission(Base):
    __tablename__ = "prior_auth_submissions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    raw_note: Mapped[str] = mapped_column(Text, nullable=False)
    fhir_bundle: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    coverage_result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    prior_auth_package: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    decision: Mapped[str | None] = mapped_column(String(20), nullable=True)


class Policy(Base):
    __tablename__ = "policies"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    payer: Mapped[str] = mapped_column(String(100), nullable=False)
    procedure_name: Mapped[str] = mapped_column(String(200), nullable=False)
    cpt_code: Mapped[str] = mapped_column(String(20), nullable=False)
    criteria: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AllowedUser(Base):
    """GitHub users granted AI feature access by the admin."""
    __tablename__ = "allowed_users"

    github_login: Mapped[str] = mapped_column(String(100), primary_key=True)
    approved_by: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("prior_auth_submissions.id", ondelete="SET NULL"),
        nullable=True,
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    model_used: Mapped[str | None] = mapped_column(String(100), nullable=True)
    prompt_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completion_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mcp_tools_called: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # session_id tracks the frontend wizard session; no FK so it can be written before
    # a prior_auth_submission row exists.  prior_auth/generate backfills submission_id
    # by matching this column once the submission is stored.
    session_id: Mapped[str | None] = mapped_column(Text, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
