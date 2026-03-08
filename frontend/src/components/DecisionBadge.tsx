import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Props {
  decision: 'APPROVED' | 'DENIED' | 'NEEDS_MORE_INFO';
}

const config = {
  APPROVED: {
    icon: CheckCircle,
    text: 'APPROVED',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.4)',
    color: '#16a34a',
    glow: '0 0 40px rgba(34,197,94,0.2)',
  },
  DENIED: {
    icon: XCircle,
    text: 'DENIED',
    bg: 'rgba(252,93,54,0.08)',
    border: 'rgba(252,93,54,0.4)',
    color: '#FC5D36',
    glow: '0 0 40px rgba(252,93,54,0.2)',
  },
  NEEDS_MORE_INFO: {
    icon: AlertCircle,
    text: 'NEEDS MORE INFO',
    bg: 'rgba(253,179,82,0.12)',
    border: 'rgba(253,179,82,0.5)',
    color: '#d97706',
    glow: '0 0 40px rgba(253,179,82,0.25)',
  },
};

export function DecisionBadge({ decision }: Props) {
  const { icon: Icon, text, bg, border, color, glow } = config[decision];

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className="inline-flex items-center gap-3 rounded-[100px] px-8 py-4"
      style={{ background: bg, border: `2px solid ${border}`, boxShadow: glow }}
    >
      <Icon className="w-7 h-7" style={{ color }} />
      <span style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 500, fontSize: '28px', color }}>
        {text}
      </span>
    </motion.div>
  );
}
