import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle,
  Calendar,
  Clock,
  Activity,
  HeartPulse,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  ChevronRight,
  Info,
  ArrowRight,
  RotateCcw,
  Bell,
  Check,
  Send,
  UserCheck,
  Sliders,
  Filter,
  Wind,
  Battery,
  Bandage,
  Footprints,
  Layers,
  Smile,
  Utensils,
  Share2,
} from 'lucide-react';
import { useAdaptive } from '../../context/AdaptiveContext';
import { SymptomCategory, SymptomLog } from '../../types';
import {
  analyzeSymptomHistory,
  DayForecast,
  RecurringPattern,
  PredictiveAnalysisSummary,
} from '../../services/predictiveSymptomAnalysis';
import { VoiceReadButton } from '../ui/VoiceButton';
import { SYMPTOM_CATEGORIES_CONFIG } from '../../utils/symptomTaxonomy';

interface PredictiveSymptomForecasterProps {
  onLogNewClick?: () => void;
  onNavigateToTrends?: () => void;
  onNavigateToCalendar?: (dateKey?: string) => void;
}

const CATEGORY_ICONS: Record<SymptomCategory, React.ReactNode> = {
  Pain: <Activity className="w-4 h-4 text-rose-600" />,
  Mood: <Smile className="w-4 h-4 text-purple-600" />,
  Digestive: <Utensils className="w-4 h-4 text-amber-600" />,
  Respiratory: <Wind className="w-4 h-4 text-cyan-600" />,
  Cardiovascular: <HeartPulse className="w-4 h-4 text-red-600" />,
  Fatigue: <Battery className="w-4 h-4 text-emerald-600" />,
  'Wound / Skin': <Bandage className="w-4 h-4 text-teal-600" />,
  Mobility: <Footprints className="w-4 h-4 text-blue-600" />,
  Other: <Layers className="w-4 h-4 text-slate-600" />,
};

export const PredictiveSymptomForecaster: React.FC<PredictiveSymptomForecasterProps> = ({
  onLogNewClick,
  onNavigateToTrends,
  onNavigateToCalendar,
}) => {
  const { profile, symptomLogs, designatedContact, openQuickAlert, addTimelineEvent } = useAdaptive();

  const isElder = profile.ageBand === 'elder';

  // State for category filtering in forecast
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<SymptomCategory | 'ALL'>('ALL');
  // Selected day for inspection
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  // Checklist state for proactive preparation items (keyed by `date_tipIndex`)
  const [completedPrepItems, setCompletedPrepItems] = useState<Record<string, boolean>>({});
  // Caregiver alert status for forecasted days
  const [alertSentForDays, setAlertSentForDays] = useState<Record<string, boolean>>({});
  // AI enhancement state
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [aiDataSource, setAiDataSource] = useState<'deterministic' | 'gemini'>('deterministic');
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simulatedLogs, setSimulatedLogs] = useState<SymptomLog[]>([]);

  // Combined logs (real logs + any user simulated logs)
  const activeLogs = useMemo(() => {
    return [...symptomLogs, ...simulatedLogs];
  }, [symptomLogs, simulatedLogs]);

  // Compute deterministic predictive analysis
  const summary: PredictiveAnalysisSummary = useMemo(() => {
    return analyzeSymptomHistory(activeLogs, new Date(2026, 8, 12, 12, 0, 0));
  }, [activeLogs]);

  // Default selected day index to the highest risk day if available
  useEffect(() => {
    if (summary.highestRiskDay) {
      const idx = summary.forecastNext7Days.findIndex(
        (d) => d.dateStr === summary.highestRiskDay?.dateStr
      );
      if (idx >= 0) {
        setSelectedDayIndex(idx);
      }
    }
  }, [summary.highestRiskDay]);

  // Request AI clinical narrative enhancement
  const fetchAIEnhancement = async () => {
    setIsAILoading(true);
    try {
      const res = await fetch('/api/predictive-symptom-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logs: activeLogs,
          patientProfile: profile,
          currentMedications: ['Metoprolol 25mg', 'Aspirin 75mg', 'Atorvastatin 20mg'],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.clinicalNarrative) {
          setAiNarrative(data.clinicalNarrative);
          setAiDataSource(data.source === 'gemini-predictive' ? 'gemini' : 'deterministic');
        }
      }
    } catch (err) {
      console.warn('Could not fetch AI enhancement, staying with deterministic engine:', err);
    } finally {
      setIsAILoading(false);
    }
  };

  const selectedDay: DayForecast = summary.forecastNext7Days[selectedDayIndex] || summary.forecastNext7Days[0];

  // Filtered recurring patterns
  const filteredPatterns = useMemo(() => {
    if (selectedCategoryFilter === 'ALL') return summary.recurringPatterns;
    return summary.recurringPatterns.filter((p) => p.category === selectedCategoryFilter);
  }, [summary.recurringPatterns, selectedCategoryFilter]);

  // Toggle proactive checklist item
  const togglePrepItem = (key: string) => {
    setCompletedPrepItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Proactive caregiver alert handler
  const handleNotifyCaregiverForDay = (day: DayForecast) => {
    const alertKey = day.dateStr;
    setAlertSentForDays((prev) => ({ ...prev, [alertKey]: true }));

    // Record on timeline
    addTimelineEvent({
      type: 'doctor_visit',
      title: `Proactive Risk Alert Sent to ${designatedContact.name}`,
      detail: `Sent proactive heads-up for ${day.formattedDate} (${day.dayOfWeek}) - Anticipated recurring symptoms: ${day.likelySymptoms.map((s) => s.name).join(', ') || 'Post-op soreness'}.`,
      provenance: 'patient_reported',
      statusBadge: 'Dispatched',
    });
  };

  // Spoken narrative text for voice button
  const spokenNarrative = useMemo(() => {
    const highest = summary.highestRiskDay;
    if (!highest) {
      return 'Predictive analysis shows consistent baseline recovery with low recurring symptom risk over the next seven days.';
    }
    return `Predictive health forecast for ${profile.name}. Your next potential high-risk day for recurring symptoms is ${highest.dayOfWeek}, ${highest.formattedDate}, with an estimated ${highest.overallRiskScore} percent risk score, primarily for ${highest.likelySymptoms[0]?.name || 'musculoskeletal soreness'}. SATHI advises scheduling extra rest periods and keeping your heart pillow nearby.`;
  }, [summary, profile]);

  return (
    <div className="space-y-6" id="predictive-symptom-analysis-tool">
      {/* 1. HERO HEADER CARD */}
      <div className="bg-gradient-to-br from-teal-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-teal-800/40 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                <span>Predictive Recurrence Engine</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {summary.analyzedLogsCount} Historical Logs Analyzed
              </span>
            </div>

            <h1 className={`font-black tracking-tight ${isElder ? 'text-3xl' : 'text-2xl'}`}>
              Symptom Risk Forecast & High-Risk Days
            </h1>

            <p className={`text-slate-300 font-medium ${isElder ? 'text-base' : 'text-sm'}`}>
              Evaluates historical recurrence intervals, day-of-week exertion patterns, and recovery tasks to forecast potential symptom flare-ups so you can prepare in advance.
            </p>
          </div>

          {/* Action buttons & Voice */}
          <div className="flex flex-wrap sm:flex-col items-stretch gap-2.5 shrink-0">
            <VoiceReadButton
              text={spokenNarrative}
              label={isElder ? 'Listen to Weekly Risk Forecast' : 'Listen to Forecast'}
              className="bg-teal-700/90 hover:bg-teal-600 text-white border-teal-500/40 py-2.5 px-4 font-bold shadow-sm"
            />
            <button
              id="refresh-predictive-analysis"
              type="button"
              onClick={fetchAIEnhancement}
              disabled={isAILoading}
              className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-teal-400 ${isAILoading ? 'animate-spin' : ''}`} />
              <span>{isAILoading ? 'Synthesizing...' : 'Re-analyze Historical Data'}</span>
            </button>
          </div>
        </div>

        {/* 2. HIGHEST-RISK DAY SPOTLIGHT BANNER */}
        {summary.highestRiskDay && (
          <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-8 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 text-rose-400">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-rose-400">
                    Highest Projected Risk Window:
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-rose-500 text-white">
                    {summary.highestRiskDay.dayOfWeek}, {summary.highestRiskDay.formattedDate}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    ({summary.highestRiskDay.overallRiskScore}% Risk Index)
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-100">
                  Primary expected symptom:{' '}
                  <span className="text-rose-300 font-bold">
                    {summary.highestRiskDay.likelySymptoms[0]?.name || 'Musculoskeletal & Ambulation Soreness'}
                  </span>
                </p>
                <p className="text-xs text-slate-300 line-clamp-2">
                  {summary.highestRiskDay.historicalRationale}
                </p>
              </div>
            </div>

            <div className="md:col-span-4 flex flex-col sm:flex-row md:flex-col items-end gap-2">
              <button
                type="button"
                id="jump-to-highest-risk-day"
                onClick={() => {
                  const idx = summary.forecastNext7Days.findIndex(
                    (d) => d.dateStr === summary.highestRiskDay?.dateStr
                  );
                  if (idx >= 0) setSelectedDayIndex(idx);
                }}
                className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
              >
                <span>Inspect {summary.highestRiskDay.dayOfWeek} Care Plan</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleNotifyCaregiverForDay(summary.highestRiskDay!)}
                disabled={alertSentForDays[summary.highestRiskDay.dateStr]}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  alertSentForDays[summary.highestRiskDay.dateStr]
                    ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-700'
                    : 'bg-rose-900/50 hover:bg-rose-900/80 text-rose-200 border border-rose-700/60'
                }`}
              >
                {alertSentForDays[summary.highestRiskDay.dateStr] ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Caregiver Informed</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-3.5 h-3.5 text-rose-300" />
                    <span>Alert Caregiver ({designatedContact.name})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. CLINICAL TRAJECTORY & AI SYNTHESIS STRIP */}
      {(aiNarrative || summary.clinicalNarrative) && (
        <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 flex items-start gap-3.5 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-teal-700" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-teal-950 flex items-center gap-1.5">
                <span>Clinical Recurrence Analysis</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] bg-teal-200/80 text-teal-900 font-extrabold">
                  {aiDataSource === 'gemini' ? 'AI-Grounding' : 'Deterministic Pattern Engine'}
                </span>
              </span>
              <span className="text-[11px] font-bold text-teal-800">
                Generated {summary.generatedAt}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-teal-950 font-medium leading-relaxed">
              {aiNarrative || summary.clinicalNarrative}
            </p>
          </div>
        </div>
      )}

      {/* 4. SEVEN-DAY FORECAST CALENDAR GRID */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-700" />
              <span>7-Day Predictive Risk Calendar</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Tap any day to inspect predicted recurring symptoms, trigger contexts, and preventive actions.
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1 text-rose-800">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
              <span>High Risk (≥65%)</span>
            </span>
            <span className="flex items-center gap-1 text-amber-800">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span>Moderate (38-64%)</span>
            </span>
            <span className="flex items-center gap-1 text-emerald-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
              <span>Low (&lt;38%)</span>
            </span>
          </div>
        </div>

        {/* The 7 Day Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {summary.forecastNext7Days.map((day, idx) => {
            const isSelected = selectedDayIndex === idx;
            const isHigh = day.riskLevel === 'high';
            const isMod = day.riskLevel === 'moderate';

            const cardBorder = isSelected
              ? 'ring-2 ring-teal-600 border-teal-600 bg-teal-50/50'
              : isHigh
              ? 'border-rose-300 bg-rose-50/40 hover:bg-rose-50'
              : isMod
              ? 'border-amber-200 bg-amber-50/30 hover:bg-amber-50'
              : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100';

            const badgeColor = isHigh
              ? 'bg-rose-600 text-white'
              : isMod
              ? 'bg-amber-500 text-slate-950'
              : 'bg-emerald-600 text-white';

            return (
              <button
                key={day.dateStr}
                id={`forecast-day-${idx}`}
                type="button"
                onClick={() => setSelectedDayIndex(idx)}
                className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-36 ${cardBorder}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-black text-slate-900 truncate">
                      {day.dayOfWeek.slice(0, 3)}
                    </span>
                    {day.isToday && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-teal-700 text-white uppercase">
                        Today
                      </span>
                    )}
                    {day.isTomorrow && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-slate-700 text-white uppercase">
                        Tmrw
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-semibold mb-2">
                    {day.formattedDate.split(',')[1]?.trim() || day.formattedDate}
                  </div>

                  {/* Primary symptom preview */}
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1 line-clamp-2">
                    {CATEGORY_ICONS[day.topCategory]}
                    <span className="truncate">{day.likelySymptoms[0]?.name || 'Baseline Recovery'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${badgeColor}`}>
                    {day.riskLevel === 'high' ? 'High Risk' : day.riskLevel === 'moderate' ? 'Moderate' : 'Low'}
                  </span>
                  <span className="text-xs font-black text-slate-700">
                    {day.overallRiskScore}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. DEEP DIVE INSPECTION PANEL FOR SELECTED DAY */}
      {selectedDay && (
        <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    selectedDay.riskLevel === 'high'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : selectedDay.riskLevel === 'moderate'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}
                >
                  {selectedDay.riskLevel.toUpperCase()} RISK DAY ({selectedDay.overallRiskScore}%)
                </span>
                <span className="text-sm font-bold text-slate-500">
                  {selectedDay.isToday ? 'Today' : selectedDay.isTomorrow ? 'Tomorrow' : `${selectedDay.daysFromToday} days away`}
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900">
                Detailed Forecast for {selectedDay.dayOfWeek}, {selectedDay.formattedDate}
              </h3>
            </div>

            {/* Caregiver notification button & Calendar jump */}
            <div className="flex items-center gap-2 flex-wrap">
              {onNavigateToCalendar && (
                <button
                  type="button"
                  onClick={() => onNavigateToCalendar(selectedDay.dateStr)}
                  className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200"
                  title="View this date on Calendar Grid"
                >
                  <Calendar className="w-3.5 h-3.5 text-teal-700" />
                  <span>View in Calendar</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleNotifyCaregiverForDay(selectedDay)}
                disabled={alertSentForDays[selectedDay.dateStr]}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs ${
                  alertSentForDays[selectedDay.dateStr]
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200'
                }`}
              >
                {alertSentForDays[selectedDay.dateStr] ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Heads-up Shared with {designatedContact.name}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-rose-600" />
                    <span>Send Heads-up Note to Caregiver</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Historical Rationale & Symptoms breakdown */}
            <div className="lg:col-span-7 space-y-5">
              {/* Evidence banner */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <Info className="w-3.5 h-3.5 text-teal-700" />
                  <span>Historical Data Rationale</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                  {selectedDay.historicalRationale}
                </p>
                <div className="flex items-center gap-2 pt-1 text-[11px] font-bold text-slate-500">
                  <span>Suggested Activity Pacing:</span>
                  <span className="text-teal-900 font-extrabold bg-teal-100/70 px-2 py-0.5 rounded">
                    {selectedDay.suggestedPacing}
                  </span>
                </div>
              </div>

              {/* Likely Symptoms expected */}
              <div>
                <h4 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-rose-600" />
                  <span>Predicted Recurring Symptoms for this Date</span>
                </h4>

                {selectedDay.likelySymptoms.length === 0 ? (
                  <div className="p-4 bg-emerald-50 text-emerald-900 rounded-2xl border border-emerald-200 text-xs font-semibold">
                    No high or moderate recurring symptoms projected for this date. Continue regular post-discharge recovery tasks.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDay.likelySymptoms.map((sym, sIdx) => (
                      <div
                        key={sIdx}
                        className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 transition-all space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-slate-100">
                              {CATEGORY_ICONS[sym.category]}
                            </span>
                            <span className="text-sm font-bold text-slate-900">{sym.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-600">
                              {sym.probability}% Likelihood
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                                sym.expectedSeverity === 'severe'
                                  ? 'bg-rose-100 text-rose-800'
                                  : sym.expectedSeverity === 'moderate'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              Expected {sym.expectedSeverity}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-slate-600 font-medium">
                          <strong>Historical trigger pattern:</strong> {sym.rationale}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                          <span className="text-slate-500 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Likely Window: {sym.expectedTiming}</span>
                          </span>
                          <span className="text-teal-900 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {sym.actionItem}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Proactive Action & Preparation Checklist */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 rounded-3xl bg-slate-900 text-white space-y-4 shadow-md">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black flex items-center gap-2 text-teal-300">
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    <span>Proactive Preparation Checklist</span>
                  </h4>
                  <span className="text-[11px] font-bold text-slate-400">
                    For {selectedDay.dayOfWeek}
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-medium">
                  Clinically guarded steps you or your caregiver can prepare ahead of time to minimize symptom distress:
                </p>

                <div className="space-y-2.5">
                  {selectedDay.preventiveCareTips.map((tip, tIdx) => {
                    const tipKey = `${selectedDay.dateStr}_${tIdx}`;
                    const isChecked = Boolean(completedPrepItems[tipKey]);

                    return (
                      <button
                        key={tIdx}
                        type="button"
                        onClick={() => togglePrepItem(tipKey)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isChecked
                            ? 'bg-teal-950/70 border-teal-600/80 text-teal-100'
                            : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isChecked
                              ? 'bg-teal-500 border-teal-400 text-slate-950'
                              : 'border-slate-500 bg-slate-900'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 font-black stroke-[3]" />}
                        </div>
                        <span
                          className={`text-xs font-semibold leading-snug ${
                            isChecked ? 'line-through text-slate-400' : 'text-slate-100'
                          }`}
                        >
                          {tip}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-bold">
                  <span>Caregiver: {designatedContact.name}</span>
                  <span>Phone: {designatedContact.phone}</span>
                </div>
              </div>

              {/* Red-Flag Reminder */}
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 space-y-1.5 text-xs text-rose-950">
                <div className="flex items-center gap-1.5 font-black text-rose-900">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Immediate Escalation Guardrail</span>
                </div>
                <p className="font-medium text-rose-900 leading-snug">
                  If predicted soreness escalates into sudden crushing chest pain, radiating left arm pain, breathlessness at rest, or fever over 100.4°F, bypass routine pacing and trigger Quick Alert immediately.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      openQuickAlert(
                        'Predictive alert escalation query',
                        'severe',
                        selectedDay.topCategory,
                        'manual'
                      )
                    }
                    className="text-[11px] font-black text-rose-700 underline hover:text-rose-900 cursor-pointer"
                  >
                    Open Emergency Triage Strip
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. IDENTIFIED RECURRING SYMPTOM PATTERNS & CYCLES */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-700" />
              <span>Identified Recurrence Patterns in Your Recovery</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              SATHI calculated recurrence cycles and trigger contexts from your {summary.analyzedLogsCount} historical symptom reports.
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                selectedCategoryFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({summary.recurringPatterns.length})
            </button>
            {(['Pain', 'Cardiovascular', 'Fatigue', 'Digestive', 'Mood'] as SymptomCategory[]).map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 ${
                    selectedCategoryFilter === cat
                      ? 'bg-teal-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {CATEGORY_ICONS[cat]}
                  <span>{cat}</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Pattern Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPatterns.length === 0 ? (
            <div className="col-span-2 p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500 text-xs font-semibold">
              No recurring patterns detected for category "{selectedCategoryFilter}".
            </div>
          ) : (
            filteredPatterns.map((pat) => (
              <div
                key={pat.id}
                className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-3.5 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-md bg-slate-100">
                        {CATEGORY_ICONS[pat.category]}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {pat.category}
                      </span>
                      <span
                        className={`px-2 py-0.2 rounded text-[10px] font-black uppercase ${
                          pat.trend === 'improving'
                            ? 'bg-emerald-100 text-emerald-800'
                            : pat.trend === 'increasing'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {pat.trend}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900">{pat.name}</h4>
                  </div>

                  <span className="px-2.5 py-1 rounded-xl bg-teal-50 text-teal-900 border border-teal-200 text-xs font-extrabold shrink-0">
                    ~Every {pat.averageIntervalDays} Days
                  </span>
                </div>

                {/* Metrics chips */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 block">Occurrences</span>
                    <span className="text-xs font-black text-slate-900">{pat.totalOccurrences} Logs</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 block">Peak Window</span>
                    <span className="text-xs font-black text-slate-900">{pat.commonTimeOfDay}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 block">Next Peak</span>
                    <span className="text-xs font-black text-teal-800">{pat.nextProjectedDate}</span>
                  </div>
                </div>

                {/* Trigger context */}
                <div className="text-xs text-slate-600 font-medium">
                  <strong className="text-slate-800">Primary trigger context:</strong> {pat.triggerContext}
                </div>

                {/* Preventive advice */}
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-black uppercase text-teal-900 block">
                    Recommended Prevention:
                  </span>
                  <ul className="space-y-1 text-xs text-slate-700">
                    {pat.preventiveAdvice.slice(0, 2).map((adv, aIdx) => (
                      <li key={aIdx} className="flex items-start gap-1.5">
                        <span className="text-teal-700 font-bold">•</span>
                        <span>{adv}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 7. QUICK ACTIONS & SIMULATION FOOTER */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-100 rounded-2xl border border-slate-200/90 text-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <Info className="w-4 h-4 text-teal-700 shrink-0" />
          <span>
            Have new symptoms to record? Logging in real-time continuously refines your predictive forecast.
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {onNavigateToCalendar && (
            <button
              type="button"
              onClick={() => onNavigateToCalendar()}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-teal-700" />
              <span>Calendar History</span>
            </button>
          )}

          {onNavigateToTrends && (
            <button
              type="button"
              onClick={onNavigateToTrends}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors shadow-2xs"
            >
              View Historical Trends
            </button>
          )}

          {onLogNewClick && (
            <button
              type="button"
              onClick={onLogNewClick}
              className="px-4 py-2 bg-teal-800 hover:bg-teal-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-2xs"
            >
              Log New Symptom Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
