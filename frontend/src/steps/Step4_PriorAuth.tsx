import { motion } from 'framer-motion';
import { FileText, Download, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { JsonViewer } from '../components/JsonViewer';
import type { PriorAuthPackage } from '../types';

interface Props {
  priorAuth: PriorAuthPackage;
  onReset: () => void;
}

export function Step4_PriorAuth({ priorAuth, onReset }: Props) {
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

      {/* Actions */}
      <div className="flex gap-3 justify-center">
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
