import { motion } from 'framer-motion';
import { Activity, Pill, Eye, User } from 'lucide-react';
import type { FHIRResource } from '../types';

const resourceConfig = {
  Condition: { icon: Activity, color: 'border-blue-500 bg-blue-500/10', iconColor: 'text-blue-400', label: 'Condition' },
  MedicationRequest: { icon: Pill, color: 'border-green-500 bg-green-500/10', iconColor: 'text-green-400', label: 'Medication' },
  Observation: { icon: Eye, color: 'border-amber-500 bg-amber-500/10', iconColor: 'text-amber-400', label: 'Observation' },
};

interface Props {
  resource: FHIRResource;
  index: number;
}

export function FHIRCard({ resource, index }: Props) {
  const config = resourceConfig[resource.resourceType as keyof typeof resourceConfig] ?? {
    icon: User,
    color: 'border-slate-500 bg-slate-500/10',
    iconColor: 'text-slate-400',
    label: resource.resourceType,
  };
  const Icon = config.icon;

  const title =
    resource.code?.text ||
    resource.medication?.text ||
    resource.resourceType;

  const detail =
    resource.valueString ||
    resource.dosageInstruction?.[0]?.text ||
    resource.evidence?.[0]?.detail?.[0]?.display ||
    resource.clinicalStatus ||
    '';

  const icdCode = resource.code?.coding?.[0]?.code;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.12, duration: 0.4, ease: 'easeOut' }}
      className={`rounded-lg border p-4 mb-3 ${config.color}`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${config.iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-mono uppercase tracking-wider ${config.iconColor}`}>
              {config.label}
            </span>
            {icdCode && (
              <span className="text-xs font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                {icdCode}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-200 font-medium leading-snug">{title}</p>
          {detail && (
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{detail}</p>
          )}
          {resource._sourceRef && (
            <div className="mt-2 flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-teal-500" />
              <span className="text-xs text-teal-600 font-mono">
                {resource._sourceRef}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
