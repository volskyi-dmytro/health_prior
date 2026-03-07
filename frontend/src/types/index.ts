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
