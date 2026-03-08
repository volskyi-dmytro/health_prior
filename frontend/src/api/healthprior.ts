const API_BASE = import.meta.env.VITE_API_URL || '/api';

export { API_BASE };

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

export const getSampleNotes = () =>
  fetchJSON<import('../types').SampleNote[]>(`${API_BASE}/notes/samples`);

export const structureNote = (note: string, model?: string, policy_id?: string) =>
  fetchJSON<{ fhir_bundle: import('../types').FHIRBundle; raw_note: string; model_used: string }>(
    `${API_BASE}/notes/structure`,
    { method: 'POST', body: JSON.stringify({ note, model, policy_id }) }
  );

export const getPolicies = () =>
  fetchJSON<Array<{ id: string; payer: string; procedure_name: string; cpt_code: string }>>(`${API_BASE}/policies`)
    .then(rows => rows.map(p => ({ id: p.id, name: `${p.payer}: ${p.procedure_name} (${p.cpt_code})` })));

export const getSubmissionAudit = (id: string) =>
  fetchJSON<import('../types').AuditTrail>(`${API_BASE}/prior-auth/${id}/audit`);

export const getPriorAuthPdfUrl = (submission_id: string) =>
  `${API_BASE}/prior-auth/${submission_id}/pdf`;

export const evaluateCoverage = (
  fhir_bundle: import('../types').FHIRBundle,
  raw_note: string,
  policy_id = 'MCR-621'
) =>
  fetchJSON<import('../types').CoverageResult>(`${API_BASE}/coverage/evaluate`, {
    method: 'POST',
    body: JSON.stringify({ fhir_bundle, raw_note, policy_id }),
  });

export const generatePriorAuth = (
  fhir_bundle: import('../types').FHIRBundle,
  coverage_result: import('../types').CoverageResult,
  raw_note: string
) =>
  fetchJSON<import('../types').PriorAuthPackage>(`${API_BASE}/prior-auth/generate`, {
    method: 'POST',
    body: JSON.stringify({ fhir_bundle, coverage_result, raw_note }),
  });

export const getSubmissionHistory = () =>
  fetchJSON<{ total: number; page: number; items: Array<{ id: string; created_at: string; decision: string | null; raw_note_preview: string }> }>(
    `${API_BASE}/prior-auth/history`
  ).then(r => r.items);

export interface AuthUser {
  authenticated: boolean;
  login?: string;
  avatar_url?: string;
  email?: string;
}

export const getMe = () =>
  fetchJSON<AuthUser>(`${API_BASE}/auth/me`).catch(() => ({ authenticated: false } as AuthUser));

export const loginUrl = () => `${API_BASE}/auth/github`;
export const logoutUrl = () => `${API_BASE}/auth/logout`;
