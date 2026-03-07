import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, func
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
