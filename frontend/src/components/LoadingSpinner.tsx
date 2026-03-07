import { motion } from 'framer-motion';

interface Props {
  message?: string;
}

export function LoadingSpinner({ message = 'Processing...' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative w-16 h-16">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-teal-500/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-t-2 border-teal-400"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-teal-400" />
        </div>
      </div>
      <p className="text-sm font-mono text-slate-400 animate-pulse">{message}</p>
    </div>
  );
}
