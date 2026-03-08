from pydantic import BaseModel, Field
from typing import Any, Optional
from datetime import datetime
import uuid

class NoteStructureRequest(BaseModel):
    note: str = Field(..., min_length=10, description="Raw clinical note text")
    model: Optional[str] = Field(None, description="Override default LLM model")

class FHIRCoding(BaseModel):
    system: str
    code: str

class FHIRCode(BaseModel):
    text: str
    coding: list[FHIRCoding] = []

# Note: FHIR resources use plain dicts in FHIRBundle.entry to allow _sourceRef keys.
# These typed helpers are for documentation only — not used at runtime.

class FHIRBundle(BaseModel):
    resourceType: str = "Bundle"
    type: str = "collection"
    entry: list[dict] = []
    patient_demographics: dict = {}

class NoteStructureResponse(BaseModel):
    fhir_bundle: FHIRBundle
    raw_note: str
    model_used: str

class CoverageEvaluationRequest(BaseModel):
    fhir_bundle: FHIRBundle
    raw_note: str
    policy_id: str = "MCR-621"

class CoverageResult(BaseModel):
    decision: str  # APPROVED, DENIED, NEEDS_MORE_INFO
    matched_criteria: list[str]
    unmet_criteria: list[str]
    justification: str
    confidence_score: float
    policy_id: str

class PriorAuthRequest(BaseModel):
    fhir_bundle: FHIRBundle
    coverage_result: CoverageResult
    raw_note: str
    patient_id: Optional[str] = None

class PriorAuthPackage(BaseModel):
    submission_id: str
    timestamp: str
    patient: dict
    requested_service: dict
    clinical_justification: str
    supporting_criteria: list[str]
    coverage_decision: str
    fhir_bundle: FHIRBundle
    a2a_payload: dict

class SampleNote(BaseModel):
    id: str
    title: str
    description: str
    expected_decision: str
    content: str

class SubmissionHistory(BaseModel):
    id: str
    created_at: datetime
    decision: Optional[str]
    raw_note_preview: str
    patient_id: Optional[str] = None
    policy: Optional[str] = None
    confidence_score: Optional[float] = None
