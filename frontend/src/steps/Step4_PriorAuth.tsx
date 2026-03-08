import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, RotateCcw, CheckCircle2, XCircle, ClipboardList, Activity } from 'lucide-react';
import { JsonViewer } from '../components/JsonViewer';
import { getSubmissionAudit, getPriorAuthPdfUrl } from '../api/healthprior';
import type { PriorAuthPackage, AuditTrail } from '../types';

interface Props {
  priorAuth: PriorAuthPackage;
  onReset: () => void;
}

type Tab = 'package' | 'audit';

function AuditTrailView({ submissionId }: { submissionId: string }) {
  const [audit, setAudit] = useState<AuditTrail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSubmissionAudit(submissionId)
      .then(setAudit)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load audit trail'))
      .finally(() => setLoading(false));
  }, [submissionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-[#FC5D36] border-t-transparent rounded-full animate-spin" />
        <span className="ml-3" style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', color: '#6b7280' }}>
          Loading audit trail...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-xl p-5 text-center"
        style={{ background: 'rgba(252,93,54,0.05)', border: '1px solid rgba(252,93,54,0.2)' }}
      >
        <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', color: '#FC5D36' }}>
          {error}
        </p>
        <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
          Audit endpoint may not be implemented yet.
        </p>
      </div>
    );
  }

  if (!audit) return null;

  return (
    <div>
      {/* Summary stats */}
      {(audit.total_tokens !== undefined || audit.total_latency_ms !== undefined) && (
        <div className="grid grid-cols-2 gap-4 mb-5">
          {audit.total_tokens !== undefined && (
            <div className="rounded-xl p-4" style={{ background: '#FFFFFF', border: '1px solid #e5e7eb' }}>
              <span
                className="block uppercase tracking-wider mb-1"
                style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9ca3af' }}
              >
                Total Tokens
              </span>
              <span style={{ fontFamily: 'Inter, monospace', fontSize: '20px', fontWeight: 600, color: '#060B13' }}>
                {audit.total_tokens.toLocaleString()}
              </span>
            </div>
          )}
          {audit.total_latency_ms !== undefined && (
            <div className="rounded-xl p-4" style={{ background: '#FFFFFF', border: '1px solid #e5e7eb' }}>
              <span
                className="block uppercase tracking-wider mb-1"
                style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9ca3af' }}
              >
                Total Latency
              </span>
              <span style={{ fontFamily: 'Inter, monospace', fontSize: '20px', fontWeight: 600, color: '#060B13' }}>
                {(audit.total_latency_ms / 1000).toFixed(2)}s
              </span>
            </div>
          )}
        </div>
      )}

      {/* Entries */}
      <div className="space-y-3">
        {audit.entries.map((entry, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: '#FFFFFF', border: '1px solid #e5e7eb' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'rgba(252,93,54,0.1)', color: '#FC5D36', fontFamily: 'Inter, sans-serif' }}
                >
                  {i + 1}
                </div>
                <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', fontWeight: 500, color: '#060B13' }}>
                  {entry.step}
                </span>
                {entry.tool && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-[100px]"
                    style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    MCP: {entry.tool}
                  </span>
                )}
                {entry.model && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-[100px]"
                    style={{ background: 'rgba(253,179,82,0.15)', color: '#d97706', fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    {entry.model}
                  </span>
                )}
              </div>
              {entry.timestamp && (
                <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', color: '#9ca3af' }}>
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="flex gap-4">
              {entry.input_tokens !== undefined && (
                <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', color: '#6b7280' }}>
                  In: <strong>{entry.input_tokens}</strong> tokens
                </span>
              )}
              {entry.output_tokens !== undefined && (
                <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', color: '#6b7280' }}>
                  Out: <strong>{entry.output_tokens}</strong> tokens
                </span>
              )}
              {entry.latency_ms !== undefined && (
                <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', color: '#6b7280' }}>
                  Latency: <strong>{(entry.latency_ms / 1000).toFixed(2)}s</strong>
                </span>
              )}
            </div>
          </div>
        ))}
        {audit.entries.length === 0 && (
          <p
            className="text-center py-8"
            style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', color: '#9ca3af' }}
          >
            No audit entries recorded.
          </p>
        )}
      </div>
    </div>
  );
}

export function Step4_PriorAuth({ priorAuth, onReset }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('package');
  const isApproved = priorAuth.coverage_decision === 'APPROVED';

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(priorAuth, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prior-auth-${priorAuth.submission_id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    const url = getPriorAuthPdfUrl(priorAuth.submission_id);
    window.open(url, '_blank');
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'package', label: 'Prior Auth Package', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'audit', label: 'Audit Trail', icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      <div className="text-center mb-6">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
          style={{ background: 'rgba(252,93,54,0.08)', border: '1px solid rgba(252,93,54,0.25)' }}
        >
          <FileText className="w-7 h-7" style={{ color: '#FC5D36' }} />
        </div>
        <h2
          style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 500, fontSize: '28px', color: '#000', marginBottom: '8px' }}
        >
          Prior Auth Package
        </h2>
        <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '15px', color: '#6b7280' }}>
          DaVinci PAS-inspired submission ready for payer
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 p-1 rounded-xl" style={{ background: '#f3f4f6', width: 'fit-content', margin: '0 auto 24px' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-5 py-2 rounded-lg transition-all"
            style={{
              fontFamily: 'Instrument Sans, sans-serif',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? '#FC5D36' : '#6b7280',
              background: activeTab === tab.id ? '#FFFFFF' : 'transparent',
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              border: activeTab === tab.id ? '1px solid rgba(252,93,54,0.15)' : '1px solid transparent',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'package' && (
        <>
          {/* Submission summary card */}
          <div
            className="rounded-xl p-6 mb-5"
            style={
              isApproved
                ? { border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.05)' }
                : { border: '1px solid rgba(252,93,54,0.3)', background: 'rgba(252,93,54,0.05)' }
            }
          >
            <div className="flex items-center gap-3 mb-4">
              {isApproved
                ? <CheckCircle2 className="w-6 h-6" style={{ color: '#16a34a' }} />
                : <XCircle className="w-6 h-6" style={{ color: '#FC5D36' }} />
              }
              <span
                style={{
                  fontFamily: 'General Sans, sans-serif',
                  fontWeight: 500,
                  fontSize: '20px',
                  color: isApproved ? '#16a34a' : '#FC5D36',
                }}
              >
                {priorAuth.coverage_decision}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span
                  className="block"
                  style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  Submission ID
                </span>
                <span style={{ fontFamily: 'Inter, monospace', fontSize: '12px', color: '#363636' }}>
                  {priorAuth.submission_id}
                </span>
              </div>
              <div>
                <span
                  className="block"
                  style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  Timestamp
                </span>
                <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: '#363636' }}>
                  {new Date(priorAuth.timestamp).toLocaleString()}
                </span>
              </div>
              <div>
                <span
                  className="block"
                  style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  Patient
                </span>
                <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', color: '#060B13' }}>
                  {priorAuth.patient.name || priorAuth.patient.id}
                </span>
              </div>
              <div>
                <span
                  className="block"
                  style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  CPT Code
                </span>
                <span style={{ fontFamily: 'Inter, monospace', fontSize: '14px', color: '#060B13' }}>
                  {priorAuth.requested_service.cpt_code}
                </span>
              </div>
              <div>
                <span
                  className="block"
                  style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  Procedure
                </span>
                <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: '#363636' }}>
                  {priorAuth.requested_service.description}
                </span>
              </div>
              <div>
                <span
                  className="block"
                  style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  ICD-10 Codes
                </span>
                <span style={{ fontFamily: 'Inter, monospace', fontSize: '13px', color: '#363636' }}>
                  {priorAuth.requested_service.icd10_codes.join(', ')}
                </span>
              </div>
            </div>

            {priorAuth.supporting_criteria.length > 0 && (
              <div className="mt-4">
                <span
                  className="block mb-2"
                  style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  Matched Criteria
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {priorAuth.supporting_criteria.map((c) => (
                    <span
                      key={c}
                      className="text-xs px-3 py-1 rounded-[100px]"
                      style={{ fontFamily: 'Instrument Sans, sans-serif', background: 'rgba(252,93,54,0.1)', color: '#FC5D36', fontWeight: 500 }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <span
                className="block mb-2"
                style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Clinical Justification
              </span>
              <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: '#363636', lineHeight: 1.6 }}>
                {priorAuth.clinical_justification}
              </p>
            </div>
          </div>

          {/* FHIR Bundle viewer */}
          <div className="mb-4">
            <JsonViewer data={priorAuth.fhir_bundle} title="FHIR Bundle (R4)" />
          </div>

          {/* A2A payload */}
          <div className="mb-6">
            <JsonViewer data={priorAuth.a2a_payload} title="A2A Payload (DaVinci PAS)" />
          </div>
        </>
      )}

      {activeTab === 'audit' && (
        <AuditTrailView submissionId={priorAuth.submission_id} />
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-center mt-6">
        <motion.button
          onClick={downloadJson}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn-outline flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download JSON
        </motion.button>

        <motion.button
          onClick={downloadPdf}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn-amber flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          Download PDF Letter
        </motion.button>

        <motion.button
          onClick={onReset}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn-primary flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          New Analysis
        </motion.button>
      </div>
    </motion.div>
  );
}
