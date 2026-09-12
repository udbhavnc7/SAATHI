import React from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Users,
  ShieldCheck,
  Clock,
  Heart,
  FileText
} from 'lucide-react';
import { useAdaptive } from '../context/AdaptiveContext';

interface PitchStep {
  title: string;
  badge: string;
  targetProfileId: string;
  description: string;
  keyHighlight: string;
  actionHint: string;
}

const PITCH_STEPS: PitchStep[] = [
  {
    title: '1. Elder Mode: Radical Simplicity',
    badge: 'Step 1 of 5 · Demo Flow',
    targetProfileId: 'elder-ramesh',
    description:
      'Experience SATHI through Ramesh (68, post-op CABG day 5). Notice the enlarged font (≥20px), high contrast, 5-capped navigation, voice read-aloud, and 1-tap "I TOOK IT" button.',
    keyHighlight: 'Constraint: Zero cognitive overload. Healthcare adapts to the elder.',
    actionHint: 'Tap "I TOOK IT" on morning medicine or use the voice button.',
  },
  {
    title: '2. Standard / Adult Recovery Mode',
    badge: 'Step 2 of 5 · Demo Flow',
    targetProfileId: 'adult-priya',
    description:
      'Same underlying data model, but now showing Priya (36). The interface smoothly adapts to show adherence progress rings, prescribed recovery tasks (incentive spirometer), and full appointment details.',
    keyHighlight: 'Differentiator: One platform, multiple presentation densities.',
    actionHint: 'Check the spirometer task or view upcoming follow-up with Dr. Sunita.',
  },
  {
    title: '3. Guardian / Pediatric Profile',
    badge: 'Step 3 of 5 · Demo Flow',
    targetProfileId: 'child-aarav',
    description:
      'Pediatric asthma & immunization care for Aarav (7). Operated strictly by guardian Priya with mandatory dosage verification guardrails and no unsupervised conversational models.',
    keyHighlight: 'Guardrail: Mandatory adult confirmation prevents unverified pediatric dosing.',
    actionHint: 'Observe the clear pediatric guardrail badge on medications.',
  },
  {
    title: '4. Caregiver Triage & Anti-Fatigue Loop',
    badge: 'Step 4 of 5 · Demo Flow',
    targetProfileId: 'caregiver-ananya',
    description:
      'Ananya (Daughter & RN) answers "Who needs my attention, and why?". She sees only active alerts (🔴 Urgent, 🟡 Attention) and can mark non-critical alerts as "Not Urgent", tuning the threshold to prevent alert fatigue.',
    keyHighlight: 'Clinically credible: Solves the #1 cause of caregiver burnout (alert fatigue).',
    actionHint: 'Tap "Mark Not Urgent" on a caregiver alert to see threshold adaptation.',
  },
  {
    title: '5. Deterministic Safety & 1-Page Doctor Brief',
    badge: 'Step 5 of 5 · Demo Flow',
    targetProfileId: 'elder-ramesh',
    description:
      'Safety triage evaluates symptoms against clinical post-op rules with transparent "Why was this flagged?" provenance. Follow-up visits generate a structured 1-page clinical summary ready for printing.',
    keyHighlight: 'Trust: AI understands & simplifies; deterministic code protects.',
    actionHint: 'Navigate to "Memory & Docs" -> "Doctor Summary" to see the printable brief.',
  },
];

export const PitchGuideDrawer: React.FC = () => {
  const {
    isPitchGuideOpen,
    setIsPitchGuideOpen,
    pitchStep,
    setPitchStep,
    switchProfileById,
    profile,
  } = useAdaptive();

  if (!isPitchGuideOpen) {
    return (
      <button
        id="open-pitch-guide-button"
        type="button"
        onClick={() => setIsPitchGuideOpen(true)}
        className="fixed bottom-20 right-4 z-40 px-3.5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-full shadow-lg border border-emerald-600/40 flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
      >
        <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
        <span className="hidden sm:inline">Interactive Pitch & Demo Guide</span>
        <span className="sm:hidden">Demo Guide</span>
      </button>
    );
  }

  const currentStep = PITCH_STEPS[pitchStep];

  const handleApplyStep = (stepIndex: number) => {
    setPitchStep(stepIndex);
    switchProfileById(PITCH_STEPS[stepIndex].targetProfileId);
  };

  return (
    <div
      id="pitch-guide-modal"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 animate-fade-in"
    >
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scale-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                {currentStep.badge}
              </span>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {currentStep.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPitchGuideOpen(false)}
            aria-label="Close Pitch Guide"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer min-h-[36px]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {PITCH_STEPS.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyStep(idx)}
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                pitchStep === idx
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Step {idx + 1}
            </button>
          ))}
        </div>

        {/* Description Body */}
        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2.5">
          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
            {currentStep.description}
          </p>

          <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs space-y-1">
            <span className="font-extrabold text-emerald-900 block flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Architectural Rationale:</span>
            </span>
            <p className="text-slate-700">{currentStep.keyHighlight}</p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 pt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
            <span>Interactive action: {currentStep.actionHint}</span>
          </div>
        </div>

        {/* Navigation & Controls */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            disabled={pitchStep === 0}
            onClick={() => handleApplyStep(pitchStep - 1)}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer min-h-[40px]"
          >
            Previous
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                switchProfileById(currentStep.targetProfileId);
                setIsPitchGuideOpen(false);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer min-h-[40px]"
            >
              Test In UI
            </button>

            {pitchStep < PITCH_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => handleApplyStep(pitchStep + 1)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs cursor-pointer flex items-center gap-1.5 min-h-[40px]"
              >
                <span>Next Step</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsPitchGuideOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs cursor-pointer min-h-[40px]"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
