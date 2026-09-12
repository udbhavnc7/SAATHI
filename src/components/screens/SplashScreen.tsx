import React, { useState } from 'react';
import {
  Heart,
  ShieldCheck,
  User,
  Users,
  BellRing,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
  Pill,
  Activity,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import { useAdaptive } from '../../context/AdaptiveContext';
import { SaathiLogo } from '../ui/SaathiLogo';

interface SplashScreenProps {
  onEnterPatient: () => void;
  onEnterCaretaker: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onEnterPatient,
  onEnterCaretaker,
}) => {
  const {
    profile,
    availableProfiles,
    switchProfileById,
    theme,
    toggleTheme,
  } = useAdaptive();

  const [copiedId, setCopiedId] = useState(false);

  const handleCopyPatientId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(profile.patientCode || 'PAT-8492');
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white selection:bg-emerald-500 selection:text-white p-4 sm:p-8">
      {/* Top Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-black border border-slate-800 p-1 flex items-center justify-center shadow-lg">
            <img src="/logo.png" alt="SAATHI Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-black tracking-tight text-lg sm:text-xl text-white">SAATHI</h1>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Adaptive Health</p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
        >
          {theme === 'dark' ? (
            <>
              <Moon className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Obsidian Dark</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Daylight</span>
            </>
          )}
        </button>
      </header>

      {/* Hero Content */}
      <main className="max-w-4xl w-full mx-auto my-auto py-8 text-center space-y-8 animate-fade-in">
        {/* Brand Spotlight */}
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center p-3 rounded-3xl bg-black/60 border border-slate-800/80 shadow-2xl backdrop-blur-md ring-1 ring-white/10">
            <img
              src="/logo.png"
              alt="SAATHI Calligraphic Logo"
              className="h-20 sm:h-28 w-auto object-contain px-4 py-1 filter drop-shadow-[0_0_20px_rgba(255,255,255,0.25)]"
            />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
              Healthcare That Adapts To <span className="text-emerald-400">You</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-300 font-normal">
              Voice-first companion for recovery at home. Medication inventory tracking, automatic low-supply alerts, and real-time synchronization between patients and caretakers.
            </p>
          </div>
        </div>

        {/* Dual Mode Portals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left pt-2">
          {/* Patient Mode Card */}
          <div
            onClick={onEnterPatient}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onEnterPatient()}
            className="group relative rounded-3xl p-6 sm:p-7 bg-slate-900/90 hover:bg-slate-850 border-2 border-emerald-500/40 hover:border-emerald-400 transition-all duration-300 shadow-xl cursor-pointer hover:shadow-emerald-950/40 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <User className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Primary Mode
                </span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-emerald-300 transition-colors">
                  Patient Portal
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                  Daily recovery routines, voice journal, scheduled dose reminders, and medication supply tracking.
                </p>
              </div>

              {/* Current Active Patient Info & Shareable ID */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Active Profile:</span>
                  <select
                    value={profile.id}
                    onChange={(e) => switchProfileById(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:border-emerald-500"
                  >
                    {availableProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.patientCode || p.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Your Patient ID for Caretaker:</span>
                    <span className="font-mono font-black text-sm text-emerald-400">
                      {profile.patientCode || 'PAT-8492'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPatientId}
                    className="px-2.5 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-300 flex items-center gap-1 transition-colors"
                  >
                    {copiedId ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy ID</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-6 flex items-center justify-between text-emerald-400 font-bold text-sm">
              <span>Open Patient Dashboard</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>

          {/* Caretaker Mode Card */}
          <div
            onClick={onEnterCaretaker}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onEnterCaretaker()}
            className="group relative rounded-3xl p-6 sm:p-7 bg-slate-900/90 hover:bg-slate-850 border-2 border-purple-500/40 hover:border-purple-400 transition-all duration-300 shadow-xl cursor-pointer hover:shadow-purple-950/40 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  Monitor & Triage
                </span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-purple-300 transition-colors">
                  Caretaker Portal
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                  Manage multiple patients, receive instant push notifications for low medication stock, symptom alerts, and safety escalations.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-purple-300 font-semibold">
                  <BellRing className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Real-Time Push Alerts & Sync</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Connect by entering your patient's ID (e.g. <span className="text-emerald-400 font-mono font-bold">PAT-8492</span>). Add as many patients as you care for.
                </p>
              </div>
            </div>

            <div className="pt-6 flex items-center justify-between text-purple-400 font-bold text-sm">
              <span>Open Caretaker Console</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>SAATHI · Clinical Triage & Medication Companion · DPDP Compliant</span>
        </div>
        <div>
          <span>Press any card to proceed · Switch anytime</span>
        </div>
      </footer>
    </div>
  );
};
