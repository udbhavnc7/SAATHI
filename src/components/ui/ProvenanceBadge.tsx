import React from 'react';
import { CheckCircle2, Clock, ShieldCheck, UserCheck, HeartPulse } from 'lucide-react';
import { ProvenanceTag } from '../../types';

interface ProvenanceBadgeProps {
  tag: ProvenanceTag;
  className?: string;
  size?: 'sm' | 'md';
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({ tag, className = '', size = 'sm' }) => {
  const isSmall = size === 'sm';

  switch (tag) {
    case 'doctor_confirmed':
      return (
        <span
          id={`provenance-${tag}`}
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 ${
            isSmall ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
          } ${className}`}
        >
          <ShieldCheck className={isSmall ? 'w-3 h-3 text-emerald-600' : 'w-4 h-4 text-emerald-600'} />
          <span>✓ Doctor-confirmed</span>
        </span>
      );

    case 'discharge_plan':
      return (
        <span
          id={`provenance-${tag}`}
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-sky-50 text-sky-800 border border-sky-200/80 ${
            isSmall ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
          } ${className}`}
        >
          <HeartPulse className={isSmall ? 'w-3 h-3 text-sky-600' : 'w-4 h-4 text-sky-600'} />
          <span>✓ Hospital Discharge Plan</span>
        </span>
      );

    case 'user_confirmed':
      return (
        <span
          id={`provenance-${tag}`}
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-teal-50 text-teal-800 border border-teal-200/80 ${
            isSmall ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
          } ${className}`}
        >
          <CheckCircle2 className={isSmall ? 'w-3 h-3 text-teal-600' : 'w-4 h-4 text-teal-600'} />
          <span>✓ You Confirmed</span>
        </span>
      );

    case 'caregiver_added':
      return (
        <span
          id={`provenance-${tag}`}
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 ${
            isSmall ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
          } ${className}`}
        >
          <UserCheck className={isSmall ? 'w-3 h-3 text-amber-600' : 'w-4 h-4 text-amber-600'} />
          <span>✓ Caregiver-added</span>
        </span>
      );

    case 'ai_extracted':
      return (
        <span
          id={`provenance-${tag}`}
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-amber-100 text-amber-900 border border-amber-300 ${
            isSmall ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
          } ${className}`}
        >
          <Clock className={isSmall ? 'w-3 h-3 text-amber-700 animate-pulse' : 'w-4 h-4 text-amber-700 animate-pulse'} />
          <span>⏳ AI-extracted — needs confirmation</span>
        </span>
      );

    case 'patient_reported':
    default:
      return (
        <span
          id={`provenance-${tag}`}
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${
            isSmall ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
          } ${className}`}
        >
          <CheckCircle2 className={isSmall ? 'w-3 h-3 text-slate-500' : 'w-4 h-4 text-slate-500'} />
          <span>✓ Patient-reported</span>
        </span>
      );
  }
};
