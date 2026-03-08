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

  const decisionStyle = (d: string) => {
    if (d === 'APPROVED') return { color: '#16a34a', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: '100px' };
    if (d === 'DENIED') return { color: '#FC5D36', background: 'rgba(252,93,54,0.1)', padding: '2px 8px', borderRadius: '100px' };
    return { color: '#d97706', background: 'rgba(253,179,82,0.15)', padding: '2px 8px', borderRadius: '100px' };
  };

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
          style={{ background: 'rgba(252,93,54,0.1)', border: '1px solid rgba(252,93,54,0.25)' }}
        >
          <Stethoscope className="w-7 h-7" style={{ color: '#FC5D36' }} />
        </div>
        <h2
          style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 500, fontSize: '28px', color: '#000', marginBottom: '8px' }}
        >
          Clinical Note Input
        </h2>
        <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '15px', color: '#6b7280' }}>
          Paste a clinical note or select a sample to begin prior authorization analysis
        </p>
      </div>

      {/* Sample note buttons */}
      {samples.length > 0 && (
        <div className="grid grid-cols-1 gap-2 mb-4">
          <p
            className="uppercase tracking-wider"
            style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9ca3af' }}
          >
            Load sample note:
          </p>
          {samples.map((s) => (
            <button
              key={s.id}
              onClick={() => setNote(s.content)}
              className="flex items-center justify-between p-4 rounded-xl text-left group transition-all"
              style={{ border: '1px solid #e5e7eb', background: '#FFFFFF' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(252,93,54,0.4)';
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(252,93,54,0.04)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb';
                (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF';
              }}
            >
              <div>
                <span
                  className="block"
                  style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', fontWeight: 500, color: '#060B13' }}
                >
                  {s.title}
                </span>
                <span
                  className="block mt-0.5"
                  style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', color: '#9ca3af' }}
                >
                  {s.description}
                </span>
              </div>
              <span
                className="text-xs font-bold"
                style={{ fontFamily: 'Inter, sans-serif', ...decisionStyle(s.expected_decision) }}
              >
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
        className="w-full h-64 p-4 resize-none focus:outline-none transition-all rounded-xl"
        style={{
          fontFamily: 'Inter, monospace',
          fontSize: '13px',
          color: '#060B13',
          background: '#FFFFFF',
          border: '1px solid #e5e7eb',
          lineHeight: '1.6',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(252,93,54,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(252,93,54,0.08)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
      />

      {/* Model picker + submit */}
      <div className="flex items-center gap-3 mt-4">
        <div className="flex items-center gap-2 flex-1">
          <Cpu className="w-4 h-4" style={{ color: '#9ca3af' }} />
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded-[100px] px-4 py-2 focus:outline-none flex-1 transition-all"
            style={{
              fontFamily: 'Instrument Sans, sans-serif',
              fontSize: '14px',
              color: '#363636',
              background: '#FFFFFF',
              border: '1px solid #e5e7eb',
            }}
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
          className="btn-primary flex items-center gap-2"
        >
          {loading ? (
            <span>Analyzing...</span>
          ) : (
            <>
              <span>Analyze Note</span>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
