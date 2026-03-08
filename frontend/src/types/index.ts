export interface FHIRCoding {
  system: string;
  code: string;
}

export interface FHIRCode {
  text: string;
  coding: FHIRCoding[];
}

export interface FHIRResource {
  resourceType: string;
  id: string;
  code?: FHIRCode;
  clinicalStatus?: string;
  medication?: { text: string };
  status?: string;
  dosageInstruction?: Array<{ text: string }>;
  valueString?: string;
  evidence?: Array<{ detail: Array<{ display: string }> }>;
  _sourceRef?: string;
  [key: string]: unknown;
}

export interface FHIRBundle {
  resourceType: string;
  type: string;
  entry: FHIRResource[];
  patient_demographics: {
    id?: string;
    name?: string;
    dob?: string;
    mrn?: string;
    gender?: string;
  };
}

export interface CoverageResult {
  decision: 'APPROVED' | 'DENIED' | 'NEEDS_MORE_INFO';
  matched_criteria: string[];
  unmet_criteria: string[];
  justification: string;
  confidence_score: number;
  policy_id: string;
}

export interface PriorAuthPackage {
  submission_id: string;
  timestamp: string;
  patient: {
    id: string;
    name: string;
    dob: string;
    mrn?: string;
    gender?: string;
  };
  requested_service: {
    cpt_code: string;
    description: string;
    icd10_codes: string[];
  };
  clinical_justification: string;
  supporting_criteria: string[];
  coverage_decision: string;
  fhir_bundle: FHIRBundle;
  a2a_payload: Record<string, unknown>;
}

export interface SampleNote {
  id: string;
  title: string;
  description: string;
  expected_decision: string;
  content: string;
}

export type WizardStep = 1 | 2 | 3 | 4;

// A2A Protocol Types
export type A2ATaskState =
  | 'submitted'
  | 'working'
  | 'input-required'
  | 'completed'
  | 'failed'
  | 'canceled';

export interface A2ATextPart {
  type: 'text';
  text: string;
}

export interface A2ADataPart {
  type: 'data';
  mime_type: string;
  data: Record<string, unknown>;
}

export type A2APart = A2ATextPart | A2ADataPart;

export interface A2AMessage {
  role: 'user' | 'agent';
  parts: A2APart[];
  metadata?: Record<string, unknown>;
}

export interface A2ATaskStatus {
  state: A2ATaskState;
  message?: A2AMessage;
  timestamp: string;
}

export interface A2ATask {
  id: string;
  session_id?: string;
  status: A2ATaskStatus;
  history: A2AMessage[];
  artifacts: Record<string, unknown>[];
}

export interface CoverageTaskStarted {
  task_id: string;
  state: string;
}

export interface Policy {
  id: string;
  name: string;
  description?: string;
}

export interface AuditTrailEntry {
  step: string;
  model?: string;
  tool?: string;
  input_tokens?: number;
  output_tokens?: number;
  latency_ms?: number;
  timestamp?: string;
  [key: string]: unknown;
}

export interface AuditTrail {
  submission_id: string;
  entries: AuditTrailEntry[];
  total_tokens?: number;
  total_latency_ms?: number;
}
