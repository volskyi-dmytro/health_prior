import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { WizardStep } from '../types';

const steps = [
  { id: 1, label: 'Clinical Note' },
  { id: 2, label: 'FHIR Structuring' },
  { id: 3, label: 'Coverage Decision' },
  { id: 4, label: 'Prior Auth' },
];

export function WizardProgress({ current }: { current: WizardStep }) {
  return (
    <div className="flex items-center justify-center mb-6 sm:mb-10">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <motion.div
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all"
              style={
                current > step.id
                  ? { background: '#FC5D36', borderColor: '#FC5D36', color: '#fff' }
                  : current === step.id
                  ? { background: 'transparent', borderColor: '#FC5D36', color: '#FC5D36', boxShadow: '0 0 12px rgba(252,93,54,0.3)' }
                  : { background: 'transparent', borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.3)' }
              }
              animate={current === step.id ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {current > step.id ? (
                <Check className="w-5 h-5" />
              ) : (
                <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>{step.id}</span>
              )}
            </motion.div>
            <span
              className="mt-2 text-xs whitespace-nowrap hidden sm:block"
              style={{
                fontFamily: 'Instrument Sans, sans-serif',
                fontWeight: 500,
                color: current >= step.id ? '#FC5D36' : 'rgba(255,255,255,0.35)',
              }}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className="h-0.5 w-8 sm:w-16 mx-1 sm:mx-2 mb-5 transition-colors"
              style={{ background: current > step.id ? '#FC5D36' : 'rgba(255,255,255,0.12)' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
