import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircleQuestion } from 'lucide-react';

interface PayerQuestionProps {
  question: string;
  criterionAtStake?: string;
  onSubmit: (answer: string) => void;
  isLoading: boolean;
}

export function PayerQuestion({ question, criterionAtStake, onSubmit, isLoading }: PayerQuestionProps) {
  const [answer, setAnswer] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = answer.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-xl p-6 mb-6"
      style={{
        background: 'rgba(251,191,36,0.06)',
        border: '2px solid rgba(251,191,36,0.55)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)' }}
        >
          <MessageCircleQuestion className="w-5 h-5" style={{ color: '#d97706' }} />
        </div>
        <span
          style={{
            fontFamily: 'General Sans, sans-serif',
            fontWeight: 500,
            fontSize: '16px',
            color: '#92400e',
          }}
        >
          Payer Needs Additional Information
        </span>
      </div>

      {/* Criterion label */}
      {criterionAtStake && (
        <div className="mb-3">
          <span
            className="inline-block rounded-full px-3 py-0.5 text-xs uppercase tracking-wider"
            style={{
              fontFamily: 'Instrument Sans, sans-serif',
              fontWeight: 600,
              background: 'rgba(251,191,36,0.2)',
              color: '#92400e',
              border: '1px solid rgba(251,191,36,0.4)',
            }}
          >
            Criterion: {criterionAtStake}
          </span>
        </div>
      )}

      {/* Question text */}
      <p
        className="mb-5"
        style={{
          fontFamily: 'Instrument Sans, sans-serif',
          fontSize: '15px',
          color: '#363636',
          lineHeight: 1.65,
        }}
      >
        {question}
      </p>

      {/* Answer textarea */}
      <textarea
        ref={textareaRef}
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        rows={4}
        disabled={isLoading}
        placeholder="Enter your clinical response here..."
        className="w-full rounded-lg px-4 py-3 text-sm resize-none transition-colors"
        style={{
          fontFamily: 'Instrument Sans, sans-serif',
          fontSize: '14px',
          color: '#363636',
          background: '#FFFFFF',
          border: '1px solid rgba(251,191,36,0.5)',
          outline: 'none',
          lineHeight: 1.6,
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#d97706'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(251,191,36,0.5)'; }}
      />

      {/* Submit button */}
      <div className="flex justify-end mt-4">
        <motion.button
          onClick={handleSubmit}
          disabled={isLoading || !answer.trim()}
          whileHover={{ scale: isLoading || !answer.trim() ? 1 : 1.02 }}
          whileTap={{ scale: isLoading || !answer.trim() ? 1 : 0.98 }}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-opacity"
          style={{
            fontFamily: 'Instrument Sans, sans-serif',
            background: isLoading || !answer.trim()
              ? '#e5e7eb'
              : 'linear-gradient(110deg, #FDB352 0%, #FC5D36 100%)',
            color: isLoading || !answer.trim() ? '#9ca3af' : '#FFFFFF',
            cursor: isLoading || !answer.trim() ? 'not-allowed' : 'pointer',
            border: 'none',
          }}
        >
          {isLoading ? 'Submitting...' : 'Submit Answer'}
        </motion.button>
      </div>
    </motion.div>
  );
}
