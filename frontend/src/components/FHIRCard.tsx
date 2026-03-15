import { motion } from 'framer-motion';
import { Activity, Pill, Eye, User } from 'lucide-react';
import type { FHIRResource } from '../types';

const resourceConfig = {
  Condition: {
    icon: Activity,
    bg: 'rgba(252,93,54,0.07)',
    border: 'rgba(252,93,54,0.25)',
    iconColor: '#FC5D36',
    label: 'Condition',
  },
  MedicationRequest: {
    icon: Pill,
    bg: 'rgba(253,179,82,0.1)',
    border: 'rgba(253,179,82,0.35)',
    iconColor: '#FDB352',
    label: 'Medication',
  },
  Observation: {
    icon: Eye,
    bg: 'rgba(99,102,241,0.07)',
    border: 'rgba(99,102,241,0.25)',
    iconColor: '#6366f1',
    label: 'Observation',
  },
};

interface Props {
  resource: FHIRResource;
  index: number;
}

export function FHIRCard({ resource, index }: Props) {
  const config = resourceConfig[resource.resourceType as keyof typeof resourceConfig] ?? {
    icon: User,
    bg: 'rgba(156,163,175,0.07)',
    border: 'rgba(156,163,175,0.25)',
    iconColor: '#9ca3af',
    label: resource.resourceType,
  };
  const Icon = config.icon;

  // Helper: extract display string from a CodeableConcept (FHIR R4) or plain string
  const codeableText = (field: unknown): string => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (typeof field === 'object') {
      const f = field as { text?: string; coding?: Array<{ display?: string; code?: string }> };
      return f.text || f.coding?.[0]?.display || f.coding?.[0]?.code || '';
    }
    return '';
  };

  const title =
    codeableText(resource.code) ||
    codeableText(resource.medication) ||
    resource.resourceType;

  const detail =
    (typeof resource.valueString === 'string' ? resource.valueString : '') ||
    (resource.dosageInstruction as Array<{ text?: string }> | undefined)?.[0]?.text ||
    resource.evidence?.[0]?.detail?.[0]?.display ||
    codeableText(resource.clinicalStatus) ||
    '';

  const icdCode = (resource.code as { coding?: Array<{ code?: string }> } | undefined)?.coding?.[0]?.code;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.12, duration: 0.4, ease: 'easeOut' }}
      className="rounded-xl p-4 mb-3"
      style={{ background: config.bg, border: `1px solid ${config.border}` }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Icon className="w-4 h-4" style={{ color: config.iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="uppercase tracking-wider"
              style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: config.iconColor }}
            >
              {config.label}
            </span>
            {icdCode && (
              <span
                className="px-1.5 py-0.5 rounded-md"
                style={{ fontFamily: 'Inter, monospace', fontSize: '10px', background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
              >
                {icdCode}
              </span>
            )}
          </div>
          <p className="text-sm font-medium leading-snug" style={{ fontFamily: 'Instrument Sans, sans-serif', color: '#ffffff' }}>
            {title}
          </p>
          {detail && (
            <p className="text-xs mt-1 leading-relaxed" style={{ fontFamily: 'Instrument Sans, sans-serif', color: 'rgba(255,255,255,0.55)' }}>
              {detail}
            </p>
          )}
          {resource._sourceRef && (
            <div className="mt-2 flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full" style={{ background: '#FC5D36' }} />
              <span style={{ fontFamily: 'Inter, monospace', fontSize: '11px', color: '#FC5D36' }}>
                {resource._sourceRef}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
