import { motion } from 'framer-motion';
import { CheckCircle2, Circle } from 'lucide-react';

const CRITERIA_LABELS: Record<string, string> = {
  chronic_pain_conservative_trial: 'Conservative therapy ≥6 weeks (PT + medication)',
  chronic_pain_worsening: 'Worsening pain or progression during conservative treatment',
  neurological_weakness_reflexes_sensory: 'Weakness, abnormal reflexes, or dermatomal sensory change',
  bowel_bladder_dysfunction: 'Bowel or bladder dysfunction',
  saddle_anesthesia: 'Saddle anesthesia',
  abnormal_emg_ncs: 'Abnormal EMG/NCS findings',
  muscle_atrophy: 'Atrophy of related muscles',
  neurogenic_claudication: 'Neurogenic claudication (pseudoclaudication)',
  scoliosis: 'Scoliosis (ordered by orthopedist or neurosurgeon)',
  tumor_initial_evaluation: 'Initial evaluation of recently diagnosed cancer',
  tumor_followup: 'Follow-up of known tumor or mass',
  tumor_surveillance: 'Surveillance of known tumor or mass',
  tumor_bone_pain_cancer: 'Severe bone pain with history of cancer',
  tumor_bone_scan: 'Positive bone scan / x-rays suggestive for bone cancer',
  trauma_conservative_failure: 'Trauma — failure to respond to 6-week conservative care',
  trauma_worsening: 'Trauma — worsening pain or symptom progression',
  trauma_fracture: 'Trauma — evaluation of spinal fractures',
  immune_suppression: 'Spine abnormalities related to immune suppression (e.g. HIV)',
  infection_inflammation: 'Suspected infection, abscess, or inflammatory disease',
  congenital_sacral_dimple: 'Sacral dimple suspicious for dysraphism',
  congenital_dysraphism: 'Known spinal dysraphism or spina bifida',
  congenital_tethered_cord: 'Possible tethered cord',
  ankylosing_spondylitis: 'Suspected Ankylosing Spondylitis',
  spinal_vascular_lesion: 'Known or suspected spinal vascular lesion',
  preoperative: 'Pre-operative evaluation for lumbar spine surgery',
  postoperative: 'Post-operative follow-up or complication evaluation',
};

interface Props {
  matchedCriteria: string[];
  unmetCriteria: string[];
}

export function CriteriaChecklist({ matchedCriteria, unmetCriteria }: Props) {
  // Show matched first, then unmet — only criteria the LLM actually evaluated
  const evaluated = [
    ...matchedCriteria.map((id) => ({ id, isMatched: true })),
    ...unmetCriteria.map((id) => ({ id, isMatched: false })),
  ];

  return (
    <div className="space-y-2">
      <h3
        className="uppercase tracking-wider mb-3"
        style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}
      >
        Molina MCR-621 — Coverage Criteria
      </h3>
      {evaluated.map(({ id, isMatched }, i) => {
        const label = CRITERIA_LABELS[id] || id.replace(/_/g, ' ');

        return (
          <motion.div
            key={id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07, duration: 0.3 }}
            className="flex items-center gap-3 p-2.5 rounded-xl transition-all"
            style={isMatched ? { background: 'rgba(253,179,82,0.1)', border: '1px solid rgba(253,179,82,0.3)' } : { background: 'rgba(255,255,255,0.03)' }}
          >
            {isMatched ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#FC5D36' }} />
            ) : (
              <Circle className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }} />
            )}
            <span
              className="text-sm"
              style={{
                fontFamily: 'Instrument Sans, sans-serif',
                color: isMatched ? '#ffffff' : 'rgba(255,255,255,0.4)',
                fontWeight: isMatched ? 500 : 400,
              }}
            >
              {label}
            </span>
          </motion.div>
        );
      })}
      {evaluated.length === 0 && (
        <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
          No criteria evaluated.
        </p>
      )}
    </div>
  );
}
