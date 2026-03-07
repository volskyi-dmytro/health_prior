import { motion } from 'framer-motion';
import { Shield, ChevronRight } from 'lucide-react';
import { DecisionBadge } from '../components/DecisionBadge';
import { CriteriaChecklist } from '../components/CriteriaChecklist';
import type { CoverageResult } from '../types';

interface Props {
  coverageResult: CoverageResult;
  onNext: () => void;
  loading: boolean;
}

export function Step3_CoverageDecision({ coverageResult, onNext, loading }: Props) {
  const confidencePct = Math.round(coverageResult.confidence_score * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto"
    >
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 mb-4">
          <Shield className="w-7 h-7 text-teal-400" />
        </div>
        <h2 className="text-2xl font-display text-white mb-2">Coverage Decision</h2>
        <p className="text-slate-400 text-sm">Molina Healthcare MCR-621 — Lumbar Spine MRI</p>
      </div>

      {/* Decision badge */}
      <div className="flex justify-center mb-8">
        <DecisionBadge decision={coverageResult.decision} />
      </div>

      {/* Confidence score */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Confidence Score</span>
          <span className="text-sm font-mono text-teal-400">{confidencePct}%</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidencePct}%` }}
            transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              coverageResult.decision === 'APPROVED' ? 'bg-teal-500' :
              coverageResult.decision === 'DENIED' ? 'bg-red-500' : 'bg-amber-500'
            }`}
          />
        </div>
      </div>

      {/* Criteria checklist */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-700 p-5 mb-6">
        <CriteriaChecklist
          matchedCriteria={coverageResult.matched_criteria}
          unmetCriteria={coverageResult.unmet_criteria}
        />
      </div>

      {/* LLM Justification */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-700 p-5 mb-6">
        <h3 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">
          Clinical Justification
        </h3>
        <p className="text-sm text-slate-300 leading-relaxed">{coverageResult.justification}</p>
      </div>

      <div className="flex justify-center">
        <motion.button
          onClick={onNext}
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-8 py-3 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 text-navy-900 font-semibold rounded-lg transition-all shadow-[0_0_20px_rgba(45,212,191,0.3)]"
        >
          {loading ? 'Generating...' : (
            <>Generate Prior Auth Package <ChevronRight className="w-4 h-4" /></>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
