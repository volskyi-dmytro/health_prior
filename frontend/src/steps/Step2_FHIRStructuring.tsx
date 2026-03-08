import { motion } from 'framer-motion';
import { Layers, ChevronRight } from 'lucide-react';
import { FHIRCard } from '../components/FHIRCard';
import type { FHIRBundle } from '../types';

interface Props {
  fhirBundle: FHIRBundle;
  fhirBundleB?: FHIRBundle | null;
  modelALabel?: string;
  modelBLabel?: string;
  rawNote: string;
  onNext: () => void;
  loading: boolean;
}

function BundleColumn({ fhirBundle, label }: { fhirBundle: FHIRBundle; label?: string }) {
  const conditions = fhirBundle.entry.filter((e) => e.resourceType === 'Condition');
  const medications = fhirBundle.entry.filter((e) => e.resourceType === 'MedicationRequest');
  const observations = fhirBundle.entry.filter((e) => e.resourceType === 'Observation');
  const demo = fhirBundle.patient_demographics;

  return (
    <div>
      {label && (
        <div className="mb-2 text-center">
          <span
            className="inline-flex items-center px-3 py-1 rounded-[100px] text-xs font-medium"
            style={{ background: 'rgba(252,93,54,0.1)', color: '#FC5D36', fontFamily: 'Instrument Sans, sans-serif' }}
          >
            {label}
          </span>
        </div>
      )}
      <div className="overflow-auto max-h-[560px] pr-1">
        {Object.keys(demo).length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-xl p-4 mb-3"
            style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.25)' }}
          >
            <span
              className="uppercase tracking-wider"
              style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#6366f1' }}
            >
              Patient
            </span>
            <div className="mt-2 space-y-1">
              {demo.name && (
                <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', color: '#060B13' }}>
                  <span style={{ color: '#9ca3af' }}>Name: </span>{demo.name}
                </p>
              )}
              {demo.dob && (
                <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', color: '#060B13' }}>
                  <span style={{ color: '#9ca3af' }}>DOB: </span>{demo.dob}
                </p>
              )}
              {demo.mrn && (
                <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', color: '#060B13' }}>
                  <span style={{ color: '#9ca3af' }}>MRN: </span>{demo.mrn}
                </p>
              )}
              {demo.gender && (
                <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', color: '#060B13' }}>
                  <span style={{ color: '#9ca3af' }}>Gender: </span>{demo.gender}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {conditions.map((r, i) => <FHIRCard key={r.id} resource={r} index={i} />)}
        {medications.map((r, i) => <FHIRCard key={r.id} resource={r} index={conditions.length + i} />)}
        {observations.map((r, i) => <FHIRCard key={r.id} resource={r} index={conditions.length + medications.length + i} />)}

        {fhirBundle.entry.length === 0 && (
          <p
            className="text-center py-8"
            style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', color: '#9ca3af' }}
          >
            No FHIR resources extracted.
          </p>
        )}
      </div>
    </div>
  );
}

export function Step2_FHIRStructuring({ fhirBundle, fhirBundleB, modelALabel, modelBLabel, rawNote, onNext, loading }: Props) {
  const compareMode = !!fhirBundleB;

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
          style={{ background: 'rgba(253,179,82,0.12)', border: '1px solid rgba(253,179,82,0.35)' }}
        >
          <Layers className="w-7 h-7" style={{ color: '#FDB352' }} />
        </div>
        <h2
          style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 500, fontSize: '28px', color: '#000', marginBottom: '8px' }}
        >
          FHIR Structuring
        </h2>
        <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '15px', color: '#6b7280' }}>
          {compareMode
            ? 'Side-by-side model comparison of FHIR R4 extraction'
            : 'Clinical note structured into FHIR R4 resources with source citations'}
        </p>
      </div>

      {compareMode ? (
        /* Two-column comparison layout */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl p-4" style={{ background: '#FFFFFF', border: '1px solid #e5e7eb' }}>
            <BundleColumn fhirBundle={fhirBundle} label={modelALabel || 'Model A'} />
          </div>
          <div className="rounded-xl p-4" style={{ background: '#FFFFFF', border: '1px solid #e5e7eb' }}>
            <BundleColumn fhirBundle={fhirBundleB} label={modelBLabel || 'Model B'} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: raw note */}
          <div className="rounded-xl p-4" style={{ background: '#FFFFFF', border: '1px solid #e5e7eb' }}>
            <h3
              className="uppercase tracking-wider mb-3"
              style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9ca3af' }}
            >
              Raw Clinical Note
            </h3>
            <div
              className="overflow-auto max-h-[500px] whitespace-pre-wrap leading-relaxed"
              style={{ fontFamily: 'Inter, monospace', fontSize: '12px', color: '#363636' }}
            >
              {rawNote}
            </div>
          </div>

          {/* Right: FHIR cards */}
          <BundleColumn fhirBundle={fhirBundle} />
        </div>
      )}

      <div className="flex justify-center mt-6">
        <motion.button
          onClick={onNext}
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn-primary flex items-center gap-2"
        >
          {loading ? 'Evaluating Coverage...' : (
            <>Evaluate Coverage <ChevronRight className="w-4 h-4" /></>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
