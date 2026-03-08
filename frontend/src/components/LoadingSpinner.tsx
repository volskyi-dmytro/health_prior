import { motion } from 'framer-motion';

interface Props {
  message?: string;
}

export function LoadingSpinner({ message = 'Processing...' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-5">
      <div className="relative w-16 h-16">
        <motion.div
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: 'rgba(253,179,82,0.3)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-t-2"
          style={{ borderTopColor: '#FC5D36', borderColor: 'transparent' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full" style={{ background: '#FC5D36' }} />
        </div>
      </div>
      <p
        className="text-sm animate-pulse"
        style={{ fontFamily: 'Instrument Sans, sans-serif', color: '#363636' }}
      >
        {message}
      </p>
    </div>
  );
}
