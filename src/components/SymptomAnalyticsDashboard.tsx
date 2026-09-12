import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  AreaChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  BarChart3,
  TrendingDown,
  Activity,
  HeartPulse,
  AlertTriangle,
  CheckCircle2,
  Volume2,
  Copy,
  Check,
  Calendar,
  Layers,
  Sparkles,
  Mic,
  ShieldCheck,
  ChevronRight,
  Filter,
  Tag,
  X,
  Smile,
  Utensils,
  Wind,
  Battery,
  Bandage,
  Footprints,
} from 'lucide-react';
import { useAdaptive } from '../context/AdaptiveContext';
import { SymptomCategory, SymptomLog } from '../types';
import {
  ALL_SYMPTOM_CATEGORIES,
  SYMPTOM_CATEGORIES_CONFIG,
  getCategoryConfig,
  inferSymptomCategory,
  inferSymptomTags,
} from '../utils/symptomTaxonomy';

interface DailyAggregate {
  date: string;
  displayDate: string;
  totalCount: number;
  mild: number;
  moderate: number;
  severe: number;
  avgIntensity: number;
  maxIntensity: number;
  normalSafety: number;
  monitorSafety: number;
  escalateSafety: number;
  symptoms: Array<{ text: string; category: SymptomCategory; tags: string[]; severity: string }>;
  logs: SymptomLog[];
}

interface ChronologicalPoint {
  id: string;
  index: number;
  timeLabel: string;
  symptom: string;
  shortSymptom: string;
  severity: 'mild' | 'moderate' | 'severe';
  category: SymptomCategory;
  tags: string[];
  intensity: number;
  safetyState: 'NORMAL' | 'MONITOR' | 'ESCALATE';
  actionTaken: string;
  reason: string;
  caregiverNotified: boolean;
}

interface CategoryAggregate {
  category: SymptomCategory;
  name: string;
  count: number;
  avgIntensity: number;
  color: string;
  description: string;
  topTags: string[];
}

const SEVERITY_SCORES: Record<string, number> = {
  mild: 1,
  moderate: 2,
  severe: 3,
};

const CATEGORY_ICON_MAP: Record<SymptomCategory, React.ReactNode> = {
  Pain: <Activity className="w-3.5 h-3.5 text-rose-600" />,
  Mood: <Smile className="w-3.5 h-3.5 text-purple-600" />,
  Digestive: <Utensils className="w-3.5 h-3.5 text-amber-600" />,
  Respiratory: <Wind className="w-3.5 h-3.5 text-cyan-600" />,
  Cardiovascular: <HeartPulse className="w-3.5 h-3.5 text-red-600" />,
  Fatigue: <Battery className="w-3.5 h-3.5 text-emerald-600" />,
  'Wound / Skin': <Bandage className="w-3.5 h-3.5 text-teal-600" />,
  Mobility: <Footprints className="w-3.5 h-3.5 text-blue-600" />,
  Other: <Layers className="w-3.5 h-3.5 text-slate-600" />,
};

export const SymptomAnalyticsDashboard: React.FC<{
  onLogNewClick?: () => void;
  onViewForecastClick?: () => void;
  onViewCalendarClick?: (dateKey?: string) => void;
}> = ({ onLogNewClick, onViewForecastClick, onViewCalendarClick }) => {
  const { symptomLogs, reportSymptom, speakText, isSpeaking, openVoiceLogger, profile } = useAdaptive();

  const isElder = profile.ageBand === 'elder';

  const [timeFilter, setTimeFilter] = useState<'all' | '7d' | '3d'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | SymptomCategory>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'combined' | 'intensity' | 'frequency' | 'categories'>('combined');
  const [selectedDayData, setSelectedDayData] = useState<DailyAggregate | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // 1. Calculate Available Tags & Counts across dataset
  const { categoryCounts, availableTags } = useMemo(() => {
    const counts: Record<string, number> = { all: symptomLogs.length };
    ALL_SYMPTOM_CATEGORIES.forEach((cat) => {
      counts[cat] = 0;
    });

    const tagsSet = new Set<string>();

    symptomLogs.forEach((l) => {
      const cat = l.category || inferSymptomCategory(l.symptom);
      counts[cat] = (counts[cat] || 0) + 1;

      const tags = l.tags && l.tags.length > 0 ? l.tags : inferSymptomTags(l.symptom, cat);
      // Only include tags that match the current category filter (or all)
      if (categoryFilter === 'all' || cat === categoryFilter) {
        tags.forEach((t) => tagsSet.add(t));
      }
    });

    return {
      categoryCounts: counts,
      availableTags: Array.from(tagsSet),
    };
  }, [symptomLogs, categoryFilter]);

  // 2. Parse dates and build aggregates with category & tag filtering
  const { dailyData, chronologicalData, categoryData, kpis } = useMemo(() => {
    // Clone symptom logs in chronological order
    const sorted = [...symptomLogs].sort((a, b) => {
      const cleanA = a.timestamp.replace('Today,', 'Sept 11, 2026,').replace('Yesterday,', 'Sept 10, 2026,');
      const cleanB = b.timestamp.replace('Today,', 'Sept 11, 2026,').replace('Yesterday,', 'Sept 10, 2026,');
      return new Date(cleanA).getTime() - new Date(cleanB).getTime();
    });

    // Time window filter
    let timeScopedLogs = sorted;
    if (timeFilter === '3d') {
      timeScopedLogs = sorted.slice(-5);
    } else if (timeFilter === '7d') {
      timeScopedLogs = sorted.slice(-8);
    }

    // Category filter
    let filteredLogs = timeScopedLogs;
    if (categoryFilter !== 'all') {
      filteredLogs = filteredLogs.filter((l) => {
        const cat = l.category || inferSymptomCategory(l.symptom);
        return cat === categoryFilter;
      });
    }

    // Tag filter
    if (tagFilter) {
      filteredLogs = filteredLogs.filter((l) => {
        const cat = l.category || inferSymptomCategory(l.symptom);
        const tags = l.tags && l.tags.length > 0 ? l.tags : inferSymptomTags(l.symptom, cat);
        return tags.includes(tagFilter);
      });
    }

    // Aggregate by Day (Date grouping)
    const daysMap = new Map<string, SymptomLog[]>();

    filteredLogs.forEach((log) => {
      let dayKey = 'Sept 6';
      if (log.timestamp.includes('Sept 6')) dayKey = 'Sept 6';
      else if (log.timestamp.includes('Sept 7')) dayKey = 'Sept 7';
      else if (log.timestamp.includes('Sept 8')) dayKey = 'Sept 8';
      else if (log.timestamp.includes('Sept 9')) dayKey = 'Sept 9';
      else if (log.timestamp.includes('Sept 10') || log.timestamp.includes('Yesterday')) dayKey = 'Sept 10';
      else if (log.timestamp.includes('Sept 11') || log.timestamp.includes('Today') || log.timestamp.includes('Just now'))
        dayKey = 'Sept 11';
      else dayKey = log.timestamp.split(',')[0] || 'Sept 11';

      if (!daysMap.has(dayKey)) {
        daysMap.set(dayKey, []);
      }
      daysMap.get(dayKey)!.push(log);
    });

    const dayKeysOrder = ['Sept 6', 'Sept 7', 'Sept 8', 'Sept 9', 'Sept 10', 'Sept 11'];

    const daily: DailyAggregate[] = [];
    dayKeysOrder.forEach((dayKey) => {
      const logs = daysMap.get(dayKey);
      if (!logs || logs.length === 0) return;

      let mild = 0;
      let moderate = 0;
      let severe = 0;
      let totalScore = 0;
      let maxScore = 1;
      let normal = 0;
      let monitor = 0;
      let escalate = 0;
      const symptomsList: Array<{ text: string; category: SymptomCategory; tags: string[]; severity: string }> = [];

      logs.forEach((l) => {
        const score = SEVERITY_SCORES[l.severity] || 1;
        totalScore += score;
        if (score > maxScore) maxScore = score;

        if (l.severity === 'mild') mild += 1;
        else if (l.severity === 'moderate') moderate += 1;
        else if (l.severity === 'severe') severe += 1;

        if (l.safetyState === 'NORMAL') normal += 1;
        else if (l.safetyState === 'MONITOR') monitor += 1;
        else if (l.safetyState === 'ESCALATE') escalate += 1;

        const cat = l.category || inferSymptomCategory(l.symptom);
        const tags = l.tags && l.tags.length > 0 ? l.tags : inferSymptomTags(l.symptom, cat);
        symptomsList.push({
          text: l.symptom,
          category: cat,
          tags,
          severity: l.severity,
        });
      });

      const avg = Number((totalScore / logs.length).toFixed(1));

      const displayLabels: Record<string, string> = {
        'Sept 6': 'D+1 (Sep 6)',
        'Sept 7': 'D+2 (Sep 7)',
        'Sept 8': 'D+3 (Sep 8)',
        'Sept 9': 'D+4 (Sep 9)',
        'Sept 10': 'Yesterday',
        'Sept 11': 'Today (D+6)',
      };

      daily.push({
        date: dayKey,
        displayDate: displayLabels[dayKey] || dayKey,
        totalCount: logs.length,
        mild,
        moderate,
        severe,
        avgIntensity: avg,
        maxIntensity: maxScore,
        normalSafety: normal,
        monitorSafety: monitor,
        escalateSafety: escalate,
        symptoms: symptomsList,
        logs,
      });
    });

    // Chronological points for trajectory area chart
    const chronological: ChronologicalPoint[] = filteredLogs.map((l, index) => {
      const score = SEVERITY_SCORES[l.severity] || 1;
      let timeLabel = `#${index + 1}`;
      if (l.timestamp.includes('Sept 6')) timeLabel = 'D1 Sep 6';
      else if (l.timestamp.includes('Sept 7')) timeLabel = 'D2 Sep 7';
      else if (l.timestamp.includes('Sept 8')) timeLabel = 'D3 Sep 8';
      else if (l.timestamp.includes('Sept 9')) timeLabel = 'D4 Sep 9';
      else if (l.timestamp.includes('Yesterday')) timeLabel = 'Yesterday';
      else if (l.timestamp.includes('Today')) timeLabel = 'Today';
      else timeLabel = `Evt ${index + 1}`;

      const cat = l.category || inferSymptomCategory(l.symptom);
      const tags = l.tags && l.tags.length > 0 ? l.tags : inferSymptomTags(l.symptom, cat);

      return {
        id: l.id,
        index: index + 1,
        timeLabel,
        symptom: l.symptom,
        shortSymptom: l.symptom.length > 34 ? `${l.symptom.slice(0, 32)}...` : l.symptom,
        severity: l.severity,
        category: cat,
        tags,
        intensity: score,
        safetyState: l.safetyState,
        actionTaken: l.actionTaken,
        reason: l.reason,
        caregiverNotified: l.caregiverNotified,
      };
    });

    // Category Breakdown (using explicit categories)
    const categoryTotals: Record<SymptomCategory, { count: number; totalIntensity: number; tagsMap: Record<string, number> }> = {
      Pain: { count: 0, totalIntensity: 0, tagsMap: {} },
      Mood: { count: 0, totalIntensity: 0, tagsMap: {} },
      Digestive: { count: 0, totalIntensity: 0, tagsMap: {} },
      Respiratory: { count: 0, totalIntensity: 0, tagsMap: {} },
      Cardiovascular: { count: 0, totalIntensity: 0, tagsMap: {} },
      Fatigue: { count: 0, totalIntensity: 0, tagsMap: {} },
      'Wound / Skin': { count: 0, totalIntensity: 0, tagsMap: {} },
      Mobility: { count: 0, totalIntensity: 0, tagsMap: {} },
      Other: { count: 0, totalIntensity: 0, tagsMap: {} },
    };

    // Calculate across the time-scoped logs
    timeScopedLogs.forEach((l) => {
      const cat = l.category || inferSymptomCategory(l.symptom);
      const score = SEVERITY_SCORES[l.severity] || 1;
      const tags = l.tags && l.tags.length > 0 ? l.tags : inferSymptomTags(l.symptom, cat);

      if (categoryTotals[cat]) {
        categoryTotals[cat].count += 1;
        categoryTotals[cat].totalIntensity += score;
        tags.forEach((t) => {
          categoryTotals[cat].tagsMap[t] = (categoryTotals[cat].tagsMap[t] || 0) + 1;
        });
      }
    });

    const categories: CategoryAggregate[] = ALL_SYMPTOM_CATEGORIES.filter(
      (cat) => categoryTotals[cat].count > 0
    ).map((cat) => {
      const cfg = SYMPTOM_CATEGORIES_CONFIG[cat];
      const data = categoryTotals[cat];
      const topTags = Object.entries(data.tagsMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([t]) => t);

      return {
        category: cat,
        name: cfg.name,
        count: data.count,
        avgIntensity: Number((data.totalIntensity / data.count).toFixed(1)),
        color: cfg.color,
        description: cfg.description,
        topTags,
      };
    });

    // KPIs for current filtered subset
    const totalEpisodes = filteredLogs.length;
    const totalIntensitySum = filteredLogs.reduce((acc, curr) => acc + (SEVERITY_SCORES[curr.severity] || 1), 0);
    const overallAvgIntensity = totalEpisodes > 0 ? Number((totalIntensitySum / totalEpisodes).toFixed(1)) : 0;

    // Trajectory reduction
    const earlyLogs = filteredLogs.slice(0, Math.ceil(filteredLogs.length / 2));
    const lateLogs = filteredLogs.slice(Math.ceil(filteredLogs.length / 2));

    const earlyAvg =
      earlyLogs.length > 0
        ? earlyLogs.reduce((acc, curr) => acc + (SEVERITY_SCORES[curr.severity] || 1), 0) / earlyLogs.length
        : 0;
    const lateAvg =
      lateLogs.length > 0
        ? lateLogs.reduce((acc, curr) => acc + (SEVERITY_SCORES[curr.severity] || 1), 0) / lateLogs.length
        : 0;

    const trajectoryDrop = earlyAvg > 0 ? Math.round(((earlyAvg - lateAvg) / earlyAvg) * 100) : 0;

    const peakIntensity = filteredLogs.reduce((max, curr) => Math.max(max, SEVERITY_SCORES[curr.severity] || 1), 1);

    const normalCount = filteredLogs.filter((l) => l.safetyState === 'NORMAL').length;
    const monitorCount = filteredLogs.filter((l) => l.safetyState === 'MONITOR').length;
    const escalateCount = filteredLogs.filter((l) => l.safetyState === 'ESCALATE').length;

    return {
      dailyData: daily,
      chronologicalData: chronological,
      categoryData: categories,
      kpis: {
        totalEpisodes,
        overallAvgIntensity,
        trajectoryDrop,
        peakIntensity,
        normalCount,
        monitorCount,
        escalateCount,
      },
    };
  }, [symptomLogs, timeFilter, categoryFilter, tagFilter]);

  // Read clinical analysis aloud
  const handleReadSummary = () => {
    const filterContext =
      categoryFilter !== 'all' ? ` in the ${categoryFilter} category` : '';
    const speech = `Recovery Symptom Analytics for ${profile.name}${filterContext}. Total recorded symptoms: ${kpis.totalEpisodes}. Average intensity is ${kpis.overallAvgIntensity} out of 3. Trajectory change is ${Math.max(0, kpis.trajectoryDrop)} percent. Safety profile shows ${kpis.normalCount} normal healing sensations and ${kpis.monitorCount} monitored events.`;
    speakText(speech);
  };

  // Copy clinical note for OPD doctor
  const handleCopyDoctorSummary = () => {
    const text = `SATHI RECOVERY SYMPTOM REPORT (Dr. Rajesh Mehta Review)
Patient: ${profile.name} (${profile.age}, Day 6 Post-CABG)
Period: Sept 6, 2026 - Present
Active Filter: Category: ${categoryFilter} | Tag: ${tagFilter || 'All'}

1. FREQUENCY & VOLUME:
- Filtered Episodes Logged: ${kpis.totalEpisodes}
- Total Patient History: ${symptomLogs.length} events across 6 recovery days

2. INTENSITY & SEVERITY METRICS:
- Average Severity Score: ${kpis.overallAvgIntensity} / 3.0
- Peak Intensity: ${kpis.peakIntensity === 3 ? 'Severe' : kpis.peakIntensity === 2 ? 'Moderate' : 'Mild'}
- Severity Trajectory: ${kpis.trajectoryDrop > 0 ? `${kpis.trajectoryDrop}% reduction` : 'Stable baseline'}

3. CLINICAL TRIAGE SAFETY DISTRIBUTION:
- Normal Healing Sensations: ${kpis.normalCount}
- Monitored Ambulatory Events: ${kpis.monitorCount}
- Escalation Triggers: ${kpis.escalateCount}

4. CATEGORY BREAKDOWN:
${categoryData.map((c) => `- ${c.category}: ${c.count} logs (Avg: ${c.avgIntensity}/3.0) Tags: ${c.topTags.join(', ')}`).join('\n')}

Generated with SATHI Recovery Analytics. Provenance: Patient & Caregiver Verified.`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  // Quick test logger with explicit category & tags
  const handleQuickAdd = async (
    label: string,
    sev: 'mild' | 'moderate',
    cat: SymptomCategory,
    tags: string[]
  ) => {
    await reportSymptom(label, sev, cat, tags);
  };

  const hasActiveFilters = categoryFilter !== 'all' || tagFilter !== null;

  return (
    <div
      id="symptom-analytics-dashboard"
      className="bg-white rounded-3xl border-2 border-slate-200 p-5 sm:p-7 space-y-6 shadow-xs"
    >
      {/* Top Header & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-900 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-teal-700" />
              <span>Recharts Analytics Dashboard</span>
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Categorized Tracking · Pain · Mood · Digestive · Cardiopulmonary
            </span>
          </div>
          <h2 className={`font-black text-slate-900 tracking-tight ${isElder ? 'text-2xl' : 'text-xl'}`}>
            Symptom Frequency & Intensity Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time visualization of recorded episodes filtered by anatomical categories and clinical tags.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {onViewCalendarClick && (
            <button
              type="button"
              onClick={() => onViewCalendarClick()}
              className="px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title="Open full symptom calendar grid"
            >
              <Calendar className="w-4 h-4 text-teal-700" />
              <span>Calendar View</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleReadSummary}
            className={`px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              isSpeaking ? 'ring-2 ring-emerald-500 bg-emerald-50 text-emerald-900' : ''
            }`}
            title="Read clinical analysis aloud"
          >
            <Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-emerald-700 animate-pulse' : 'text-slate-500'}`} />
            <span>{isSpeaking ? 'Speaking...' : 'Listen Summary'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyDoctorSummary}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            title="Copy formatted OPD clinical summary"
          >
            {copiedSummary ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedSummary ? 'Copied to Clipboard' : 'OPD Summary'}</span>
          </button>

          <button
            type="button"
            onClick={() => openVoiceLogger('symptom')}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
          >
            <Mic className="w-3.5 h-3.5 animate-pulse" />
            <span>Voice Log</span>
          </button>
        </div>
      </div>

      {/* PREDICTIVE FORECAST TEASER BANNER */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border border-teal-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center shrink-0 text-teal-300">
            <Sparkles className="w-5 h-5 text-teal-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-teal-300">
                Predictive Risk Forecaster
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-500 text-white">
                Upcoming Risk Window Detected
              </span>
            </div>
            <p className="text-xs text-slate-200 font-medium">
              Historical logs indicate recurring musculoskeletal & ambulation soreness peaking on <strong className="text-teal-200">Thursday & Friday</strong>.
            </p>
          </div>
        </div>

        {onViewForecastClick && (
          <button
            type="button"
            onClick={onViewForecastClick}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-950 rounded-xl text-xs font-black shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
          >
            <span>View 7-Day High-Risk Forecast</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-900" />
          </button>
        )}
      </div>

      {/* FILTER CONTROL BAR: Categories & Tags */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
        {/* Row 1: Category Filter Chips */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-teal-600" />
              <span>Filter by Symptom Category:</span>
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('all');
                  setTagFilter(null);
                }}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('all');
                setTagFilter(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all shrink-0 flex items-center gap-1.5 ${
                categoryFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>All Categories</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-800 font-black">
                {categoryCounts.all || 0}
              </span>
            </button>

            {ALL_SYMPTOM_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat] || 0;
              if (count === 0 && categoryFilter !== cat) return null;
              const isSelected = categoryFilter === cat;
              const cfg = SYMPTOM_CATEGORIES_CONFIG[cat];

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(cat);
                    setTagFilter(null); // Reset tag filter on category change
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? `${cfg.bgLight} ${cfg.textDark} border-2 ${cfg.borderLight} ring-2 ring-slate-800 shadow-xs font-black`
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{CATEGORY_ICON_MAP[cat]}</span>
                  <span>{cat}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isSelected ? 'bg-white/80 text-slate-900' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Clinical Tag Filter Pills */}
        {availableTags.length > 0 && (
          <div className="pt-2 border-t border-slate-200/80">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-slate-500 uppercase shrink-0 flex items-center gap-1">
                <Tag className="w-3 h-3 text-indigo-500" /> Tags:
              </span>

              <button
                type="button"
                onClick={() => setTagFilter(null)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0 ${
                  tagFilter === null
                    ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                All Tags
              </button>

              {availableTags.map((tag) => {
                const isSelected = tagFilter === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTagFilter(isSelected ? null : tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0 flex items-center gap-1 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border border-indigo-700 shadow-2xs font-bold'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-900'
                    }`}
                  >
                    <span>#{tag}</span>
                    {isSelected && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Filter Summary Bar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs bg-teal-50 border border-teal-200 text-teal-900 px-3 py-1.5 rounded-xl animate-fade-in">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold">Active Filter:</span>
              {categoryFilter !== 'all' && (
                <span className="px-2 py-0.5 bg-white rounded-md border border-teal-300 font-bold">
                  Category: {categoryFilter}
                </span>
              )}
              {tagFilter && (
                <span className="px-2 py-0.5 bg-white rounded-md border border-teal-300 font-bold">
                  Tag: #{tagFilter}
                </span>
              )}
              <span className="text-teal-700">
                (Showing <strong>{kpis.totalEpisodes}</strong> matching episodes)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('all');
                setTagFilter(null);
              }}
              className="text-teal-800 hover:underline font-bold text-[11px] cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* KPI Stat Cards (Reflects Filtered Subset) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Frequency */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>{categoryFilter === 'all' ? 'Total Episodes' : `${categoryFilter} Episodes`}</span>
            <Activity className="w-3.5 h-3.5 text-teal-600" />
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{kpis.totalEpisodes}</span>
            <span className="text-xs text-slate-500 font-medium">events</span>
          </div>
          <p className="text-[11px] text-slate-500">Across {dailyData.length} active recovery days</p>
        </div>

        {/* Average Intensity */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Avg Severity Index</span>
            <HeartPulse className="w-3.5 h-3.5 text-amber-600" />
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{kpis.overallAvgIntensity}</span>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
              {kpis.overallAvgIntensity <= 1.4 ? 'Mild' : kpis.overallAvgIntensity <= 2.2 ? 'Moderate' : 'High'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Scale: 1 (Mild) to 3 (Severe)</p>
        </div>

        {/* Severity Trajectory */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 flex items-center justify-between">
            <span>Intensity Trajectory</span>
            <TrendingDown className="w-3.5 h-3.5 text-emerald-700" />
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-950">
              {kpis.trajectoryDrop > 0 ? `-${kpis.trajectoryDrop}%` : 'Stable'}
            </span>
            <span className="text-xs text-emerald-700 font-bold">Reduction</span>
          </div>
          <p className="text-[11px] text-emerald-800 font-medium">From Day 1-2 baseline</p>
        </div>

        {/* Safety Distribution */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Triage Profile</span>
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          </span>
          <div className="flex items-center gap-1.5 pt-1">
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800" title="Normal expected recovery">
              {kpis.normalCount} Normal
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800" title="Monitored sensations">
              {kpis.monitorCount} Monitor
            </span>
            {kpis.escalateCount > 0 && (
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800" title="Hospital alerts">
                {kpis.escalateCount} Alert
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">{kpis.escalateCount === 0 ? '0 hospital alerts' : 'Requires review'}</p>
        </div>
      </div>

      {/* Control Bar: Time Filters & Chart Views */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
        {/* Chart View Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('combined')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'combined'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Frequency & Intensity
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('intensity')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'intensity'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Intensity Trajectory
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('frequency')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'frequency'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Severity Counts
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'categories'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Category Distribution
          </button>
        </div>

        {/* Time Window Filter */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] text-slate-500 font-semibold">Window:</span>
          {(['all', '7d', '3d'] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setTimeFilter(w)}
              className={`px-2 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                timeFilter === w
                  ? 'bg-teal-700 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {w === 'all' ? 'All Days' : w === '7d' ? '7 Days' : '3 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* PRIMARY RECHARTS VISUALIZATION CONTAINER */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        {/* CHART 1: COMBINED FREQUENCY & INTENSITY OVER TIME */}
        {activeTab === 'combined' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Daily Frequency & Severity Index Progression</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    (Bars = Daily Count · Line = Avg Intensity Score)
                  </span>
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Mild
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" /> Moderate
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" /> Severe
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-teal-800 inline-block" /> Avg Severity
                </span>
              </div>
            </div>

            {dailyData.length === 0 ? (
              <div className="h-64 w-full flex items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                No recorded symptoms match the selected category & tag filter.
              </div>
            ) : (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={dailyData}
                    margin={{ top: 15, right: 20, bottom: 20, left: -10 }}
                    onClick={(e: any) => {
                      if (e && e.activePayload && e.activePayload[0]) {
                        setSelectedDayData(e.activePayload[0].payload as DailyAggregate);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="displayDate"
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      domain={[0, 'auto']}
                      label={{
                        value: 'Episodes Logged',
                        angle: -90,
                        position: 'insideLeft',
                        fill: '#94a3b8',
                        fontSize: 10,
                        offset: 15,
                      }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 3.2]}
                      ticks={[0, 1, 2, 3]}
                      tickFormatter={(val) =>
                        val === 1 ? '1 (Mild)' : val === 2 ? '2 (Mod)' : val === 3 ? '3 (Sev)' : '0'
                      }
                      tick={{ fill: '#0f766e', fontSize: 10, fontWeight: 600 }}
                      tickLine={false}
                      axisLine={false}
                      label={{
                        value: 'Severity Index (1-3)',
                        angle: 90,
                        position: 'insideRight',
                        fill: '#0f766e',
                        fontSize: 10,
                        offset: 10,
                      }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0].payload as DailyAggregate;
                        return (
                          <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs space-y-2 max-w-xs border border-slate-700">
                            <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                              <span className="font-bold text-emerald-400">{data.date}</span>
                              <span className="text-[10px] text-slate-300 font-semibold">
                                {data.totalCount} symptom(s)
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-slate-400">Avg Severity:</span>{' '}
                                <strong className="text-white">{data.avgIntensity} / 3.0</strong>
                              </div>
                              <div>
                                <span className="text-slate-400">Peak Severity:</span>{' '}
                                <strong className="text-amber-300">
                                  {data.maxIntensity === 3
                                    ? 'Severe'
                                    : data.maxIntensity === 2
                                    ? 'Moderate'
                                    : 'Mild'}
                                </strong>
                              </div>
                            </div>
                            <div className="text-[11px] text-slate-300 space-y-1">
                              <span className="text-[10px] uppercase font-bold text-slate-400">Recorded Symptoms:</span>
                              <ul className="space-y-1">
                                {data.symptoms.map((s, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5">
                                    <span
                                      className={`px-1 rounded text-[9px] font-bold border shrink-0 ${
                                        getCategoryConfig(s.category).badgeClass
                                      }`}
                                    >
                                      {s.category}
                                    </span>
                                    <span className="line-clamp-1">{s.text}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800">
                              Tap bar to isolate day details below
                            </p>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine
                      yAxisId="right"
                      y={2}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      label={{
                        value: 'Clinical Monitor Zone (Score 2.0)',
                        fill: '#d97706',
                        fontSize: 10,
                        position: 'top',
                      }}
                    />
                    {/* Stacked Bars by Severity */}
                    <Bar
                      yAxisId="left"
                      dataKey="mild"
                      name="Mild Episodes"
                      stackId="sev"
                      fill="#10b981"
                      radius={[0, 0, 0, 0]}
                      maxBarSize={38}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="moderate"
                      name="Moderate Episodes"
                      stackId="sev"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={38}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="severe"
                      name="Severe Episodes"
                      stackId="sev"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={38}
                    />

                    {/* Overlaid Average Intensity Trend Line */}
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avgIntensity"
                      name="Avg Severity Index"
                      stroke="#0f766e"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#0f766e', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 7, fill: '#0d9488' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* CHART 2: CONTINUOUS INTENSITY TRAJECTORY OVER TIME */}
        {activeTab === 'intensity' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Symptom Intensity Progression (Chronological Trajectory)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Step-by-step severity trajectory for every recorded event from early post-op recovery to present.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Zone 1: Expected (1.0)</span>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800">Zone 2: Monitored (2.0)</span>
              </div>
            </div>

            {chronologicalData.length === 0 ? (
              <div className="h-64 w-full flex items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                No recorded symptoms match the selected category & tag filter.
              </div>
            ) : (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chronologicalData} margin={{ top: 15, right: 20, bottom: 20, left: -10 }}>
                    <defs>
                      <linearGradient id="intensityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="timeLabel"
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                      domain={[0.5, 3.2]}
                      ticks={[1, 2, 3]}
                      tickFormatter={(val) => (val === 1 ? '1 Mild' : val === 2 ? '2 Mod' : '3 Sev')}
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const item = payload[0].payload as ChronologicalPoint;
                        const cfg = getCategoryConfig(item.category);
                        return (
                          <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs space-y-1.5 max-w-xs border border-slate-700">
                            <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                              <span className="font-bold text-emerald-400">
                                Event #{item.index} · {item.timeLabel}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                  item.severity === 'mild'
                                    ? 'bg-emerald-900 text-emerald-200'
                                    : item.severity === 'moderate'
                                    ? 'bg-amber-900 text-amber-200'
                                    : 'bg-rose-900 text-rose-200'
                                }`}
                              >
                                {item.severity.toUpperCase()} ({item.intensity}/3)
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cfg.badgeClass}`}>
                                {item.category}
                              </span>
                              {item.tags.map((t) => (
                                <span key={t} className="px-1.5 py-0.2 rounded text-[10px] bg-white/10 text-slate-300">
                                  #{t}
                                </span>
                              ))}
                            </div>
                            <p className="font-semibold text-slate-100">{item.symptom}</p>
                            <p className="text-[11px] text-slate-300">
                              <strong>Action:</strong> {item.actionTaken}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                              <span>Safety: {item.safetyState}</span>
                              {item.caregiverNotified && <span className="text-amber-300">Caregiver notified</span>}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine
                      y={2}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      label={{
                        value: 'Clinical Threshold (Moderate)',
                        fill: '#d97706',
                        fontSize: 10,
                        position: 'top',
                      }}
                    />
                    <ReferenceLine
                      y={1}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      label={{
                        value: 'Normal Baseline (Mild)',
                        fill: '#059669',
                        fontSize: 10,
                        position: 'bottom',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="intensity"
                      stroke="#0d9488"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#intensityGradient)"
                      dot={({ cx, cy, payload }: any) => {
                        const isMod = payload.severity === 'moderate';
                        const isSev = payload.severity === 'severe';
                        return (
                          <circle
                            key={payload.id}
                            cx={cx}
                            cy={cy}
                            r={isSev ? 7 : isMod ? 6 : 4.5}
                            fill={isSev ? '#ef4444' : isMod ? '#f59e0b' : '#10b981'}
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        );
                      }}
                      activeDot={{ r: 8, stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* CHART 3: FREQUENCY & SEVERITY COUNTS */}
        {activeTab === 'frequency' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Daily Symptom Frequency by Severity Tier
                </h3>
                <p className="text-xs text-slate-500">
                  Visual count of mild vs moderate vs severe symptoms logged per recovery day.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-emerald-500" /> Mild
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-amber-500" /> Moderate
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-rose-500" /> Severe
                </span>
              </div>
            </div>

            {dailyData.length === 0 ? (
              <div className="h-64 w-full flex items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                No recorded symptoms match the selected category & tag filter.
              </div>
            ) : (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData} margin={{ top: 15, right: 20, bottom: 20, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="displayDate"
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 'auto']}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const d = payload[0].payload as DailyAggregate;
                        return (
                          <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs space-y-1.5">
                            <p className="font-bold text-emerald-400">{d.date}</p>
                            <p className="text-slate-300">Total: {d.totalCount} episodes</p>
                            <div className="pt-1 border-t border-slate-700 text-[11px] space-y-0.5">
                              <div className="text-emerald-300">Mild: {d.mild}</div>
                              <div className="text-amber-300">Moderate: {d.moderate}</div>
                              <div className="text-rose-300">Severe: {d.severe}</div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="mild" name="Mild" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="moderate" name="Moderate" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="severe" name="Severe" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* CHART 4: ANATOMICAL & CLINICAL CATEGORY BREAKDOWN */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Anatomical & Symptom Category Distribution
              </h3>
              <p className="text-xs text-slate-500">
                Frequency, proportion, and severity grouped by clinical recovery categories. Click any category to filter.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Pie / Donut Chart */}
              <div className="md:col-span-5 h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      onClick={(entry: any) => {
                        if (entry && entry.category) {
                          setCategoryFilter(entry.category as SymptomCategory);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const c = payload[0].payload as CategoryAggregate;
                        return (
                          <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xl text-xs space-y-1">
                            <span className="font-bold text-white block">{c.category}</span>
                            <div className="text-[11px] text-slate-300">
                              Episodes: <strong>{c.count}</strong> ({Math.round((c.count / symptomLogs.length) * 100)}%)
                            </div>
                            <div className="text-[11px] text-amber-300">
                              Avg Severity: <strong>{c.avgIntensity} / 3.0</strong>
                            </div>
                            <p className="text-[10px] text-slate-400 italic pt-0.5">Click to filter dashboard</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category Detail Table */}
              <div className="md:col-span-7 space-y-2">
                {categoryData.map((cat, i) => {
                  const pct = Math.round((cat.count / symptomLogs.length) * 100);
                  const isSelected = categoryFilter === cat.category;
                  return (
                    <div
                      key={i}
                      onClick={() => setCategoryFilter(isSelected ? 'all' : cat.category)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs ${
                        isSelected
                          ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-200'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{cat.category}</span>
                            {isSelected && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-200 text-teal-900 font-bold">
                                Active Filter
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">{cat.description}</p>
                          {cat.topTags.length > 0 && (
                            <div className="flex items-center gap-1 pt-0.5 flex-wrap">
                              {cat.topTags.map((t) => (
                                <span key={t} className="text-[9px] px-1 py-0.2 rounded bg-white text-slate-600 border border-slate-200">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-right">
                        <div>
                          <span className="font-black text-slate-900">{cat.count}</span>
                          <span className="text-slate-500 text-[11px]"> ({pct}%)</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            cat.avgIntensity <= 1.4
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          Avg: {cat.avgIntensity}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected Day Inspector (Interactive drill-down) */}
      {selectedDayData && (
        <div className="p-4 bg-teal-50/80 rounded-2xl border border-teal-200 space-y-2 animate-fade-in text-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-bold text-teal-950 flex items-center gap-1.5 text-sm">
              <Calendar className="w-4 h-4 text-teal-700" />
              <span>Detail for {selectedDayData.date}</span>
            </span>
            <div className="flex items-center gap-3">
              {onViewCalendarClick && (
                <button
                  type="button"
                  onClick={() => onViewCalendarClick(selectedDayData.date)}
                  className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Open in Calendar &rarr;</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedDayData(null)}
                className="text-teal-700 hover:text-teal-900 font-bold underline cursor-pointer text-xs"
              >
                Clear Inspector
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {selectedDayData.logs.map((log) => {
              const cat = log.category || inferSymptomCategory(log.symptom);
              const cfg = getCategoryConfig(cat);
              const tags = log.tags && log.tags.length > 0 ? log.tags : inferSymptomTags(log.symptom, cat);

              return (
                <div key={log.id} className="p-3 bg-white rounded-xl border border-teal-100 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cfg.badgeClass}`}>
                        {cat}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          log.severity === 'mild'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.severity === 'moderate'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {log.severity.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                  </div>

                  <p className="font-bold text-slate-900">{log.symptom}</p>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tags.map((t) => (
                        <span key={t} className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-600">
                    <strong>Action:</strong> {log.actionTaken}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Interactive Category Add Demonstration */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <span className="font-bold text-slate-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Interactive Live Filter Demonstration</span>
          </span>
          <p className="text-slate-500 text-[11px]">
            Add categorized test symptoms into the recovery ledger to observe real-time Recharts updates and tag filtering.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() =>
              handleQuickAdd(
                'Mild donor leg incision tightness after afternoon rest',
                'mild',
                'Pain',
                ['Vein Harvest Leg', 'Throbbing Ache']
              )
            }
            className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-900 border border-rose-300 rounded-xl font-bold cursor-pointer transition-all shadow-2xs flex items-center gap-1"
          >
            <span>+ Pain</span>
          </button>
          <button
            type="button"
            onClick={() =>
              handleQuickAdd(
                'Mild recovery anxiety and difficulty falling asleep',
                'moderate',
                'Mood',
                ['Post-Op Anxiety', 'Sleep Disturbance']
              )
            }
            className="px-2.5 py-1.5 bg-white hover:bg-purple-50 text-purple-900 border border-purple-300 rounded-xl font-bold cursor-pointer transition-all shadow-2xs flex items-center gap-1"
          >
            <span>+ Mood</span>
          </button>
          <button
            type="button"
            onClick={() =>
              handleQuickAdd(
                'Mild nausea and loss of appetite following midday medication',
                'mild',
                'Digestive',
                ['Nausea', 'Loss of Appetite']
              )
            }
            className="px-2.5 py-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 rounded-xl font-bold cursor-pointer transition-all shadow-2xs flex items-center gap-1"
          >
            <span>+ Digestive</span>
          </button>
          {onLogNewClick && (
            <button
              type="button"
              onClick={onLogNewClick}
              className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
            >
              <span>Custom Entry</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
