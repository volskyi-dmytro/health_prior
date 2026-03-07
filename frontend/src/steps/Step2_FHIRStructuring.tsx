import { motion } from 'framer-motion';
import { Layers, ChevronRight } from 'lucide-react';
import { FHIRCard } from '../components/FHIRCard';
import type { FHIRBundle } from '../types';

interface Props {
  fhirBundle: FHIRBundle;
  rawNote: string;
  onNext: () => void;
  loading: boolean;
}

export function Step2_FHIRStructuring({ fhirBundle, rawNote, onNext, loading }: Props) {
  const conditions = fhirBundle.entry.filter((e) => e.resourceType === 'Condition');
  const medications = fhirBundle.entry.filter((e) => e.resourceType === 'MedicationRequest');
  const observations = fhirBundle.entry.filter((e) => e.resourceType === 'Observation');
  const demo = fhirBundle.patient_demographics;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 mb-4">
          <Layers className="w-7 h-7 text-blue-400" />
        </div>
        <h2 className="text-2xl font-display text-white mb-2">FHIR Structuring</h2>
        <p className="text-slate-400 text-sm">
          Clinical note structured into FHIR R4 resources with source citations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: raw note with source ref hints */}
        <div className="bg-slate-900/50 rounded-xl border border-slate-700 p-4">
          <h3 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">
            Raw Clinical Note
          </h3>
          <div className="text-xs font-mono text-slate-400 leading-relaxed overflow-auto max-h-[500px] whitespace-pre-wrap">
            {rawNote}
          </div>
        </div>

        {/* Right: FHIR cards */}
        <div className="overflow-auto max-h-[560px] pr-1">
          {/* Patient Demographics */}
          {Object.keys(demo).length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-lg border border-purple-500/40 bg-purple-500/10 p-4 mb-3"
            >
              <span className="text-xs font-mono text-purple-400 uppercase tracking-wider">Patient</span>
              <div className="mt-1 space-y-1">
                {demo.name && <p className="text-sm text-slate-200"><span className="text-slate-500">Name:</span> {demo.name}</p>}
                {demo.dob && <p className="text-sm text-slate-200"><span className="text-slate-500">DOB:</span> {demo.dob}</p>}
                {demo.mrn && <p className="text-sm text-slate-200"><span className="text-slate-500">MRN:</span> {demo.mrn}</p>}
                {demo.gender && <p className="text-sm text-slate-200"><span className="text-slate-500">Gender:</span> {demo.gender}</p>}
              </div>
            </motion.div>
          )}

          {conditions.map((r, i) => <FHIRCard key={r.id} resource={r} index={i} />)}
          {medications.map((r, i) => <FHIRCard key={r.id} resource={r} index={conditions.length + i} />)}
          {observations.map((r, i) => <FHIRCard key={r.id} resource={r} index={conditions.length + medications.length + i} />)}

          {fhirBundle.entry.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-8">No FHIR resources extracted.</p>
          )}
        </div>
      </div>

      <div className="flex justify-center mt-6">
        <motion.button
          onClick={onNext}
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-8 py-3 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 text-navy-900 font-semibold rounded-lg transition-all shadow-[0_0_20px_rgba(45,212,191,0.3)]"
        >
          {loading ? 'Evaluating Coverage...' : (
            <>Evaluate Coverage <ChevronRight className="w-4 h-4" /></>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
