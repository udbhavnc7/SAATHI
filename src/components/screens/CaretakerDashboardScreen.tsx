import React, { useState } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Bell,
  AlertTriangle,
  Pill,
  Activity,
  Phone,
  PhoneCall,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  LogOut,
  Sparkles,
  Heart,
  Calendar,
  Send,
  Check,
} from 'lucide-react';
import { useAdaptive } from '../../context/AdaptiveContext';
import { CaregiverAlert, Medication } from '../../types';

interface CaretakerDashboardScreenProps {
  onSwitchToPatientView: (patientId?: string) => void;
  onLogoutToSplash: () => void;
}

export const CaretakerDashboardScreen: React.FC<CaretakerDashboardScreenProps> = ({
  onSwitchToPatientView,
  onLogoutToSplash,
}) => {
  const {
    caretakerSession,
    setCaretakerSession,
    allAvailableProfiles,
    linkedPatients,
    selectedCaretakerPatientCode,
    setSelectedCaretakerPatientCode,
    caregiverAlerts,
    dismissCaregiverAlert,
    medications,
    toggleMedication,
    refillMedication,
    triggerTestLowSupplyAlert,
    switchProfileById,
    theme,
    toggleTheme,
  } = useAdaptive();

  const [newPatientIdInput, setNewPatientIdInput] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');
  const [filterUrgency, setFilterUrgency] = useState<'all' | 'urgent' | 'warning' | 'low_supply'>('all');
  const [simulatedReminderSent, setSimulatedReminderSent] = useState<string | null>(null);

  // Link a new patient ID
  const handleLinkPatient = (e: React.FormEvent) => {
    e.preventDefault();
    const code = newPatientIdInput.trim().toUpperCase();
    if (!code) return;

    if (caretakerSession.linkedPatientCodes.map((c) => c.toUpperCase()).includes(code)) {
      setLinkError(`Patient ID ${code} is already linked to your console.`);
      setTimeout(() => setLinkError(''), 3000);
      return;
    }

    setCaretakerSession((prev) => ({
      ...prev,
      linkedPatientCodes: [...prev.linkedPatientCodes, code],
    }));

    setNewPatientIdInput('');
    setLinkSuccess(`Patient ${code} linked successfully! Monitoring active.`);
    setTimeout(() => setLinkSuccess(''), 3500);
  };

  // Unlink patient
  const handleUnlinkPatient = (codeToUnlink: string) => {
    setCaretakerSession((prev) => ({
      ...prev,
      linkedPatientCodes: prev.linkedPatientCodes.filter(
        (c) => c.toUpperCase() !== codeToUnlink.toUpperCase()
      ),
    }));
    if (selectedCaretakerPatientCode.toUpperCase() === codeToUnlink.toUpperCase()) {
      setSelectedCaretakerPatientCode('all');
    }
  };

  // Filter alerts by patient and urgency
  const filteredAlerts = caregiverAlerts.filter((alert) => {
    // Patient filter
    if (selectedCaretakerPatientCode !== 'all') {
      const matchCode = (alert.patientCode || '').toUpperCase() === selectedCaretakerPatientCode.toUpperCase();
      const matchId = (alert.patientId || '').toUpperCase() === selectedCaretakerPatientCode.toUpperCase();
      if (!matchCode && !matchId) return false;
    }

    // Urgency filter
    if (filterUrgency === 'urgent') return alert.urgency === 'urgent';
    if (filterUrgency === 'warning') return alert.urgency === 'warning';
    if (filterUrgency === 'low_supply') return alert.type === 'low_supply';

    return true;
  });

  const activeCount = caregiverAlerts.filter((a) => a.status === 'active').length;
  const lowSupplyCount = caregiverAlerts.filter((a) => a.type === 'low_supply' && a.status === 'active').length;

  const handleSendReminder = (patientName: string, medName?: string) => {
    const text = medName
      ? `Reminder sent to ${patientName}: "Please take your dose of ${medName}."`
      : `Daily recovery check-in reminder dispatched to ${patientName}.`;
    setSimulatedReminderSent(text);
    setTimeout(() => setSimulatedReminderSent(null), 4000);
  };

  return (
    <div id="caretaker-dashboard" className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b bg-white/90 dark:bg-[#0f172a]/95 dark:border-slate-800 border-slate-200 backdrop-blur-md py-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black border border-slate-800 p-1 flex items-center justify-center shadow-md">
              <img src="/logo.png" alt="SAATHI Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white">
                  SAATHI
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                  Caretaker Central
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Logged in as <strong className="text-slate-800 dark:text-slate-200">{caretakerSession.name}</strong> ({caretakerSession.relationship})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Patient Interface Button */}
            <button
              type="button"
              onClick={() => onSwitchToPatientView()}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 fill-white" />
              <span className="hidden sm:inline">Open Patient View</span>
            </button>

            {/* Logout / Switch Role */}
            <button
              type="button"
              onClick={onLogoutToSplash}
              title="Return to Splash / Role Selection"
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Switch Role</span>
            </button>
          </div>
        </div>
      </header>

      {/* Reminder Notification Banner */}
      {simulatedReminderSent && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md animate-fade-in">
          <div className="max-w-7xl mx-auto flex items-center gap-2 w-full">
            <Check className="w-4 h-4" />
            <span>{simulatedReminderSent}</span>
          </div>
        </div>
      )}

      {/* Main Body */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1">
        {/* Patient Connection Bar */}
        <section className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span>Connected Patients ({caretakerSession.linkedPatientCodes.length})</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter any Patient ID to instantly receive their real-time medicine inventory, low-supply alerts, and symptom triage logs.
              </p>
            </div>

            {/* Add Patient ID Form */}
            <form onSubmit={handleLinkPatient} className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={newPatientIdInput}
                  onChange={(e) => setNewPatientIdInput(e.target.value.toUpperCase())}
                  placeholder="Enter Patient ID (e.g. PAT-8492)"
                  className="pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold uppercase text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 w-56 sm:w-64"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Link Patient</span>
              </button>
            </form>
          </div>

          {linkError && (
            <p className="text-xs text-rose-500 dark:text-rose-400 font-semibold">{linkError}</p>
          )}
          {linkSuccess && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>{linkSuccess}</span>
            </p>
          )}

          {/* Linked Patients Selector Chips */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <button
              type="button"
              onClick={() => setSelectedCaretakerPatientCode('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCaretakerPatientCode === 'all'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>All Linked Patients</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {caretakerSession.linkedPatientCodes.length}
              </span>
            </button>

            {caretakerSession.linkedPatientCodes.map((code) => {
              const matchedProfile = allAvailableProfiles.find(
                (p) => (p.patientCode || p.id).toUpperCase() === code.toUpperCase()
              );
              const isSelected = selectedCaretakerPatientCode.toUpperCase() === code.toUpperCase();
              const patientAlerts = caregiverAlerts.filter(
                (a) => (a.patientCode || a.patientId || '').toUpperCase() === code.toUpperCase() && a.status === 'active'
              );

              return (
                <div
                  key={code}
                  className={`inline-flex items-center rounded-xl border text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-900 dark:text-purple-300 ring-2 ring-purple-500/30'
                      : 'bg-white dark:bg-slate-850 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedCaretakerPatientCode(code)}
                    className="px-3 py-1.5 flex items-center gap-2 cursor-pointer"
                  >
                    <span>{matchedProfile ? matchedProfile.name : `Patient ${code}`}</span>
                    <span className="font-mono text-[10px] px-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {code}
                    </span>
                    {patientAlerts.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] animate-pulse">
                        {patientAlerts.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUnlinkPatient(code)}
                    title={`Unlink ${code}`}
                    className="px-1.5 py-1 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-r-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Stats & Quick Actions Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Alert Signals</span>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-black ${activeCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                {activeCount}
              </span>
              <Bell className="w-5 h-5 text-rose-500" />
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Pending review</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Low Medication Supply</span>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-black ${lowSupplyCount > 0 ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>
                {lowSupplyCount}
              </span>
              <Pill className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Refill notifications dispatched</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Connected Patient Pool</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {caretakerSession.linkedPatientCodes.length}
              </span>
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Monitored 24/7</span>
          </div>

          {/* Real-Time Test Alert Runner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-emerald-50 dark:from-purple-950/30 dark:to-emerald-950/30 border border-purple-200 dark:border-purple-800/50 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-purple-900 dark:text-purple-300">Live Connection Test</span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                Simulate a patient running low on medication supply.
              </p>
            </div>
            <button
              type="button"
              onClick={() => triggerTestLowSupplyAlert()}
              className="mt-2 w-full py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulate Low Supply Alert</span>
            </button>
          </div>
        </div>

        {/* Two-Column Section: Alerts Feed & Medication Inventory */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Alerts Feed (2 Columns) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Real-Time Notifications & Triage Feed</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedCaretakerPatientCode === 'all'
                    ? 'Showing alerts across all linked patients'
                    : `Filtered to patient ${selectedCaretakerPatientCode}`}
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilterUrgency('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    filterUrgency === 'all'
                      ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFilterUrgency('low_supply')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    filterUrgency === 'low_supply'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Low Supply ({lowSupplyCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterUrgency('urgent')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    filterUrgency === 'urgent'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Urgent
                </button>
              </div>
            </div>

            {/* Alert Cards List */}
            {filteredAlerts.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="font-black text-sm text-slate-900 dark:text-white">All Clear</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  No active warnings or low-supply alerts for the selected filter. Live monitoring active.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAlerts.map((alert) => {
                  const isLowSupply = alert.type === 'low_supply';
                  const isUrgent = alert.urgency === 'urgent';

                  return (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-2xl border transition-all shadow-xs ${
                        alert.status === 'acknowledged'
                          ? 'bg-slate-100/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-70'
                          : isLowSupply
                          ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/60'
                          : isUrgent
                          ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-700/60'
                          : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isLowSupply
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                              : isUrgent
                              ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                              : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                          }`}>
                            {isLowSupply ? (
                              <Pill className="w-5 h-5" />
                            ) : isUrgent ? (
                              <ShieldAlert className="w-5 h-5" />
                            ) : (
                              <Activity className="w-5 h-5" />
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {alert.title}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {alert.patientName} ({alert.patientCode || alert.patientId})
                              </span>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                {alert.timestamp}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                              {alert.detail}
                            </p>

                            {alert.feedbackNote && (
                              <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold italic">
                                Action note: {alert.feedbackNote}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 uppercase tracking-wider ${
                          alert.status === 'acknowledged'
                            ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            : alert.urgency === 'urgent'
                            ? 'bg-rose-600 text-white'
                            : 'bg-amber-500 text-white'
                        }`}>
                          {alert.status === 'acknowledged' ? 'Handled' : alert.urgency}
                        </span>
                      </div>

                      {/* Caretaker Action Buttons */}
                      <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap text-xs">
                        <div className="flex items-center gap-2">
                          {isLowSupply && (
                            <button
                              type="button"
                              onClick={() => {
                                if (alert.medicationName) {
                                  refillMedication(alert.medicationName, 30);
                                  dismissCaregiverAlert(alert.id);
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Order +30 Refill</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleSendReminder(alert.patientName, alert.medicationName)}
                            className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Send className="w-3 h-3 text-purple-500" />
                            <span>Remind Patient</span>
                          </button>

                          <a
                            href="tel:+919820144521"
                            className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold flex items-center gap-1 transition-colors"
                          >
                            <PhoneCall className="w-3 h-3 text-emerald-500" />
                            <span>Call</span>
                          </a>
                        </div>

                        {alert.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => dismissCaregiverAlert(alert.id)}
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                          >
                            Dismiss / Acknowledge
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Monitored Patient Medication Inventory */}
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Pill className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Medication Supply Tracker</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Dosage balance & push notification threshold monitor.
                </p>
              </div>

              <div className="space-y-3">
                {medications.map((med) => {
                  const remaining = med.remainingSupply ?? 15;
                  const total = med.totalCount ?? 30;
                  const percent = Math.min(100, Math.round((remaining / total) * 100));
                  const isLow = remaining <= (med.refillThreshold ?? 5);

                  return (
                    <div
                      key={med.id}
                      className={`p-3 rounded-xl border text-xs space-y-2 ${
                        isLow
                          ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {med.name}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                            {med.dosage} · {med.timing}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isLow
                            ? 'bg-amber-500 text-white font-extrabold animate-pulse'
                            : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {isLow ? '⚠️ LOW SUPPLY' : 'In Stock'}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1">
                          <span>Remaining Supply</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {remaining} / {total} {med.unit || 'tablets'} ({percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isLow
                                ? 'bg-amber-500'
                                : percent > 50
                                ? 'bg-emerald-500'
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Quick Refill Button */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-400">
                          Alert at: ≤{med.refillThreshold ?? 5} {med.unit || 'tablets'}
                        </span>
                        <button
                          type="button"
                          onClick={() => refillMedication(med.id, 30)}
                          className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-[11px] font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                        >
                          +30 Refill
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
