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
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <motion.div
              className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                current > step.id
                  ? 'bg-teal-500 border-teal-500 text-navy-900'
                  : current === step.id
                  ? 'bg-transparent border-teal-400 text-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.4)]'
                  : 'bg-transparent border-slate-600 text-slate-600'
              }`}
              animate={current === step.id ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {current > step.id ? (
                <Check className="w-5 h-5" />
              ) : (
                <span className="text-sm font-bold font-mono">{step.id}</span>
              )}
            </motion.div>
            <span
              className={`mt-2 text-xs font-mono whitespace-nowrap ${
                current >= step.id ? 'text-teal-400' : 'text-slate-600'
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`h-0.5 w-16 mx-2 mb-5 transition-colors ${
                current > step.id + 0 ? 'bg-teal-500' : 'bg-slate-700'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
