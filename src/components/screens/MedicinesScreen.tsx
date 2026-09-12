import React, { useState } from 'react';
import {
  Pill,
  Check,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Info,
  CheckCircle2,
  RotateCcw,
  Search,
  Sparkles,
  X,
  Receipt,
  Scan,
  Headphones,
  Bell,
  BellRing,
  BellOff,
  Volume2,
  VolumeX,
  Play,
  Settings2,
} from 'lucide-react';
import { useAdaptive } from '../../context/AdaptiveContext';
import { ProvenanceBadge } from '../ui/ProvenanceBadge';
import { VoiceReadButton } from '../ui/VoiceButton';
import { PrescriptionOcrScanner } from '../prescription/PrescriptionOcrScanner';

interface InteractionResult {
  safe: boolean;
  totalChecked: number;
  interactions: Array<{
    drugA: string;
    drugB: string;
    severity: 'severe' | 'moderate' | 'minor';
    mechanism: string;
    recommendation: string;
  }>;
  provenance: string;
}

export const MedicinesScreen: React.FC = () => {
  const {
    profile,
    medications,
    toggleMedication,
    undoMedication,
    medicationAdherenceRate,
    openOnboarding,
    doseAlerts,
    notificationPermission,
    requestNotificationPermission,
    toggleDoseAlert,
    toggleAlertSound,
    updateDoseAlertTime,
    triggerTestAlert,
  } = useAdaptive();
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'morning' | 'afternoon' | 'evening'>('all');
  const [isCheckerOpen, setIsCheckerOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [showScheduleManager, setShowScheduleManager] = useState(true);
  const [candidateDrug, setCandidateDrug] = useState('');
  const [interactionResult, setInteractionResult] = useState<InteractionResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const isElder = profile.ageBand === 'elder';

  const filteredMeds = filterPeriod === 'all'
    ? medications
    : medications.filter((m) => m.period === filterPeriod);

  const takenCount = medications.filter((m) => m.takenToday).length;

  const handleRunInteractionCheck = async (testDrug?: string) => {
    const drugToTest = testDrug !== undefined ? testDrug : candidateDrug;
    setIsChecking(true);
    try {
      const res = await fetch('/api/check-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentMedications: medications.map((m) => m.name),
          candidateMedication: drugToTest,
          isMinor: profile.isMinor,
        }),
      });
      const data = await res.json();
      setInteractionResult(data);
    } catch (err) {
      console.error('Failed to run interaction check:', err);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div id="medicines-screen" className="space-y-6 pb-16 animate-fade-in">
      {/* Header Banner */}
      <div className={`p-6 rounded-3xl ${isElder ? 'bg-emerald-800 text-white border-2 border-emerald-900' : 'bg-white border border-slate-200 shadow-xs'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${isElder ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-800'}`}>
                Discharge Plan Regimen
              </span>
              <span className={`text-xs ${isElder ? 'text-emerald-200' : 'text-slate-500'}`}>
                Verified by {profile.doctorName}
              </span>
            </div>
            <h1 className={`font-black tracking-tight mt-1 ${isElder ? 'text-3xl' : 'text-2xl text-slate-900'}`}>
              Prescribed Medications
            </h1>
            <p className={`mt-1 font-medium ${isElder ? 'text-lg text-emerald-100' : 'text-xs text-slate-500'}`}>
              {takenCount} of {medications.length} doses taken today ({medicationAdherenceRate}% adherence rate).
            </p>
          </div>

          <div className={`p-4 rounded-2xl flex items-center gap-4 ${isElder ? 'bg-white/10' : 'bg-slate-50 border border-slate-200'}`}>
            <div className="text-center">
              <span className={`block text-xs font-bold uppercase ${isElder ? 'text-emerald-200' : 'text-slate-500'}`}>Adherence</span>
              <span className={`text-3xl font-black ${isElder ? 'text-white' : 'text-emerald-700'}`}>{medicationAdherenceRate}%</span>
            </div>
            <div className="w-px h-10 bg-slate-300/40" />
            <div className="text-center">
              <span className={`block text-xs font-bold uppercase ${isElder ? 'text-emerald-200' : 'text-slate-500'}`}>Pending</span>
              <span className={`text-3xl font-black ${isElder ? 'text-amber-300' : 'text-amber-600'}`}>{medications.length - takenCount}</span>
            </div>
          </div>
        </div>

        {/* Drug Safety / Interaction Guardrail Banner */}
        <div className={`mt-4 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${isElder ? 'bg-white/15 text-emerald-50' : 'bg-emerald-50 text-emerald-900 border border-emerald-200'}`}>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              <strong>Deterministic Pharmacology Guardrail:</strong> Active regimen verified against clinical interaction database.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              id="medicines-scan-ocr-button"
              type="button"
              onClick={() => setIsOcrModalOpen(true)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                isElder
                  ? 'bg-emerald-700 text-white hover:bg-emerald-600 min-h-[44px]'
                  : 'bg-emerald-700 text-white hover:bg-emerald-800 min-h-[36px]'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Scan Prescription Receipt (OCR)</span>
            </button>
            <button
              id="medicines-how-ocr-works-btn"
              type="button"
              onClick={() => openOnboarding(2)}
              title="Voice-guided walkthrough on how OCR pre-processing and receipt scanning work"
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors border ${
                isElder
                  ? 'bg-teal-900/60 border-teal-400 text-teal-100 hover:bg-teal-800 min-h-[44px]'
                  : 'bg-teal-50 border-teal-200 text-teal-900 hover:bg-teal-100 min-h-[36px]'
              }`}
            >
              <Headphones className="w-3.5 h-3.5 text-teal-600" />
              <span>How OCR Works (Voice Guide)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCheckerOpen(true);
                handleRunInteractionCheck("");
              }}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                isElder ? 'bg-white text-emerald-900 hover:bg-emerald-100 min-h-[44px]' : 'bg-slate-800 text-white hover:bg-slate-900 min-h-[36px]'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Verify OTC Drug</span>
            </button>
          </div>
        </div>

        {profile.isMinor && (
          <div className="mt-2 p-3 bg-amber-50 rounded-xl border border-amber-300 text-amber-950 text-xs flex items-center gap-2">
            <span className="font-extrabold text-amber-800">⚠️ Pediatric Guardrail:</span>
            <span>All doses require manual guardian confirmation by {profile.guardianName}. Auto-adjust or self-administration is disabled.</span>
          </div>
        )}
      </div>

      {/* Interactive Clinical Drug Interaction Modal */}
      {isCheckerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Clinical Drug-Interaction Engine</h3>
                  <p className="text-xs text-slate-500">Cross-analyzing with confirmed regimen ({medications.length} items)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckerOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Test a candidate OTC medication, supplement, or new pill:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={candidateDrug}
                    onChange={(e) => setCandidateDrug(e.target.value)}
                    placeholder="e.g. Ibuprofen, Paracetamol, Contrast dye, Ramipril..."
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600 font-medium"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRunInteractionCheck();
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRunInteractionCheck()}
                    disabled={isChecking}
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {isChecking ? 'Checking...' : 'Check'}
                  </button>
                </div>

                {/* Quick test pills */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-400 font-medium">Quick Test:</span>
                  {['Ibuprofen 400mg', 'Paracetamol 500mg', 'Radiocontrast Dye', 'Potassium Supplement'].map((drug) => (
                    <button
                      key={drug}
                      type="button"
                      onClick={() => {
                        setCandidateDrug(drug);
                        handleRunInteractionCheck(drug);
                      }}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700 rounded-md cursor-pointer"
                    >
                      {drug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Results View */}
              {interactionResult && (
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">
                      Evaluated Drugs ({interactionResult.totalChecked} items)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {interactionResult.provenance}
                    </span>
                  </div>

                  {interactionResult.safe ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 text-xs flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-emerald-900">Zero Clinical Contraindications Detected</p>
                        <p className="text-emerald-800 mt-0.5">
                          The evaluated medication has no documented adverse metabolic or bleeding interactions with your current confirmed recovery regimen.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {interactionResult.interactions.map((inter, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-2xl border text-xs ${
                            inter.severity === 'severe'
                              ? 'bg-rose-50 border-rose-200 text-rose-950'
                              : 'bg-amber-50 border-amber-200 text-amber-950'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <AlertTriangle className={`w-4 h-4 ${inter.severity === 'severe' ? 'text-rose-600' : 'text-amber-600'}`} />
                            <span className="font-black uppercase tracking-wider text-[11px]">
                              {inter.severity} Interaction: {inter.drugA.toUpperCase()} + {inter.drugB.toUpperCase()}
                            </span>
                          </div>
                          <p className="font-semibold">{inter.mechanism}</p>
                          <div className="mt-2 pt-2 border-t border-rose-200/60 font-medium">
                            <strong>Recommended Action:</strong> {inter.recommendation}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Always verify any new medication with your doctor or pharmacist.</span>
              <button
                type="button"
                onClick={() => setIsCheckerOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prescription Receipt OCR Modal */}
      {isOcrModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Prescription Receipt OCR &amp; Medicine Extractor
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOcrModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(92vh-80px)]">
              <PrescriptionOcrScanner onConfirmSuccess={() => setIsOcrModalOpen(false)} />
            </div>
          </div>
        </div>
      )}


      {/* Medication Dosage Scheduling & Local Notification Alerts Section */}
      <div
        id="medication-dose-alerts-manager"
        className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5 text-emerald-700 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Scheduled Dosage Alerts &amp; Audio Chimes
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800">
                  {doseAlerts.filter((a) => a.enabled).length} Active Alerts
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Parsed from your doctor's prescriptions. Triggers local browser notifications, audio chimes, and voice guidance at dosage times.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            {notificationPermission !== 'granted' && (
              <button
                type="button"
                onClick={requestNotificationPermission}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                title="Enable browser notifications for background reminders"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Enable Desktop Push</span>
              </button>
            )}

            <button
              id="test-dose-alert-button"
              type="button"
              onClick={() => triggerTestAlert()}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Test the dosage reminder alert modal, chime sound, and speech prompt"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Test Dosage Alert</span>
            </button>

            <button
              type="button"
              onClick={() => setShowScheduleManager(!showScheduleManager)}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title={showScheduleManager ? 'Hide Alerts Schedule' : 'Show Alerts Schedule'}
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showScheduleManager && (
          <div className="space-y-3">
            {doseAlerts.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No active dosage alerts scheduled. Scan a prescription receipt above to auto-generate alerts.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {doseAlerts.map((alert) => {
                  const isTaken = alert.status === 'taken';
                  const isSnoozed = alert.status === 'snoozed';

                  return (
                    <div
                      key={alert.id}
                      id={`dose-alert-card-${alert.id}`}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                        !alert.enabled
                          ? 'bg-slate-50 border-slate-200 opacity-60'
                          : isTaken
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : isSnoozed
                          ? 'bg-amber-50/60 border-amber-200'
                          : 'bg-white border-slate-200 shadow-2xs hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">
                              {alert.medicationName}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {alert.dosage}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {alert.instructions || alert.purpose}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            isTaken
                              ? 'bg-emerald-100 text-emerald-800'
                              : isSnoozed
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {isTaken ? `✓ Taken (${alert.lastTakenAt || 'Today'})` : isSnoozed ? '⏳ Snoozed' : '⏰ Scheduled'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100/80 text-xs">
                        {/* Time Editor */}
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <input
                            type="time"
                            value={alert.dosageTime24}
                            onChange={(e) => updateDoseAlertTime(alert.id, e.target.value)}
                            className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                            title="Click to adjust scheduled alert time"
                          />
                          <span className="text-[11px] text-slate-500 capitalize">
                            · {alert.period}
                          </span>
                        </div>

                        {/* Toggles and test button */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleAlertSound(alert.id)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              alert.soundEnabled
                                ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                : 'text-slate-400 bg-slate-100 hover:bg-slate-200'
                            }`}
                            title={alert.soundEnabled ? 'Audio Chime Enabled' : 'Audio Chime Muted'}
                          >
                            {alert.soundEnabled ? (
                              <Volume2 className="w-3.5 h-3.5" />
                            ) : (
                              <VolumeX className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleDoseAlert(alert.id)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              alert.enabled
                                ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                : 'text-slate-400 bg-slate-100 hover:bg-slate-200'
                            }`}
                            title={alert.enabled ? 'Alert Notification Active' : 'Alert Disabled'}
                          >
                            {alert.enabled ? (
                              <Bell className="w-3.5 h-3.5" />
                            ) : (
                              <BellOff className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => triggerTestAlert(alert.id)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                            title="Test this specific alert right now"
                          >
                            Test
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter Tabs (non-elder) */}
      {!isElder && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(['all', 'morning', 'afternoon', 'evening'] as const).map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => setFilterPeriod(period)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-colors cursor-pointer min-h-[40px] ${
                filterPeriod === period
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {period === 'all' ? 'All Day (5)' : `${period}`}
            </button>
          ))}
        </div>
      )}

      {/* Medication Cards List */}
      <div className="space-y-4">
        {filteredMeds.map((med) => {
          if (isElder) {
            // Elder High-Legibility Card
            return (
              <div
                key={med.id}
                id={`elder-med-card-${med.id}`}
                className={`p-6 rounded-3xl border-3 transition-all ${
                  med.takenToday
                    ? 'bg-emerald-50/70 border-emerald-400 text-emerald-950'
                    : 'bg-white border-slate-300 text-slate-900 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xl font-black text-emerald-800 flex items-center gap-1.5 mb-1">
                      <Clock className="w-5 h-5" /> {med.timing}
                    </span>
                    <h2 className="text-3xl font-black text-slate-950">{med.name}</h2>
                    <p className="text-xl font-bold text-emerald-700 mt-0.5">{med.dosage}</p>
                  </div>
                  <VoiceReadButton
                    text={`${med.name}, ${med.dosage}. Scheduled for ${med.timing}. ${med.instructions}. Purpose: ${med.purpose}`}
                    className="p-3 bg-slate-100 rounded-xl"
                    label="Listen"
                  />
                </div>

                <div className="mt-4 p-4 rounded-2xl bg-slate-100/90 text-slate-900 text-lg font-medium border border-slate-200">
                  👉 {med.instructions}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <ProvenanceBadge tag={med.provenance} size="md" />
                  <span className="text-sm font-semibold text-slate-500">Purpose: {med.purpose}</span>

                  {(() => {
                    const linked = doseAlerts.find(
                      (a) =>
                        a.medicationId === med.id ||
                        a.medicationName.toLowerCase().includes(med.name.toLowerCase()) ||
                        med.name.toLowerCase().includes(a.medicationName.toLowerCase())
                    );
                    if (!linked) return null;
                    return (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100/90 text-emerald-900 text-sm font-extrabold border border-emerald-300">
                        <Bell className="w-4 h-4 text-emerald-800" />
                        <span>Alert: {linked.dosageTime}</span>
                        {linked.soundEnabled && <Volume2 className="w-3.5 h-3.5 text-emerald-700" />}
                      </span>
                    );
                  })()}
                </div>

                <div className="mt-5">
                  {med.takenToday ? (
                    <div className="flex items-center justify-between p-4 bg-emerald-100 rounded-2xl text-emerald-950 font-bold text-lg">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-6 h-6 text-emerald-700" />
                        Taken at {med.takenAt || 'Scheduled time'}
                      </span>
                      <button
                        type="button"
                        onClick={() => undoMedication(med.id)}
                        className="text-xs text-slate-700 underline font-medium cursor-pointer"
                      >
                        Undo
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleMedication(med.id)}
                      className="w-full py-4 px-6 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xl shadow-md cursor-pointer flex items-center justify-center gap-3 transition-transform active:scale-[0.99] min-h-[58px]"
                    >
                      <Check className="w-6 h-6 stroke-[3]" />
                      <span>MARK AS TAKEN</span>
                    </button>
                  )}
                </div>
              </div>
            );
          }

          // Standard / Adult View
          return (
            <div
              key={med.id}
              id={`adult-med-card-${med.id}`}
              className={`p-5 rounded-2xl border transition-all ${
                med.takenToday
                  ? 'bg-slate-50/80 border-slate-200 text-slate-600'
                  : 'bg-white border-slate-200 hover:border-emerald-500 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className={`p-3 rounded-xl ${med.takenToday ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-800'}`}>
                    <Pill className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-base font-bold ${med.takenToday ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {med.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold">
                        {med.dosage}
                      </span>
                      <ProvenanceBadge tag={med.provenance} size="sm" />
                    </div>

                    <p className="text-xs text-slate-600 mt-1">{med.instructions}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1.5">
                      <span className="flex items-center gap-1 font-semibold text-emerald-700">
                        <Clock className="w-3.5 h-3.5" /> {med.timing}
                      </span>
                      <span>·</span>
                      <span>Role: {med.purpose}</span>

                      {(() => {
                        const linked = doseAlerts.find(
                          (a) =>
                            a.medicationId === med.id ||
                            a.medicationName.toLowerCase().includes(med.name.toLowerCase()) ||
                            med.name.toLowerCase().includes(a.medicationName.toLowerCase())
                        );
                        if (!linked) return null;
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                            <Bell className="w-3 h-3 text-emerald-600" />
                            <span>Alert: {linked.dosageTime}</span>
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <VoiceReadButton
                    text={`${med.name}, ${med.dosage}. ${med.instructions}`}
                    label="Audio"
                  />

                  {med.takenToday ? (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Taken {med.takenAt ? `(${med.takenAt})` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => undoMedication(med.id)}
                        className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer p-1"
                        title="Undo taken status"
                      >
                        Undo
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleMedication(med.id)}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs min-h-[44px]"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Take Dose</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
