import { motion } from 'framer-motion';
import { CheckCircle2, Circle } from 'lucide-react';

const CRITERIA_LABELS: Record<string, string> = {
  chronic_pain_conservative_failure: 'Conservative therapy ≥6 weeks (PT + medication)',
  neurologic_weakness: 'Progressive lower extremity weakness',
  neurologic_reflexes: 'Absent or asymmetric deep tendon reflexes',
  neurologic_sensory: 'Dermatomal sensory loss',
  cauda_equina: 'Cauda equina syndrome signs (bowel/bladder/saddle)',
  trauma: 'Significant spinal trauma / fracture',
  tumor_mass: 'Suspected tumor or spinal metastasis',
  infection: 'Suspected spinal infection',
  positive_slr: 'Positive straight leg raise test',
  radiculopathy_confirmed: 'Confirmed radiculopathy / sciatica',
};

interface Props {
  matchedCriteria: string[];
  unmetCriteria: string[];
}

export function CriteriaChecklist({ matchedCriteria, unmetCriteria }: Props) {
  const allCriteria = Object.keys(CRITERIA_LABELS);

  return (
    <div className="space-y-2">
      <h3
        className="uppercase tracking-wider mb-3"
        style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9ca3af' }}
      >
        Molina MCR-621 — Coverage Criteria
      </h3>
      {allCriteria.map((id, i) => {
        const isMatched = matchedCriteria.includes(id);
        const isChecked = isMatched || unmetCriteria.includes(id);
        const label = CRITERIA_LABELS[id] || id;

        return (
          <motion.div
            key={id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: isChecked ? 1 : 0.35, x: 0 }}
            transition={{ delay: i * 0.07, duration: 0.3 }}
            className="flex items-center gap-3 p-2.5 rounded-xl transition-all"
            style={isMatched ? { background: 'rgba(253,179,82,0.12)', border: '1px solid rgba(253,179,82,0.35)' } : {}}
          >
            {isMatched ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#FC5D36' }} />
            ) : (
              <Circle className="w-4 h-4 flex-shrink-0" style={{ color: '#d1d5db' }} />
            )}
            <span
              className="text-sm"
              style={{
                fontFamily: 'Instrument Sans, sans-serif',
                color: isMatched ? '#060B13' : '#9ca3af',
                fontWeight: isMatched ? 500 : 400,
              }}
            >
              {label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
