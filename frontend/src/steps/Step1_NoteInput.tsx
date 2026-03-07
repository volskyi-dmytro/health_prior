import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Stethoscope, ChevronRight, Cpu } from 'lucide-react';
import { getSampleNotes } from '../api/healthprior';
import type { SampleNote } from '../types';

const MODELS = [
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku (faster)' },
  { value: 'openai/gpt-4o', label: 'GPT-4o' },
  { value: 'google/gemini-pro-1.5', label: 'Gemini Pro 1.5' },
];

interface Props {
  onSubmit: (note: string, model: string) => void;
  loading: boolean;
}

export function Step1_NoteInput({ onSubmit, loading }: Props) {
  const [note, setNote] = useState('');
  const [model, setModel] = useState(MODELS[0].value);
  const [samples, setSamples] = useState<SampleNote[]>([]);

  useEffect(() => {
    getSampleNotes().then(setSamples).catch(console.error);
  }, []);

  const decisionColor = (d: string) =>
    d === 'APPROVED' ? 'text-teal-400' : d === 'DENIED' ? 'text-red-400' : 'text-amber-400';

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
          <Stethoscope className="w-7 h-7 text-teal-400" />
        </div>
        <h2 className="text-2xl font-display text-white mb-2">Clinical Note Input</h2>
        <p className="text-slate-400 text-sm">
          Paste a clinical note or select a sample to begin prior authorization analysis
        </p>
      </div>

      {/* Sample note buttons */}
      {samples.length > 0 && (
        <div className="grid grid-cols-1 gap-2 mb-4">
          <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">Load sample note:</p>
          {samples.map((s) => (
            <button
              key={s.id}
              onClick={() => setNote(s.content)}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-700 bg-slate-800/50 hover:border-teal-500/50 hover:bg-teal-500/5 transition-all text-left group"
            >
              <div>
                <span className="text-sm text-slate-200 font-medium group-hover:text-teal-300 transition-colors">
                  {s.title}
                </span>
                <span className="text-xs text-slate-500 block mt-0.5">{s.description}</span>
              </div>
              <span className={`text-xs font-mono font-bold ${decisionColor(s.expected_decision)}`}>
                {s.expected_decision}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Note textarea */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Paste clinical note here (H&P, discharge summary, progress note)..."
        className="w-full h-64 p-4 bg-slate-900/80 border border-slate-700 rounded-xl text-slate-200 text-sm font-mono resize-none focus:outline-none focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/30 placeholder-slate-600 transition-all"
      />

      {/* Model picker + submit */}
      <div className="flex items-center gap-3 mt-4">
        <div className="flex items-center gap-2 flex-1">
          <Cpu className="w-4 h-4 text-slate-500" />
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500/50 font-mono flex-1"
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <motion.button
          onClick={() => note.trim() && onSubmit(note, model)}
          disabled={!note.trim() || loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-6 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 disabled:text-slate-500 text-navy-900 font-semibold rounded-lg transition-all shadow-[0_0_20px_rgba(45,212,191,0.3)] disabled:shadow-none"
        >
          {loading ? (
            <span className="text-sm">Analyzing...</span>
          ) : (
            <>
              <span className="text-sm">Analyze Note</span>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
