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
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 mb-4">
          <FileText className="w-7 h-7 text-teal-400" />
        </div>
        <h2 className="text-2xl font-display text-white mb-2">Prior Auth Package</h2>
        <p className="text-slate-400 text-sm">DaVinci PAS-inspired submission ready for payer</p>
      </div>

      {/* Submission summary card */}
      <div className={`rounded-xl border p-6 mb-5 ${isApproved ? 'border-teal-500/40 bg-teal-500/5' : 'border-red-500/40 bg-red-500/5'}`}>
        <div className="flex items-center gap-3 mb-4">
          {isApproved
            ? <CheckCircle2 className="w-6 h-6 text-teal-400" />
            : <XCircle className="w-6 h-6 text-red-400" />
          }
          <span className={`text-lg font-display ${isApproved ? 'text-teal-300' : 'text-red-300'}`}>
            {priorAuth.coverage_decision}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500 text-xs font-mono block">Submission ID</span>
            <span className="text-slate-200 font-mono text-xs">{priorAuth.submission_id}</span>
          </div>
          <div>
            <span className="text-slate-500 text-xs font-mono block">Timestamp</span>
            <span className="text-slate-200 font-mono text-xs">{new Date(priorAuth.timestamp).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-500 text-xs font-mono block">Patient</span>
            <span className="text-slate-200">{priorAuth.patient.name || priorAuth.patient.id}</span>
          </div>
          <div>
            <span className="text-slate-500 text-xs font-mono block">CPT Code</span>
            <span className="text-slate-200 font-mono">{priorAuth.requested_service.cpt_code}</span>
          </div>
          <div>
            <span className="text-slate-500 text-xs font-mono block">Procedure</span>
            <span className="text-slate-200 text-xs">{priorAuth.requested_service.description}</span>
          </div>
          <div>
            <span className="text-slate-500 text-xs font-mono block">ICD-10 Codes</span>
            <span className="text-slate-200 font-mono text-xs">{priorAuth.requested_service.icd10_codes.join(', ')}</span>
          </div>
        </div>

        {priorAuth.supporting_criteria.length > 0 && (
          <div className="mt-4">
            <span className="text-slate-500 text-xs font-mono block mb-2">Matched Criteria</span>
            <div className="flex flex-wrap gap-1.5">
              {priorAuth.supporting_criteria.map((c) => (
                <span key={c} className="text-xs font-mono bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <span className="text-slate-500 text-xs font-mono block mb-2">Clinical Justification</span>
          <p className="text-xs text-slate-300 leading-relaxed">{priorAuth.clinical_justification}</p>
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
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition-all border border-slate-600"
        >
          <Download className="w-4 h-4" />
          Download JSON
        </motion.button>

        <motion.button
          onClick={onReset}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 font-medium rounded-lg transition-all border border-teal-500/30"
        >
          <RotateCcw className="w-4 h-4" />
          New Analysis
        </motion.button>
      </div>
    </motion.div>
  );
}
