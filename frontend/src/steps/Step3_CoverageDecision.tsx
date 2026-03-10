import { motion } from 'framer-motion';
import { Shield, ChevronRight } from 'lucide-react';
import { DecisionBadge } from '../components/DecisionBadge';
import { CriteriaChecklist } from '../components/CriteriaChecklist';
import { PayerQuestion } from '../components/PayerQuestion';
import type { CoverageResult } from '../types';

interface Props {
  coverageResult: CoverageResult;
  onNext: () => void;
  loading: boolean;
  payerQuestion?: string;
  payerCriterion?: string;
  onSubmitPayerReply?: (answer: string) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function Step3_CoverageDecision({ coverageResult, onNext, loading, payerQuestion, payerCriterion, onSubmitPayerReply, onCancel, isLoading }: Props) {
  // While waiting for payer clarification (no result yet), show the question prompt
  if (payerQuestion && !coverageResult) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
        className="max-w-3xl mx-auto"
      >
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'rgba(252,93,54,0.08)', border: '1px solid rgba(252,93,54,0.25)' }}
          >
            <Shield className="w-7 h-7" style={{ color: '#FC5D36' }} />
          </div>
          <h2
            style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 500, fontSize: '28px', color: '#ffffff', marginBottom: '8px' }}
          >
            Coverage Decision
          </h2>
          <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '15px', color: 'rgba(255,255,255,0.5)' }}>
            Molina Healthcare MCR-621 — Lumbar Spine MRI
          </p>
        </div>
        <PayerQuestion
          question={payerQuestion}
          criterionAtStake={payerCriterion}
          onSubmit={onSubmitPayerReply ?? (() => {})}
          onCancel={onCancel}
          isLoading={isLoading ?? false}
        />
      </motion.div>
    );
  }

  const confidencePct = Math.round(coverageResult.confidence_score * 100);

  const barColor =
    coverageResult.decision === 'APPROVED' ? '#16a34a' :
    coverageResult.decision === 'DENIED' ? '#FC5D36' : '#FDB352';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto"
    >
      <div className="text-center mb-8">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
          style={{ background: 'rgba(252,93,54,0.08)', border: '1px solid rgba(252,93,54,0.25)' }}
        >
          <Shield className="w-7 h-7" style={{ color: '#FC5D36' }} />
        </div>
        <h2
          style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 500, fontSize: '28px', color: '#ffffff', marginBottom: '8px' }}
        >
          Coverage Decision
        </h2>
        <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '15px', color: 'rgba(255,255,255,0.5)' }}>
          Molina Healthcare MCR-621 — Lumbar Spine MRI
        </p>
      </div>

      {/* Decision badge */}
      <div className="flex justify-center mb-8">
        <DecisionBadge decision={coverageResult.decision} />
      </div>

      {/* Confidence score */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span
            className="uppercase tracking-wider"
            style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}
          >
            Confidence Score
          </span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: barColor }}>
            {confidencePct}%
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidencePct}%` }}
            transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: barColor }}
          />
        </div>
      </div>

      {/* Criteria checklist */}
      <div className="rounded-xl p-5 mb-6" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.11)' }}>
        <CriteriaChecklist
          matchedCriteria={coverageResult.matched_criteria}
          unmetCriteria={coverageResult.unmet_criteria}
        />
      </div>

      {/* LLM Justification */}
      <div className="rounded-xl p-5 mb-6" style={{ background: 'rgba(253,179,82,0.08)', border: '1px solid rgba(253,179,82,0.2)' }}>
        <h3
          className="uppercase tracking-wider mb-3"
          style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}
        >
          Clinical Justification
        </h3>
        <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>
          {coverageResult.justification}
        </p>
      </div>

      <div className="flex justify-center">
        <motion.button
          onClick={onNext}
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn-primary flex items-center gap-2"
        >
          {loading ? 'Generating...' : (
            <>Generate Prior Auth Package <ChevronRight className="w-4 h-4" /></>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
