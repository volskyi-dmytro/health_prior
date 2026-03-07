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
      <h3 className="text-sm font-mono text-slate-400 uppercase tracking-wider mb-3">
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
            className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
              isMatched ? 'bg-teal-500/10 border border-teal-500/30' : 'bg-transparent'
            }`}
          >
            {isMatched ? (
              <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-slate-600 flex-shrink-0" />
            )}
            <span
              className={`text-sm ${isMatched ? 'text-teal-100' : 'text-slate-500'}`}
            >
              {label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
