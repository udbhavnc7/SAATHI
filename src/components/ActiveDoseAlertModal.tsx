import React, { useState, useEffect } from 'react';
import {
  Bell,
  Check,
  Clock,
  Volume2,
  X,
  ShieldCheck,
  Pill,
  Timer,
  AlertCircle,
} from 'lucide-react';
import { useAdaptive } from '../context/AdaptiveContext';
import { ProvenanceBadge } from './ui/ProvenanceBadge';

export const ActiveDoseAlertModal: React.FC = () => {
  const {
    activeTriggeredAlert,
    dismissActiveAlert,
    snoozeActiveAlert,
    markDoseAsTakenFromAlert,
    profile,
    speakText,
  } = useAdaptive();

  const [snoozeMinutes, setSnoozeMinutes] = useState<number>(10);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600);

  const isElder = profile.ageBand === 'elder';

  useEffect(() => {
    if (!activeTriggeredAlert?.snoozedUntil) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.round((activeTriggeredAlert.snoozedUntil! - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTriggeredAlert?.snoozedUntil]);

  if (!activeTriggeredAlert) return null;

  const isSnoozed = activeTriggeredAlert.status === 'snoozed' && activeTriggeredAlert.snoozedUntil && activeTriggeredAlert.snoozedUntil > Date.now();

  const handleListen = () => {
    speakText(
      `Reminder: It is time to take your dose of ${activeTriggeredAlert.medicationName}, ${activeTriggeredAlert.dosage}. ${activeTriggeredAlert.instructions}`
    );
  };

  return (
    <div
      id="active-dose-alert-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="active-dose-alert-title"
    >
      <div
        id="active-dose-alert-card"
        className={`w-full max-w-lg rounded-3xl shadow-2xl border-4 overflow-hidden transition-all animate-scale-in ${
          isElder
            ? 'bg-slate-900 border-amber-400 text-white p-6 sm:p-8'
            : 'bg-white border-emerald-600 text-slate-900 p-6'
        }`}
      >
        {/* Header with Pulsing Bell */}
        <div className="flex items-start justify-between gap-3 border-b pb-4 mb-4 border-slate-200/20">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center relative shadow-lg ${
                isElder ? 'bg-amber-400 text-slate-950' : 'bg-emerald-600 text-white'
              }`}
            >
              <Bell className="w-6 h-6 animate-bounce" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
              </span>
            </div>

            <div>
              <span
                className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 ${
                  isElder
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Scheduled Dose Due Now ({activeTriggeredAlert.dosageTime})
              </span>
              <h2
                id="active-dose-alert-title"
                className={`font-black tracking-tight mt-1 ${isElder ? 'text-2xl text-amber-300' : 'text-xl text-slate-900'}`}
              >
                Time to Take Medication
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={dismissActiveAlert}
            aria-label="Dismiss alert"
            className={`p-2 rounded-xl cursor-pointer transition-colors ${
              isElder ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Snooze countdown notification if snoozed */}
        {isSnoozed && (
          <div className="mb-4 p-3 bg-amber-500/20 border border-amber-400/50 rounded-2xl flex items-center justify-between text-xs text-amber-300 font-bold">
            <span className="flex items-center gap-2">
              <Timer className="w-4 h-4 animate-spin" />
              Snoozed: Alarm will re-trigger in {Math.floor(secondsRemaining / 60)}m {secondsRemaining % 60}s
            </span>
            <button
              type="button"
              onClick={() => snoozeActiveAlert(activeTriggeredAlert.id, 0)}
              className="underline text-amber-200 hover:text-white"
            >
              Alert Now
            </button>
          </div>
        )}

        {/* Medicine Detail Box */}
        <div
          className={`p-5 rounded-2xl border space-y-3 mb-5 ${
            isElder
              ? 'bg-slate-800/80 border-slate-700'
              : 'bg-emerald-50/60 border-emerald-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Pill className={`w-5 h-5 ${isElder ? 'text-amber-400' : 'text-emerald-700'}`} />
                <h3 className={`font-black ${isElder ? 'text-2xl text-white' : 'text-xl text-slate-950'}`}>
                  {activeTriggeredAlert.medicationName}
                </h3>
              </div>
              {activeTriggeredAlert.genericName && (
                <p className={`text-xs mt-0.5 font-semibold ${isElder ? 'text-slate-300' : 'text-slate-600'}`}>
                  ({activeTriggeredAlert.genericName})
                </p>
              )}
            </div>

            <span
              className={`px-3 py-1 rounded-xl font-black text-sm shrink-0 ${
                isElder ? 'bg-amber-400 text-slate-950' : 'bg-emerald-700 text-white'
              }`}
            >
              {activeTriggeredAlert.dosage}
            </span>
          </div>

          {/* Instructions */}
          <div
            className={`p-3.5 rounded-xl border text-sm font-bold flex items-start gap-2.5 ${
              isElder
                ? 'bg-slate-900/90 border-amber-400/30 text-amber-200'
                : 'bg-white border-emerald-300 text-emerald-950'
            }`}
          >
            <span className="text-lg shrink-0">👉</span>
            <div>
              <span>{activeTriggeredAlert.instructions}</span>
              {activeTriggeredAlert.purpose && (
                <p className="text-xs font-normal opacity-85 mt-1">
                  Purpose: {activeTriggeredAlert.purpose}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <ProvenanceBadge tag={activeTriggeredAlert.provenance || 'doctor_confirmed'} size="sm" />
            <button
              type="button"
              onClick={handleListen}
              className={`flex items-center gap-1.5 font-bold cursor-pointer underline ${
                isElder ? 'text-amber-300 hover:text-amber-200' : 'text-emerald-800 hover:text-emerald-900'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span>Listen to Dose Instructions</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {/* 1. Mark as Taken Button */}
          <button
            type="button"
            onClick={() => markDoseAsTakenFromAlert(activeTriggeredAlert.id)}
            className={`w-full py-4 px-6 rounded-2xl font-black text-lg sm:text-xl shadow-xl cursor-pointer flex items-center justify-center gap-3 transition-transform active:scale-[0.98] min-h-[56px] ${
              isElder
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white'
            }`}
          >
            <Check className="w-6 h-6 stroke-[3]" />
            <span>I HAVE TAKEN THIS DOSE</span>
          </button>

          {/* 2. Snooze & Dismiss Row */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => snoozeActiveAlert(activeTriggeredAlert.id, snoozeMinutes)}
              className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm border flex items-center justify-center gap-2 cursor-pointer min-h-[46px] transition-colors ${
                isElder
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-amber-300'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
            >
              <Timer className="w-4 h-4" />
              <span>Snooze ({snoozeMinutes}m)</span>
            </button>

            <button
              type="button"
              onClick={dismissActiveAlert}
              className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm border flex items-center justify-center gap-2 cursor-pointer min-h-[46px] transition-colors ${
                isElder
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-400'
                  : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-600'
              }`}
            >
              <X className="w-4 h-4" />
              <span>Dismiss / Later</span>
            </button>
          </div>
        </div>

        {/* Footer Guidance */}
        <div className="mt-4 pt-3 border-t border-slate-200/20 flex items-center justify-between text-[11px] opacity-75">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Adherence logged to SATHI recovery timeline
          </span>
          <span>Source: {activeTriggeredAlert.sourceDocument || 'Discharge Plan'}</span>
        </div>
      </div>
    </div>
  );
};
