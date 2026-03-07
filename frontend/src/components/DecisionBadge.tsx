import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Props {
  decision: 'APPROVED' | 'DENIED' | 'NEEDS_MORE_INFO';
}

const config = {
  APPROVED: {
    icon: CheckCircle,
    text: 'APPROVED',
    className: 'text-teal-400 border-teal-500 bg-teal-500/10',
    glow: '0 0 40px rgba(45,212,191,0.35)',
  },
  DENIED: {
    icon: XCircle,
    text: 'DENIED',
    className: 'text-red-400 border-red-500 bg-red-500/10',
    glow: '0 0 40px rgba(239,68,68,0.35)',
  },
  NEEDS_MORE_INFO: {
    icon: AlertCircle,
    text: 'NEEDS MORE INFO',
    className: 'text-amber-400 border-amber-500 bg-amber-500/10',
    glow: '0 0 40px rgba(245,158,11,0.35)',
  },
};

export function DecisionBadge({ decision }: Props) {
  const { icon: Icon, text, className, glow } = config[decision];

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className={`inline-flex items-center gap-3 border-2 rounded-xl px-8 py-4 ${className}`}
      style={{ boxShadow: glow }}
    >
      <Icon className="w-8 h-8" />
      <span className="text-3xl font-display tracking-wide">{text}</span>
    </motion.div>
  );
}
