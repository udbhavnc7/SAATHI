import React, { useState } from 'react';
import {
  Heart,
  Pill,
  Calendar,
  MessageSquare,
  AlertTriangle,
  Users,
  ShieldAlert,
  Clock,
  Activity,
  FileText,
  Sparkles,
  ChevronDown,
  Globe,
  X,
  ShieldCheck,
  Baby,
  Mic,
  Headphones,
  Moon,
  Sun,
  Eye,
  Copy,
  Check,
  ArrowRightLeft,
} from 'lucide-react';
import { useAdaptive } from '../context/AdaptiveContext';
import { TodayScreen } from './screens/TodayScreen';
import { MedicinesScreen } from './screens/MedicinesScreen';
import { SymptomsScreen } from './screens/SymptomsScreen';
import { AskSathiScreen } from './screens/AskSathiScreen';
import { TimelineDocsScreen } from './screens/TimelineDocsScreen';
import { SplashScreen } from './screens/SplashScreen';
import { CaretakerDashboardScreen } from './screens/CaretakerDashboardScreen';
import { SaathiLogo } from './ui/SaathiLogo';
import { EmergencyModal } from './EmergencyModal';
import { CareCircleModal } from './CareCircleModal';
import { PitchGuideDrawer } from './PitchGuideDrawer';
import { VoiceHealthLogModal } from './VoiceHealthLogModal';
import { VoiceGuidedOnboardingModal } from './VoiceGuidedOnboardingModal';
import { QuickAlertModal } from './QuickAlertModal';
import { ActiveDoseAlertModal } from './ActiveDoseAlertModal';
import { AppLanguage } from '../types';

export const AdaptiveShell: React.FC = () => {
  const {
    appMode,
    setAppMode,
    profile,
    availableProfiles,
    switchProfileById,
    urgencyState,
    openEmergencyModal,
    caregiverAlerts,
    language,
    setLanguage,
    theme,
    toggleTheme,
    isHighContrastDark,
    lastFeedbackNotice,
    clearFeedbackNotice,
    activeLowSupplyNotice,
    dismissLowSupplyNotice,
    refillMedication,
    medications,
    openVoiceLogger,
    openOnboarding,
  } = useAdaptive();

  const [activeTab, setActiveTab] = useState<string>('today');
  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isCareCircleOpen, setIsCareCircleOpen] = useState(false);
  const [themeToast, setThemeToast] = useState<string | null>(null);
  const [copiedPatientId, setCopiedPatientId] = useState(false);

  // If in Splash Mode, show Splash Screen
  if (appMode === 'splash') {
    return (
      <SplashScreen
        onEnterPatient={() => setAppMode('patient')}
        onEnterCaretaker={() => setAppMode('caretaker')}
      />
    );
  }

  // If in Caretaker Mode, show Caretaker Dashboard
  if (appMode === 'caretaker') {
    return (
      <CaretakerDashboardScreen
        onSwitchToPatientView={() => setAppMode('patient')}
        onLogoutToSplash={() => setAppMode('splash')}
      />
    );
  }

  const handleToggleTheme = () => {
    toggleTheme();
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setThemeToast(
      nextTheme === 'dark'
        ? 'Obsidian Dark Mode active: Glare-free high-contrast palette for eye strain & migraine relief.'
        : 'Daylight Mode active: Standard high-readability healthcare layout.'
    );
    setTimeout(() => {
      setThemeToast(null);
    }, 4000);
  };

  const handleCopyPatientId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(profile.patientCode || 'PAT-8492');
      setCopiedPatientId(true);
      setTimeout(() => setCopiedPatientId(false), 2000);
    }
  };

  const isElder = profile.ageBand === 'elder';
  const isCaregiver = profile.role === 'caregiver';
  const isMinor = profile.isMinor;

  const activeAlertCount = caregiverAlerts.filter((a) => a.status === 'active').length;

  const languages: { code: AppLanguage; label: string; native: string }[] = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
    { code: 'es', label: 'Spanish', native: 'Español' },
  ];

  return (
    <div
      id="sathi-root-app"
      className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
        isElder
          ? 'bg-amber-50/40 text-slate-950 text-lg'
          : 'bg-slate-50/80 text-slate-900 text-sm'
      }`}
    >
      {/* WCAG 2.1 AAA Skip to Main Content Link */}
      <a
        href="#sathi-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-emerald-800 focus:text-white focus:font-bold focus:rounded-xl focus:shadow-xl focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Screen Reader ARIA Live Region for Triage State and Accessibility Theme */}
      <div role="status" aria-live="polite" className="sr-only">
        {theme === 'dark'
          ? 'High-contrast dark mode active. Glare reduced for migraine and eye comfort. '
          : 'Daylight mode active. '}
        {urgencyState === 'escalate'
          ? 'Urgent safety escalation alert active. Check caregiver and clinical instructions.'
          : urgencyState === 'monitor'
          ? 'Health status in monitor state. Logged symptoms are being tracked.'
          : 'Health status normal.'}
      </div>

      {/* Top Application Bar */}
      <header
        id="sathi-header"
        className={`sticky top-0 z-30 border-b backdrop-blur-md transition-all ${
          isElder
            ? 'bg-white/95 dark:bg-[#0f172a]/95 border-emerald-900/20 py-3 shadow-xs'
            : 'bg-white/90 dark:bg-[#0f172a]/95 border-slate-200 dark:border-slate-800 py-2.5 shadow-xs'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <SaathiLogo size={isElder ? 'md' : 'sm'} showSubtitle={false} />
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                  isElder
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                    : isMinor
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                    : isCaregiver
                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                    : 'bg-sky-100 dark:bg-sky-950 text-sky-900 dark:text-sky-300 border border-sky-300 dark:border-sky-700'
                }`}>
                  {isElder ? 'Elder Mode' : isMinor ? 'Guardian Pediatric' : isCaregiver ? 'Caregiver View' : 'Patient Recovery'}
                </span>

                {/* Patient ID Tag with 1-click Copy for Caretaker */}
                <button
                  type="button"
                  onClick={handleCopyPatientId}
                  title="Copy your Patient ID to share with your caretaker"
                  className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  {copiedPatientId ? (
                    <>
                      <Check className="w-2.5 h-2.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">ID Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" />
                      <span>ID: {profile.patientCode || 'PAT-8492'}</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Healthcare that adapts to the person, not the other way around
              </p>
            </div>
          </div>

          {/* Action Header Items */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Multilingual Selector */}
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                aria-label="Select Language"
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer min-h-[38px]"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-700" />
                <span>{languages.find((l) => l.code === language)?.native}</span>
              </button>

              {isLangMenuOpen && (
                <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 animate-scale-in">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setLanguage(lang.code);
                        setIsLangMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs font-bold hover:bg-emerald-50 cursor-pointer ${
                        language === lang.code ? 'text-emerald-800 bg-emerald-50/70' : 'text-slate-700'
                      }`}
                    >
                      {lang.native} ({lang.label})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Care Circle & DPDP Consent Modal Button */}
            <button
              id="header-care-circle-button"
              type="button"
              onClick={() => setIsCareCircleOpen(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hidden sm:flex items-center gap-1.5 cursor-pointer min-h-[38px]"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Care Circle</span>
            </button>

            {/* Switch to Caretaker Portal Button */}
            <button
              id="header-caretaker-switch-button"
              type="button"
              onClick={() => setAppMode('caretaker')}
              title="Switch to Caretaker Monitoring Hub"
              className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900 border border-purple-300 dark:border-purple-700 rounded-xl text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5 cursor-pointer min-h-[38px] transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="hidden sm:inline">Caretaker Mode</span>
            </button>

            {/* Global Theme Toggle: Light vs High-Contrast Dark Mode for Eye Strain & Migraine */}
            <button
              id="header-theme-toggle-button"
              type="button"
              role="switch"
              aria-checked={theme === 'dark'}
              onClick={handleToggleTheme}
              aria-label={
                theme === 'dark'
                  ? 'Switch to daylight theme'
                  : 'Switch to high-contrast dark theme for eye strain and migraine relief'
              }
              title={
                theme === 'dark'
                  ? 'High-Contrast Dark Mode active (glare-free obsidian palette for photophobia & eye strain). Click for Daylight mode.'
                  : 'High-Contrast Dark Mode: Reduces glare, harsh contrast, and blue-light emission for eye strain and migraine relief.'
              }
              className={`font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-xs select-none ${
                isElder
                  ? 'px-3.5 py-2 text-sm min-h-[48px]'
                  : 'px-2.5 py-1.5 text-xs min-h-[38px]'
              } ${
                theme === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-600 ring-1 ring-amber-400/30'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {theme === 'dark' ? (
                <>
                  <Moon className={`w-4 h-4 text-amber-300 shrink-0 ${isElder ? 'w-5 h-5' : ''}`} />
                  <span className="hidden sm:inline font-bold">Dark (Eye Relief)</span>
                  <span className="sr-only">High-contrast dark mode active</span>
                </>
              ) : (
                <>
                  <Sun className={`w-4 h-4 text-amber-500 shrink-0 ${isElder ? 'w-5 h-5' : ''}`} />
                  <span className="hidden sm:inline font-bold">Light</span>
                  <span className="sr-only">Light daylight mode active</span>
                </>
              )}
            </button>

            {/* Live Persona Switcher */}
            <div className="relative">
              <button
                id="persona-switcher-button"
                type="button"
                onClick={() => setIsPersonaMenuOpen(!isPersonaMenuOpen)}
                className={`flex items-center gap-2 rounded-xl border transition-all cursor-pointer select-none font-bold ${
                  isElder
                    ? 'px-4 py-2 bg-emerald-50 border-emerald-600 text-emerald-950 text-sm min-h-[48px]'
                    : 'px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800 text-xs min-h-[38px]'
                }`}
              >
                <Users className="w-4 h-4 text-emerald-700" />
                <span className="hidden sm:inline">Persona:</span>
                <span className="font-extrabold text-emerald-900 truncate max-w-[120px] sm:max-w-none">
                  {profile.name.split(' ')[0]} ({isElder ? 'Elder' : isMinor ? 'Child' : isCaregiver ? 'Caregiver' : 'Adult'})
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {isPersonaMenuOpen && (
                <div
                  id="persona-dropdown-menu"
                  className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-scale-in"
                >
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Demonstrate Adaptive Architecture:
                  </div>
                  {availableProfiles.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        switchProfileById(p.id);
                        setIsPersonaMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 hover:bg-emerald-50 transition-colors flex items-center justify-between cursor-pointer ${
                        profile.id === p.id ? 'bg-emerald-50/70 font-bold text-emerald-900' : 'text-slate-700'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {p.name} {p.ageBand === 'elder' ? '🧓' : p.isMinor ? '👶' : p.role === 'caregiver' ? '🩺' : '🧑'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {p.ageBand === 'elder'
                            ? 'Elder: Large touch, 5-capped nav, voice-first'
                            : p.isMinor
                            ? 'Child: Guardian-operated, dosage verification guardrail'
                            : p.role === 'caregiver'
                            ? 'Caregiver: Triage, attention alerts & feedback'
                            : 'Adult: Complete recovery schedule & docs'}
                        </p>
                      </div>
                      {profile.id === p.id && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Voice-Guided Onboarding Walkthrough Trigger */}
            <button
              id="header-voice-tour-button"
              type="button"
              onClick={() => openOnboarding(0)}
              aria-label="Open Voice-Guided Onboarding Walkthrough"
              title="Voice-guided tour of symptom logging and OCR receipt scanning"
              className={`font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                isElder
                  ? 'px-3 py-2 bg-teal-800 hover:bg-teal-900 text-white text-sm min-h-[48px]'
                  : 'px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 border-teal-300 text-teal-950 text-xs min-h-[38px]'
              }`}
            >
              <Headphones className={`w-4 h-4 shrink-0 ${isElder ? 'text-white' : 'text-teal-700'}`} />
              <span className="hidden md:inline">Voice Tour</span>
            </button>

            {/* Voice Health Journal Trigger */}
            <button
              id="header-voice-journal-button"
              type="button"
              onClick={() => openVoiceLogger('daily_update')}
              aria-label="Open Voice Health Journal"
              title="Record spoken health update or symptom"
              className={`font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                isElder
                  ? 'px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-sm min-h-[48px]'
                  : 'px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-950 text-xs min-h-[38px]'
              }`}
            >
              <Mic className={`w-4 h-4 shrink-0 ${isElder ? 'text-white animate-pulse' : 'text-emerald-700'}`} />
              <span className="hidden sm:inline">Voice Log</span>
            </button>

            {/* Emergency SOS Button */}
            <button
              id="header-sos-button"
              type="button"
              onClick={openEmergencyModal}
              aria-label="Open Emergency Card"
              className={`font-black rounded-xl cursor-pointer transition-transform active:scale-95 flex items-center gap-1.5 shadow-sm ${
                isElder
                  ? 'px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-base min-h-[48px]'
                  : 'px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs min-h-[38px]'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-white animate-pulse" />
              <span>SOS</span>
            </button>
          </div>
        </div>
      </header>

      {/* Low Medication Supply Global Banner Alert */}
      {activeLowSupplyNotice && (
        <div className="bg-amber-500 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between gap-3 shadow-md animate-fade-in">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse" />
            <span className="flex-1">
              ⚠️ <strong>Low Supply Push Alert:</strong> Only {activeLowSupplyNotice.remainingSupply} {activeLowSupplyNotice.unit} of {activeLowSupplyNotice.medicationName} remaining. Please reorder from pharmacy.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const med = medications.find((m) => m.name === activeLowSupplyNotice.medicationName);
                  if (med) refillMedication(med.id, 30);
                  dismissLowSupplyNotice();
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                +30 Refill
              </button>
              <button
                type="button"
                onClick={dismissLowSupplyNotice}
                className="p-1 hover:bg-amber-600 rounded-lg cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Caregiver Feedback Loop Notice (Addresses Alert Fatigue) */}
      {lastFeedbackNotice && (
        <div className="bg-emerald-800 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-3 shadow-inner animate-fade-in">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{lastFeedbackNotice}</span>
          </div>
          <button
            type="button"
            onClick={clearFeedbackNotice}
            className="p-1 hover:bg-emerald-900 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Accessibility Theme Switch Toast / Banner */}
      {themeToast && (
        <div
          role="status"
          aria-live="polite"
          className="bg-slate-900 text-slate-100 border-b border-slate-700 px-4 py-2 text-xs font-semibold flex items-center justify-between gap-3 shadow-md animate-fade-in"
        >
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-amber-300 shrink-0" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="flex-1">{themeToast}</span>
            <button
              type="button"
              onClick={() => setThemeToast(null)}
              aria-label="Dismiss theme notification"
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main id="sathi-main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
        {activeTab === 'today' && <TodayScreen onNavigate={(t) => setActiveTab(t)} />}
        {activeTab === 'medicines' && <MedicinesScreen />}
        {activeTab === 'symptoms' && <SymptomsScreen />}
        {activeTab === 'timeline' && <TimelineDocsScreen />}
        {activeTab === 'ask' && <AskSathiScreen onNavigate={(t) => setActiveTab(t)} />}
      </main>

      {/* Adaptive Bottom / Mobile Navigation */}
      <nav
        id="sathi-bottom-nav"
        aria-label="Main Navigation"
        className={`sticky bottom-0 z-30 border-t bg-white/95 backdrop-blur-md transition-all ${
          isElder ? 'py-2.5 border-emerald-900/20' : 'py-2 border-slate-200'
        }`}
      >
        <div className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto px-3 flex items-center justify-around">
          {/* Elder Nav: Exactly 5 items capped per PRD Section 26 */}
          {isElder ? (
            <>
              <button
                id="elder-nav-today"
                type="button"
                onClick={() => setActiveTab('today')}
                className={`flex flex-col items-center gap-1 font-bold transition-colors cursor-pointer min-h-[48px] px-2 py-1 ${
                  activeTab === 'today' ? 'text-emerald-800 font-extrabold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Clock className="w-6 h-6" />
                <span className="text-xs">Today</span>
              </button>

              <button
                id="elder-nav-medicines"
                type="button"
                onClick={() => setActiveTab('medicines')}
                className={`flex flex-col items-center gap-1 font-bold transition-colors cursor-pointer min-h-[48px] px-2 py-1 ${
                  activeTab === 'medicines' ? 'text-emerald-800 font-extrabold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Pill className="w-6 h-6" />
                <span className="text-xs">Medicines</span>
              </button>

              <button
                id="elder-nav-appointments"
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`flex flex-col items-center gap-1 font-bold transition-colors cursor-pointer min-h-[48px] px-2 py-1 ${
                  activeTab === 'timeline' ? 'text-emerald-800 font-extrabold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Calendar className="w-6 h-6" />
                <span className="text-xs">Visits</span>
              </button>

              <button
                id="elder-nav-ask"
                type="button"
                onClick={() => setActiveTab('ask')}
                className={`flex flex-col items-center gap-1 font-bold transition-colors cursor-pointer min-h-[48px] px-2 py-1 ${
                  activeTab === 'ask' ? 'text-emerald-800 font-extrabold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare className="w-6 h-6" />
                <span className="text-xs">Ask SAATHI</span>
              </button>

              <button
                id="elder-nav-emergency"
                type="button"
                onClick={openEmergencyModal}
                className="flex flex-col items-center gap-1 text-rose-600 font-black transition-colors cursor-pointer min-h-[48px] px-2 py-1"
              >
                <ShieldAlert className="w-6 h-6" />
                <span className="text-xs">Emergency</span>
              </button>
            </>
          ) : isCaregiver ? (
            /* Caregiver Nav */
            <>
              <button
                id="caregiver-nav-today"
                type="button"
                onClick={() => setActiveTab('today')}
                className={`flex flex-col items-center gap-1 font-semibold transition-colors cursor-pointer min-h-[44px] px-3 py-1 ${
                  activeTab === 'today' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Activity className="w-5 h-5" />
                <span className="text-[11px]">Triage {activeAlertCount > 0 && `(${activeAlertCount})`}</span>
              </button>

              <button
                id="caregiver-nav-meds"
                type="button"
                onClick={() => setActiveTab('medicines')}
                className={`flex flex-col items-center gap-1 font-semibold transition-colors cursor-pointer min-h-[44px] px-3 py-1 ${
                  activeTab === 'medicines' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Pill className="w-5 h-5" />
                <span className="text-[11px]">Adherence Log</span>
              </button>

              <button
                id="caregiver-nav-symptoms"
                type="button"
                onClick={() => setActiveTab('symptoms')}
                className={`flex flex-col items-center gap-1 font-semibold transition-colors cursor-pointer min-h-[44px] px-3 py-1 ${
                  activeTab === 'symptoms' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
                <span className="text-[11px]">Safety Triage</span>
              </button>

              <button
                id="caregiver-nav-brief"
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`flex flex-col items-center gap-1 font-semibold transition-colors cursor-pointer min-h-[44px] px-3 py-1 ${
                  activeTab === 'timeline' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span className="text-[11px]">Doctor Brief</span>
              </button>

              <button
                id="caregiver-nav-ask"
                type="button"
                onClick={() => setActiveTab('ask')}
                className={`flex flex-col items-center gap-1 font-semibold transition-colors cursor-pointer min-h-[44px] px-3 py-1 ${
                  activeTab === 'ask' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                <span className="text-[11px]">Ask SAATHI</span>
              </button>
            </>
          ) : (
            /* Standard / Adult & Guardian Mode */
            <>
              <button
                id="adult-nav-today"
                type="button"
                onClick={() => setActiveTab('today')}
                className={`flex flex-col items-center gap-1 font-semibold transition-colors cursor-pointer min-h-[44px] px-2.5 py-1 ${
                  activeTab === 'today' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Clock className="w-5 h-5" />
                <span className="text-[11px]">Today</span>
              </button>

              <button
                id="adult-nav-medicines"
                type="button"
                onClick={() => setActiveTab('medicines')}
                className={`flex flex-col items-center gap-1 font-semibold transition-colors cursor-pointer min-h-[44px] px-2.5 py-1 ${
                  activeTab === 'medicines' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Pill className="w-5 h-5" />
                <span className="text-[11px]">{isMinor ? 'Pediatric Meds' : 'Medicines'}</span>
              </button>

              <button
                id="adult-nav-symptoms"
                type="button"
                onClick={() => setActiveTab('symptoms')}
                className={`flex flex-col items-center gap-1 font-semibold transition-colors cursor-pointer min-h-[44px] px-2.5 py-1 ${
                  activeTab === 'symptoms' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Activity className="w-5 h-5" />
                <span className="text-[11px]">Symptoms</span>
              </button>

              <button
                id="adult-nav-timeline"
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`flex flex-col items-center gap-1 font-semibold transition-colors cursor-pointer min-h-[44px] px-2.5 py-1 ${
                  activeTab === 'timeline' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span className="text-[11px]">Memory & Docs</span>
              </button>

              <button
                id="adult-nav-ask"
                type="button"
                onClick={() => setActiveTab('ask')}
                className={`flex flex-col items-center gap-1 font-semibold transition-colors cursor-pointer min-h-[44px] px-2.5 py-1 ${
                  activeTab === 'ask' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                <span className="text-[11px]">Ask SAATHI</span>
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Floating Voice Journal Quick Action Button */}
      <button
        id="floating-voice-journal-fab"
        type="button"
        onClick={() => openVoiceLogger('daily_update')}
        aria-label="Speak health update or symptom"
        title="Voice Health Journal (Web Speech API)"
        className={`fixed bottom-20 right-4 sm:right-6 z-30 rounded-full shadow-2xl flex items-center gap-2 font-bold cursor-pointer transition-all hover:scale-105 active:scale-95 ${
          isElder
            ? 'p-4 bg-emerald-800 hover:bg-emerald-900 text-white ring-4 ring-emerald-200 text-base'
            : 'p-3.5 bg-emerald-700 hover:bg-emerald-800 text-white ring-2 ring-emerald-300 text-xs'
        }`}
      >
        <Mic className={isElder ? 'w-6 h-6 animate-pulse' : 'w-5 h-5 animate-pulse'} />
        <span className="hidden md:inline font-bold">Voice Journal</span>
      </button>

      {/* Voice Health Journal Modal (Web Speech API -> Persisted Text Logs) */}
      <VoiceHealthLogModal />

      {/* Emergency Modal Card */}
      <EmergencyModal />

      {/* Quick Alert SOS SMS & Direct Call Modal */}
      <QuickAlertModal />

      {/* Scheduled Medication Local Notification Alert Modal */}
      <ActiveDoseAlertModal />

      {/* Care Circle & Consent Modal */}
      <CareCircleModal
        isOpen={isCareCircleOpen}
        onClose={() => setIsCareCircleOpen(false)}
      />

      {/* Voice-Guided Onboarding Walkthrough Modal */}
      <VoiceGuidedOnboardingModal
        onNavigateToTab={(tab) => setActiveTab(tab)}
      />

      {/* Interactive Pitch & Demo Walkthrough Guide */}
      <PitchGuideDrawer />
    </div>
  );
};
