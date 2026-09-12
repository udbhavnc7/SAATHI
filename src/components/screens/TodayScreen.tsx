import React, { useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  Pill,
  Calendar,
  AlertCircle,
  Bell,
  ArrowRight,
  Send,
  Sparkles,
  HeartPulse,
  Activity,
  Check,
  RotateCcw,
  Mic,
  Headphones,
  X,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useAdaptive } from '../../context/AdaptiveContext';
import { ProvenanceBadge } from '../ui/ProvenanceBadge';
import { VoiceReadButton, VoiceInputButton } from '../ui/VoiceButton';
import { analyzeSymptomHistory } from '../../services/predictiveSymptomAnalysis';

interface TodayScreenProps {
  onNavigate: (tab: string) => void;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({ onNavigate }) => {
  const {
    profile,
    symptomLogs,
    medications,
    toggleMedication,
    undoMedication,
    recoveryTasks,
    toggleTask,
    appointments,
    caregiverAlerts,
    dismissAlertNotUrgent,
    acknowledgeAlert,
    medicationAdherenceRate,
    openEmergencyModal,
    openVoiceLogger,
    openOnboarding,
    showOnboardingBanner,
    dismissOnboardingBanner,
    doseAlerts,
    triggerTestAlert,
    snoozeActiveAlert,
  } = useAdaptive();

  const isElder = profile.ageBand === 'elder';
  const isCaregiver = profile.role === 'caregiver';

  const predictiveSummary = useMemo(() => {
    return analyzeSymptomHistory(symptomLogs || []);
  }, [symptomLogs]);

  // Find next pending medication
  const pendingMeds = medications.filter((m) => !m.takenToday);
  const nextMed = pendingMeds[0] || medications[0];
  const completedMeds = medications.filter((m) => m.takenToday);

  // Active caregiver alerts
  const activeAlerts = caregiverAlerts.filter((a) => a.status === 'active');

  // ==========================================
  // 1. CAREGIVER TRIAGE VIEW
  // ==========================================
  if (isCaregiver) {
    return (
      <div id="today-caregiver-view" className="space-y-6 animate-fade-in pb-12">
        {/* Voice-Guided Onboarding Banner for Caregiver */}
        {showOnboardingBanner && (
          <div className="bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 text-white p-4 rounded-2xl border border-teal-700/60 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0 border border-teal-500/40">
                <Headphones className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black">Voice-Guided Walkthrough Available</h4>
                  <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-extrabold">2 min</span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Learn how voice symptom logging and pre-processed OCR receipt scanning work.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openOnboarding(0)}
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-bold rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Start Voice Tour</span>
              </button>
              <button
                type="button"
                onClick={dismissOnboardingBanner}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                title="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Caregiver Header */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-semibold mb-2">
                <Activity className="w-3.5 h-3.5" /> Caregiver Triage Active
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Monitoring: Ramesh Sharma (Father)
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                Post-CABG Recovery Day 5 · {profile.hospitalName}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-slate-400">Medication Adherence</p>
                <p className="text-2xl font-black text-emerald-400">{medicationAdherenceRate}%</p>
              </div>
              <button
                id="caregiver-nudge-button"
                type="button"
                onClick={() => alert(`Sent gentle voice notification to Ramesh's phone: "Time for afternoon rest & medication check."`)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm min-h-[44px]"
              >
                <Send className="w-3.5 h-3.5" /> Send Voice Nudge
              </button>
            </div>
          </div>
        </div>

        {/* Attention Needed Section */}
        <section id="caregiver-attention-section" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <span>{activeAlerts.length > 0 ? `${activeAlerts.length} item(s) need your attention` : 'No urgent alerts right now'}</span>
            </h2>
            <span className="text-xs text-slate-500">Alert Fatigue Safeguard: Feedback Loop Active</span>
          </div>

          {activeAlerts.length > 0 ? (
            <div className="space-y-3">
              {activeAlerts.map((alertItem) => (
                <div
                  key={alertItem.id}
                  id={`caregiver-alert-${alertItem.id}`}
                  className="p-5 rounded-xl border-2 border-rose-200 bg-rose-50/70 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white">
                        {alertItem.urgency === 'urgent' ? '🔴 URGENT' : '🟡 ATTENTION'}
                      </span>
                      <span className="text-xs text-slate-500">{alertItem.timestamp}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{alertItem.title}</h3>
                    <p className="text-sm text-slate-700">{alertItem.detail}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      id={`ack-alert-${alertItem.id}`}
                      type="button"
                      onClick={() => acknowledgeAlert(alertItem.id)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors min-h-[44px]"
                    >
                      Acknowledge
                    </button>
                    <button
                      id={`dismiss-alert-${alertItem.id}`}
                      type="button"
                      onClick={() => dismissAlertNotUrgent(alertItem.id)}
                      title="Direct fix for alert fatigue: tunes rule thresholds"
                      className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium cursor-pointer transition-colors min-h-[44px]"
                    >
                      Mark Not Urgent
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/60 text-emerald-900 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-bold">All Quiet & Under Control</p>
                <p className="text-xs text-emerald-700">Ramesh has taken morning doses and completed incentive spirometry on schedule.</p>
              </div>
            </div>
          )}
        </section>

        {/* Quiet Summary: Everything Else */}
        <section id="caregiver-summary-section" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span>Today's Medication Adherence</span>
              <span className="text-xs font-normal text-slate-500">{completedMeds.length}/{medications.length} taken</span>
            </h3>
            <div className="space-y-2.5">
              {medications.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs">
                  <div>
                    <span className="font-semibold text-slate-900 block">{m.name} ({m.dosage})</span>
                    <span className="text-slate-500">{m.timing} · {m.purpose}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-md font-bold ${m.takenToday ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {m.takenToday ? `Taken at ${m.takenAt || 'On schedule'}` : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span>Upcoming Clinical Milestones</span>
              <button
                type="button"
                onClick={() => onNavigate('timeline')}
                className="text-xs text-emerald-700 font-semibold hover:underline cursor-pointer"
              >
                View Care Plan →
              </button>
            </h3>
            <div className="space-y-3">
              {appointments.slice(0, 2).map((app) => (
                <div key={app.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                    <span>{app.doctorName}</span>
                    <span className="text-emerald-700">{app.date}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{app.purpose}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{app.hospital}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Predictive Symptom Risk Forecast Card */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white border border-teal-800/60 shadow-xs md:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center shrink-0 text-teal-300">
                  <Sparkles className="w-5 h-5 text-teal-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-teal-300">
                      Caregiver Proactive Forecast
                    </span>
                    {predictiveSummary.highestRiskDay && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500 text-white">
                        Upcoming High-Risk Window
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-100 mt-0.5">
                    {predictiveSummary.highestRiskDay ? (
                      <>
                        Projected Risk Day: <strong className="text-teal-200">{predictiveSummary.highestRiskDay.dayOfWeek} ({predictiveSummary.highestRiskDay.dateStr})</strong>
                        {' · '}{predictiveSummary.highestRiskDay.riskScore}% Probability of Recurrence
                      </>
                    ) : (
                      'No elevated symptom recurrence projected for the next 7 days'
                    )}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    {predictiveSummary.overallSummary}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('symptoms')}
                className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <span>Full Risk Analysis</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ==========================================
  // 2. ELDER MODE VIEW (High Contrast, Large Touch, Voice-First, Capped 5-nav)
  // ==========================================
  if (isElder) {
    return (
      <div id="today-elder-view" className="space-y-6 pb-16 animate-fade-in">
        {/* Voice-Guided Onboarding Banner for Elder */}
        {showOnboardingBanner && (
          <div className="bg-white rounded-3xl border-3 border-teal-600 p-5 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                  <Headphones className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    New here? Listen to SATHI Voice Tour
                  </h3>
                  <p className="text-base text-slate-700 font-medium">
                    Learn how to speak your symptoms and scan prescription bills with voice guide.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={dismissOnboardingBanner}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
                title="Dismiss"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={() => openOnboarding(0)}
                className="px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white font-black text-base rounded-2xl cursor-pointer flex items-center gap-2 min-h-[50px] shadow-sm"
              >
                <Headphones className="w-5 h-5" />
                <span>Start Audio Tour</span>
              </button>
              <button
                type="button"
                onClick={() => openOnboarding(1)}
                className="px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-base rounded-2xl cursor-pointer flex items-center gap-2 min-h-[50px]"
              >
                <Mic className="w-5 h-5 text-emerald-700" />
                <span>How Voice Works</span>
              </button>
            </div>
          </div>
        )}

        {/* Elder Warm Greeting Banner */}
        <div className="bg-emerald-800 text-white p-6 rounded-3xl shadow-sm border-2 border-emerald-900">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-medium text-emerald-200">Namaste, Ramesh ji</p>
              <h1 className="text-3xl font-extrabold tracking-tight mt-1">
                What matters right now
              </h1>
              <p className="text-base text-emerald-100 mt-2 font-medium">
                {pendingMeds.length > 0
                  ? `You have ${pendingMeds.length} medicine scheduled for today.`
                  : 'You have taken all your medicines for right now. Well done!'}
              </p>
            </div>
            <VoiceReadButton
              text={`Namaste Ramesh ji. You have ${pendingMeds.length} medicine scheduled for today. Your next medicine is ${nextMed?.name}.`}
              className="bg-white/20 text-white hover:bg-white/30 rounded-2xl p-3"
              label="Listen"
            />
          </div>
        </div>

        {/* Primary Action Card: The "One Next Thing" */}
        <div className="bg-white rounded-3xl border-3 border-emerald-700 shadow-md p-6 space-y-5">
          <div className="flex items-center justify-between">
            <span className="px-4 py-1.5 bg-emerald-100 text-emerald-950 font-extrabold text-base rounded-full border border-emerald-300">
              NEXT SCHEDULED ACTION
            </span>
            <span className="text-xl font-black text-slate-900 flex items-center gap-1.5">
              <Clock className="w-6 h-6 text-emerald-700" />
              {nextMed.timing}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                <Pill className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-950">
                  {nextMed.name}
                </h2>
                <p className="text-xl font-bold text-emerald-800">{nextMed.dosage}</p>
              </div>
            </div>

            <p className="text-lg text-slate-800 font-medium bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              👉 {nextMed.instructions}
            </p>
            <p className="text-sm text-slate-600 font-medium">
              Purpose: {nextMed.purpose}
            </p>
            <ProvenanceBadge tag={nextMed.provenance} size="md" />
          </div>

          {/* Huge Touch Confirmation Buttons */}
          <div className="pt-2 space-y-3">
            {nextMed.takenToday ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-500 text-center space-y-2">
                <p className="text-xl font-black text-emerald-900 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                  You Took This Medicine at {nextMed.takenAt || '8:14 AM'}
                </p>
                <button
                  id="elder-undo-medicine"
                  type="button"
                  onClick={() => undoMedication(nextMed.id)}
                  className="text-sm font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-4 h-4" /> Tap to undo if recorded by mistake
                </button>
              </div>
            ) : (
              <button
                id="elder-take-medicine-button"
                type="button"
                onClick={() => toggleMedication(nextMed.id)}
                className="w-full py-5 px-6 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-extrabold text-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-3 min-h-[64px]"
              >
                <Check className="w-8 h-8 stroke-[3]" />
                <span>I TOOK IT</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                id="elder-remind-button"
                type="button"
                onClick={() => {
                  const targetAlert = doseAlerts.find(
                    (a) =>
                      a.medicationId === nextMed.id ||
                      a.medicationName.toLowerCase().includes(nextMed.name.toLowerCase())
                  ) || doseAlerts[0];
                  if (targetAlert) {
                    snoozeActiveAlert(targetAlert.id, 15);
                  }
                }}
                className="py-4 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-base border-2 border-slate-300 transition-colors cursor-pointer flex items-center justify-center gap-2 min-h-[52px]"
              >
                <Bell className="w-5 h-5 text-slate-700" />
                <span>Remind in 15 Min</span>
              </button>

              <VoiceInputButton
                onTranscript={(txt) => {
                  if (txt.toLowerCase().includes('took') || txt.toLowerCase().includes('done')) {
                    toggleMedication(nextMed.id);
                  } else {
                    onNavigate('ask');
                  }
                }}
                label="Speak to Sathi"
                className="rounded-2xl"
              />
            </div>
          </div>
        </div>

        {/* Elder High-Risk Forecast Notice */}
        {predictiveSummary.highestRiskDay && (
          <div className="bg-amber-50 rounded-3xl border-3 border-amber-300 p-5 space-y-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-amber-800">
                    Recovery Rhythm Forecast
                  </span>
                  <h3 className="text-xl font-black text-slate-900">
                    {predictiveSummary.highestRiskDay.dayOfWeek} is a predicted rest-and-care day
                  </h3>
                </div>
              </div>
              <VoiceReadButton
                text={`Ramesh ji, based on your past week, ${predictiveSummary.highestRiskDay.dayOfWeek} might have some muscle soreness. Take extra rest and keep your warm water handy.`}
                className="bg-amber-200 text-amber-950 hover:bg-amber-300 rounded-2xl p-2.5"
                label="Listen"
              />
            </div>
            <p className="text-base text-slate-700 font-medium">
              Based on your recovery logs, sternal and walking discomfort may peak on{' '}
              <strong>{predictiveSummary.highestRiskDay.dayOfWeek} ({predictiveSummary.highestRiskDay.dateStr})</strong>. Plan lighter steps and have warm sips ready.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('symptoms')}
              className="px-5 py-3 bg-amber-700 hover:bg-amber-800 text-white font-bold text-base rounded-2xl cursor-pointer flex items-center gap-2 min-h-[48px]"
            >
              <span>See 7-Day Care Forecast</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Elder Recovery Tasks: Big and Simple */}
        <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-950 flex items-center gap-2">
              <HeartPulse className="w-6 h-6 text-emerald-700" />
              <span>Today's Recovery Routine</span>
            </h3>
            <span className="text-sm font-bold text-emerald-800">
              {recoveryTasks.filter((t) => t.completed).length}/{recoveryTasks.length} Completed
            </span>
          </div>

          <div className="space-y-3">
            {recoveryTasks.map((task) => (
              <div
                key={task.id}
                id={`elder-task-${task.id}`}
                onClick={() => toggleTask(task.id)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 min-h-[60px] ${
                  task.completed
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-slate-50 border-slate-300 text-slate-900 hover:border-emerald-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                      task.completed
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-400 bg-white'
                    }`}
                  >
                    {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                  <div>
                    <span className="text-lg font-bold block">{task.title}</span>
                    <span className="text-sm text-slate-600 font-medium">{task.time} · {task.instructions}</span>
                  </div>
                </div>

                <span className="text-xs font-bold px-3 py-1 bg-white rounded-lg border border-slate-200 shrink-0">
                  {task.completed ? 'Done ✓' : 'Tap when done'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Elder Voice Health Check-in Card (Web Speech API) */}
        <div className="p-6 bg-emerald-50 rounded-3xl border-2 border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Mic className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-black text-emerald-950">Daily Voice Health Check-in</h3>
              <p className="text-base text-emerald-800 font-medium">
                Speak how you are feeling today, sleep quality, or any discomfort.
              </p>
            </div>
          </div>
          <button
            id="elder-voice-journal-card-btn"
            type="button"
            onClick={() => openVoiceLogger('daily_update')}
            className="px-6 py-4 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-black text-lg rounded-2xl shadow-md cursor-pointer flex items-center justify-center gap-2.5 min-h-[56px] shrink-0"
          >
            <Mic className="w-6 h-6" />
            <span>Speak Update</span>
          </button>
        </div>

        {/* Quick Emergency Assistance Strip */}
        <div className="p-4 bg-rose-50 rounded-2xl border-2 border-rose-300 flex items-center justify-between">
          <div>
            <p className="text-base font-black text-rose-900">Feeling unwell or need help?</p>
            <p className="text-sm text-rose-700">Open your emergency card or contact daughter Ananya.</p>
          </div>
          <button
            id="elder-quick-sos-button"
            type="button"
            onClick={openEmergencyModal}
            className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-base rounded-xl shadow-md cursor-pointer min-h-[48px]"
          >
            Emergency Card
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. ADULT / STANDARD RECOVERY MODE VIEW
  // ==========================================
  return (
    <div id="today-adult-view" className="space-y-6 pb-12 animate-fade-in">
      {/* Voice-Guided Onboarding Banner for Adult */}
      {showOnboardingBanner && (
        <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 text-white p-4 sm:p-5 rounded-2xl border border-teal-700/50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0 border border-teal-500/40">
              <Headphones className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black">
                  New to SATHI? 2-Minute Voice Walkthrough
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-extrabold border border-teal-500/30">
                  Interactive Guide
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Experience hands-free voice symptom logging and our pre-processed OCR receipt scanner in action.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => openOnboarding(0)}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-bold rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Headphones className="w-4 h-4" />
              <span>Start Voice Tour</span>
            </button>
            <button
              type="button"
              onClick={dismissOnboardingBanner}
              className="p-2 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modern Patient Hero */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 rounded-full text-xs font-medium text-emerald-200 mb-2">
              <Sparkles className="w-3.5 h-3.5" /> {profile.isMinor ? 'Pediatric Guardian Care Plan' : 'Post-Discharge Care Plan Active'}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Good day, {profile.name}</h1>
            <p className="text-sm text-emerald-100 mt-1">
              {profile.diagnosis} · {profile.hospitalName}
            </p>
            {profile.isMinor && (
              <p className="text-xs text-amber-200 font-semibold mt-1">
                🛡️ Guardian Management: All medications & inhaler doses verified by mother {profile.guardianName}.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-4 bg-white/10 p-3.5 rounded-xl backdrop-blur-xs border border-white/10">
              <div>
                <span className="text-xs text-emerald-200 uppercase font-bold tracking-wider">Adherence</span>
                <p className="text-2xl font-black text-white">{medicationAdherenceRate}%</p>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div>
                <span className="text-xs text-emerald-200 uppercase font-bold tracking-wider">Tasks Done</span>
                <p className="text-2xl font-black text-white">
                  {recoveryTasks.filter((t) => t.completed).length}/{recoveryTasks.length}
                </p>
              </div>
            </div>

            <button
              id="adult-hero-voice-journal-btn"
              type="button"
              onClick={() => openVoiceLogger('daily_update')}
              className="px-4 py-3 bg-white hover:bg-emerald-50 text-emerald-950 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer shrink-0 min-h-[44px]"
            >
              <Mic className="w-4 h-4 text-emerald-700 animate-pulse" />
              <span>Voice Journal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Predictive High-Risk Day Forecaster Alert Banner */}
      {predictiveSummary.highestRiskDay && (
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 border border-teal-700/50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0 border border-teal-500/40">
              <Sparkles className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-teal-300">
                  Predictive Symptom Risk Analysis
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                  Potential High-Risk Day
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 mt-0.5">
                {predictiveSummary.highestRiskDay.dayOfWeek} ({predictiveSummary.highestRiskDay.dateStr}) · {predictiveSummary.highestRiskDay.riskScore}% recurrence probability
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Historical symptom logs show a 3–4 day recurrence cycle for {predictiveSummary.highestRiskDay.dominantCategory.toLowerCase()} symptoms.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('symptoms')}
            className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
          >
            <span>View 7-Day Forecast & Checklist</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Next Up Focus Banner */}
      <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/70 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-xs">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-900 uppercase">Up Next · {nextMed.timing}</span>
              <ProvenanceBadge tag={nextMed.provenance} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">
              {nextMed.name} ({nextMed.dosage})
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">{nextMed.instructions}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {nextMed.takenToday ? (
            <span className="px-4 py-2 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Taken Today ({nextMed.takenAt})
            </span>
          ) : (
            <button
              id="adult-take-next-med"
              type="button"
              onClick={() => toggleMedication(nextMed.id)}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 min-h-[44px]"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Mark as Taken</span>
            </button>
          )}

          <VoiceReadButton
            text={`Next up at ${nextMed.timing}: ${nextMed.name} ${nextMed.dosage}. ${nextMed.instructions}`}
            label="Listen"
          />
        </div>
      </div>

      {/* Main Grid: Schedule vs Clinical Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Daily Recovery Flow */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-700" />
              <span>Today's Recovery Rhythm</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('medicines')}
              className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer flex items-center gap-1"
            >
              All Medicines ({medications.length}) <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {medications.map((med) => (
              <div
                key={med.id}
                id={`adult-med-${med.id}`}
                className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  med.takenToday
                    ? 'bg-slate-50/80 border-slate-200 text-slate-600'
                    : 'bg-white border-slate-200 hover:border-emerald-500 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    id={`toggle-med-check-${med.id}`}
                    type="button"
                    onClick={() => toggleMedication(med.id)}
                    aria-label={`Mark ${med.name} as ${med.takenToday ? 'not taken' : 'taken'}`}
                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                      med.takenToday ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 hover:border-emerald-500 bg-white'
                    }`}
                  >
                    {med.takenToday && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${med.takenToday ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {med.name} {med.dosage}
                      </span>
                      <span className="text-xs text-slate-500">· {med.timing}</span>
                    </div>
                    <p className="text-xs text-slate-500">{med.instructions}</p>
                  </div>
                </div>

                <ProvenanceBadge tag={med.provenance} size="sm" />
              </div>
            ))}
          </div>

          {/* Recovery Tasks */}
          <div className="pt-2">
            <h4 className="text-sm font-bold text-slate-900 mb-2">Prescribed Daily Exercises</h4>
            <div className="space-y-2">
              {recoveryTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-xs ${
                    task.completed ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${task.completed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-400'}`}>
                      {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="font-semibold">{task.title}</span>
                    <span className="text-slate-500">({task.time})</span>
                  </div>
                  <span className="text-slate-500 text-[11px]">{task.instructions}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Key Follow-ups & Quick Actions */}
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <span>Next Doctor Visit</span>
              </h3>
              <ProvenanceBadge tag="doctor_confirmed" />
            </div>

            {appointments[0] && (
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <p className="text-sm font-bold text-slate-900">{appointments[0].doctorName}</p>
                <p className="text-xs text-emerald-700 font-semibold">{appointments[0].date} at {appointments[0].time}</p>
                <p className="text-xs text-slate-600">{appointments[0].hospital}</p>
                <p className="text-[11px] text-slate-500 mt-2 border-t border-slate-200 pt-1">
                  Note: {appointments[0].notes}
                </p>
              </div>
            )}

            <button
              id="adult-summary-export"
              type="button"
              onClick={() => onNavigate('timeline')}
              className="w-full py-2 px-3 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer text-center"
            >
              Export 1-Page Summary for Dr. Mehta →
            </button>
          </div>

          {/* Quick Voice / Symptom Check-in Box */}
          <div className="p-5 rounded-xl bg-slate-900 text-white space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-emerald-400" />
              <span>How are you feeling right now?</span>
            </h3>
            <p className="text-xs text-slate-300">
              Report any new sensation, incision discomfort, or dizziness. SATHI will evaluate predefined safety rules.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('symptoms')}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer text-center"
              >
                Log a Symptom
              </button>
              <button
                type="button"
                onClick={() => onNavigate('ask')}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                Ask Sathi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
