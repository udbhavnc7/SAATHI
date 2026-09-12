import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  HeartPulse,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  BarChart3,
  Search,
  X,
  Smile,
  Utensils,
  Wind,
  Battery,
  Bandage,
  Footprints,
  Layers,
  Activity,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { useAdaptive } from '../../context/AdaptiveContext';
import { SymptomCategory, SymptomLog } from '../../types';
import {
  ALL_SYMPTOM_CATEGORIES,
  SYMPTOM_CATEGORIES_CONFIG,
  getCategoryConfig,
  inferSymptomCategory,
  inferSymptomTags,
} from '../../utils/symptomTaxonomy';
import { parseLogTimestamp } from '../../services/predictiveSymptomAnalysis';
import { VoiceReadButton } from '../ui/VoiceButton';

const CATEGORY_ICONS: Record<SymptomCategory, React.ReactNode> = {
  Pain: <Activity className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />,
  Mood: <Smile className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />,
  Digestive: <Utensils className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
  Respiratory: <Wind className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />,
  Cardiovascular: <HeartPulse className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />,
  Fatigue: <Battery className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
  'Wound / Skin': <Bandage className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />,
  Mobility: <Footprints className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
  Other: <Layers className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />,
};

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateHeading(date: Date): string {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const month = MONTH_NAMES[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return `${weekday}, ${month} ${day}, ${year}`;
}

interface SymptomCalendarViewProps {
  onLogNewClick?: (prefillDate?: string) => void;
  onViewTrendsClick?: () => void;
  onViewForecastClick?: () => void;
  initialSelectedDate?: string; // YYYY-MM-DD
}

export const SymptomCalendarView: React.FC<SymptomCalendarViewProps> = ({
  onLogNewClick,
  onViewTrendsClick,
  onViewForecastClick,
  initialSelectedDate,
}) => {
  const { symptomLogs, profile } = useAdaptive();
  const isElder = profile.ageBand === 'elder';

  // Base mock timeline anchor: September 12, 2026
  const baseToday = useMemo(() => new Date(2026, 8, 12, 12, 0, 0), []);
  const todayKey = toDateKey(baseToday);

  // Current calendar month view (default to September 2026)
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    if (initialSelectedDate) {
      const parts = initialSelectedDate.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      }
    }
    return new Date(2026, 8, 1);
  });

  // Selected date for detailed view (default: Today or initialSelectedDate)
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => {
    return initialSelectedDate || todayKey;
  });

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<'all' | SymptomCategory>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'mild' | 'moderate' | 'severe'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Index all symptom logs by dateKey (YYYY-MM-DD)
  const logsByDateKey = useMemo(() => {
    const map: Record<string, SymptomLog[]> = {};
    for (const log of symptomLogs) {
      const parsedDate = parseLogTimestamp(log.timestamp, baseToday);
      const key = toDateKey(parsedDate);
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(log);
    }
    // Sort each day's logs chronologically
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        const da = parseLogTimestamp(a.timestamp, baseToday);
        const db = parseLogTimestamp(b.timestamp, baseToday);
        return da.getTime() - db.getTime();
      });
    }
    return map;
  }, [symptomLogs, baseToday]);

  // List of all dates that have logs (sorted)
  const sortedDatesWithLogs = useMemo(() => {
    return Object.keys(logsByDateKey).sort();
  }, [logsByDateKey]);

  // Jump to previous / next logged day
  const jumpToPreviousLoggedDay = () => {
    const prevs = sortedDatesWithLogs.filter((d) => d < selectedDateKey);
    if (prevs.length > 0) {
      const target = prevs[prevs.length - 1];
      setSelectedDateKey(target);
      const parts = target.split('-');
      setCurrentMonth(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1));
    }
  };

  const jumpToNextLoggedDay = () => {
    const nexts = sortedDatesWithLogs.filter((d) => d > selectedDateKey);
    if (nexts.length > 0) {
      const target = nexts[0];
      setSelectedDateKey(target);
      const parts = target.split('-');
      setCurrentMonth(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1));
    }
  };

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleJumpToToday = () => {
    setCurrentMonth(new Date(2026, 8, 1));
    setSelectedDateKey(todayKey);
  };

  // 2. Generate Calendar Grid Matrix for currentMonth
  const calendarGrid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      date: Date;
      dateKey: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      logs: SymptomLog[];
      filteredLogs: SymptomLog[];
      highestSeverity: 'severe' | 'moderate' | 'mild' | null;
      hasEscalate: boolean;
      hasMonitor: boolean;
      categories: SymptomCategory[];
    }> = [];

    // Leading padding days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const date = new Date(year, month - 1, dayNum, 12, 0, 0);
      const key = toDateKey(date);
      const dayLogs = logsByDateKey[key] || [];
      days.push({
        date,
        dateKey: key,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: key === todayKey,
        isSelected: key === selectedDateKey,
        logs: dayLogs,
        filteredLogs: filterLogs(dayLogs, categoryFilter, severityFilter, searchQuery),
        highestSeverity: getHighestSeverity(dayLogs),
        hasEscalate: dayLogs.some((l) => l.safetyState === 'ESCALATE'),
        hasMonitor: dayLogs.some((l) => l.safetyState === 'MONITOR'),
        categories: getUniqueCategories(dayLogs),
      });
    }

    // Days in current month
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const date = new Date(year, month, dayNum, 12, 0, 0);
      const key = toDateKey(date);
      const dayLogs = logsByDateKey[key] || [];
      days.push({
        date,
        dateKey: key,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: key === todayKey,
        isSelected: key === selectedDateKey,
        logs: dayLogs,
        filteredLogs: filterLogs(dayLogs, categoryFilter, severityFilter, searchQuery),
        highestSeverity: getHighestSeverity(dayLogs),
        hasEscalate: dayLogs.some((l) => l.safetyState === 'ESCALATE'),
        hasMonitor: dayLogs.some((l) => l.safetyState === 'MONITOR'),
        categories: getUniqueCategories(dayLogs),
      });
    }

    // Trailing padding days to fill 35 or 42 grid cells
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const date = new Date(year, month + 1, dayNum, 12, 0, 0);
      const key = toDateKey(date);
      const dayLogs = logsByDateKey[key] || [];
      days.push({
        date,
        dateKey: key,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: key === todayKey,
        isSelected: key === selectedDateKey,
        logs: dayLogs,
        filteredLogs: filterLogs(dayLogs, categoryFilter, severityFilter, searchQuery),
        highestSeverity: getHighestSeverity(dayLogs),
        hasEscalate: dayLogs.some((l) => l.safetyState === 'ESCALATE'),
        hasMonitor: dayLogs.some((l) => l.safetyState === 'MONITOR'),
        categories: getUniqueCategories(dayLogs),
      });
    }

    return days;
  }, [currentMonth, logsByDateKey, todayKey, selectedDateKey, categoryFilter, severityFilter, searchQuery]);

  // 3. Month summary metrics
  const monthStats = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();

    let totalLogsThisMonth = 0;
    let daysWithLogs = 0;
    let severeCount = 0;
    let moderateCount = 0;
    let mildCount = 0;
    let escalateCount = 0;
    const categoryCounts: Record<string, number> = {};

    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const date = new Date(year, month, day, 12, 0, 0);
      const key = toDateKey(date);
      const logs = logsByDateKey[key] || [];
      if (logs.length > 0) {
        daysWithLogs++;
        totalLogsThisMonth += logs.length;
        for (const log of logs) {
          if (log.severity === 'severe') severeCount++;
          else if (log.severity === 'moderate') moderateCount++;
          else mildCount++;

          if (log.safetyState === 'ESCALATE') escalateCount++;

          const cat = log.category || inferSymptomCategory(log.symptom);
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        }
      }
    }

    // Find top category
    let topCategory: SymptomCategory = 'Pain';
    let topCategoryCount = 0;
    for (const [cat, count] of Object.entries(categoryCounts)) {
      if (count > topCategoryCount) {
        topCategoryCount = count;
        topCategory = cat as SymptomCategory;
      }
    }

    return {
      totalLogsThisMonth,
      daysWithLogs,
      symptomFreeDays: daysInCurrentMonth - daysWithLogs,
      severeCount,
      moderateCount,
      mildCount,
      escalateCount,
      topCategory,
      topCategoryCount,
    };
  }, [currentMonth, logsByDateKey]);

  // 4. Selected Day Details
  const selectedDayLogs = useMemo(() => {
    return logsByDateKey[selectedDateKey] || [];
  }, [logsByDateKey, selectedDateKey]);

  const selectedDateObj = useMemo(() => {
    const parts = selectedDateKey.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
    }
    return baseToday;
  }, [selectedDateKey, baseToday]);

  const selectedDaySummarySpeech = useMemo(() => {
    const dateFormatted = selectedDateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    if (selectedDayLogs.length === 0) {
      return `On ${dateFormatted}, no symptoms were recorded. You rested comfortably.`;
    }
    const count = selectedDayLogs.length;
    const topSev = getHighestSeverity(selectedDayLogs);
    const symptomsList = selectedDayLogs.map((l) => l.symptom).slice(0, 2).join('; and ');
    return `On ${dateFormatted}, ${count} symptom event${count > 1 ? 's were' : ' was'} logged. Peak severity was ${topSev}. Symptoms included: ${symptomsList}.`;
  }, [selectedDateObj, selectedDayLogs]);

  return (
    <div id="symptom-calendar-view" className="space-y-6 animate-fade-in">
      {/* Calendar Top Control Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-900 dark:bg-teal-900/50 dark:text-teal-300">
                Visual Health Calendar
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Historical Health Chronicle & Log Inspector
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              <span>
                {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </span>
            </h2>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              id="calendar-prev-month"
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              id="calendar-jump-today"
              type="button"
              onClick={handleJumpToToday}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/80 text-teal-900 dark:text-teal-300 border border-teal-200 dark:border-teal-800 cursor-pointer transition-colors shadow-2xs"
            >
              Jump to Today (Sep 12)
            </button>

            <button
              id="calendar-next-month"
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {onLogNewClick && (
              <button
                id="calendar-log-symptom-button"
                type="button"
                onClick={() => onLogNewClick(selectedDateKey)}
                className="ml-auto md:ml-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Record on Selected Day</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Month Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
              Events Logged
            </span>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {monthStats.totalLogsThisMonth}{' '}
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                across {monthStats.daysWithLogs} days
              </span>
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
              Dominant Symptom
            </span>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5 flex items-center gap-1.5">
              {CATEGORY_ICONS[monthStats.topCategory]}
              <span>{monthStats.topCategory}</span>
              <span className="text-xs font-semibold text-slate-500">
                ({monthStats.topCategoryCount})
              </span>
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
              Severe / Moderate
            </span>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {monthStats.severeCount + monthStats.moderateCount}{' '}
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                ({monthStats.severeCount} severe)
              </span>
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
              Symptom-Free Days
            </span>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {monthStats.symptomFreeDays}{' '}
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">days</span>
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 uppercase">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filter Calendar Indicators:</span>
            </span>

            {/* Keyword Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="calendar-search-input"
                type="text"
                placeholder="Search logs (e.g., incision, walking)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-all shrink-0 ${
                categoryFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Categories
            </button>

            {ALL_SYMPTOM_CATEGORIES.map((cat) => {
              const count = symptomLogs.filter((l) => (l.category || inferSymptomCategory(l.symptom)) === cat).length;
              if (count === 0) return null;
              const isSelected = categoryFilter === cat;
              const cfg = SYMPTOM_CATEGORIES_CONFIG[cat];
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(isSelected ? 'all' : cat)}
                  className={`px-2.5 py-1 rounded-xl font-bold cursor-pointer transition-all shrink-0 flex items-center gap-1.5 border ${
                    isSelected
                      ? `${cfg.badgeClass} ring-2 ring-teal-600 shadow-xs`
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {CATEGORY_ICONS[cat]}
                  <span>{cat}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Interactive Calendar Grid + Day Details Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Calendar Grid (7 cols on desktop) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Click any date to inspect full clinical logs & actions
            </span>
            <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Severe
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Moderate
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Mild
              </span>
            </div>
          </div>

          {/* Weekday Table Headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-100 dark:border-slate-800">
            {WEEKDAY_NAMES.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day Cells Matrix */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarGrid.map((daySlot, idx) => {
              const {
                dateKey,
                dayNumber,
                isCurrentMonth,
                isToday,
                isSelected,
                logs,
                filteredLogs,
                highestSeverity,
                hasEscalate,
                categories,
              } = daySlot;

              const hasLogs = logs.length > 0;
              const matchesFilter = filteredLogs.length > 0;
              const isFilteredOut = hasLogs && !matchesFilter;

              // Border and background highlighting
              let bgClass = 'bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800';
              let borderClass = 'border-slate-200/80 dark:border-slate-800';

              if (!isCurrentMonth) {
                bgClass = 'bg-transparent text-slate-300 dark:text-slate-700 hover:bg-slate-50/50';
                borderClass = 'border-transparent';
              } else if (isSelected) {
                bgClass = 'bg-teal-50 dark:bg-teal-950/60 ring-2 ring-teal-600 dark:ring-teal-400 shadow-sm';
                borderClass = 'border-teal-500 dark:border-teal-500';
              } else if (hasLogs && matchesFilter) {
                if (highestSeverity === 'severe' || hasEscalate) {
                  bgClass = 'bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100/60 border-rose-200 dark:border-rose-900';
                } else if (highestSeverity === 'moderate') {
                  bgClass = 'bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100/60 border-amber-200 dark:border-amber-900';
                } else {
                  bgClass = 'bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/60 border-emerald-200 dark:border-emerald-900';
                }
              }

              return (
                <button
                  key={`${dateKey}-${idx}`}
                  id={`calendar-day-${dateKey}`}
                  type="button"
                  onClick={() => setSelectedDateKey(dateKey)}
                  aria-label={`${formatDateHeading(daySlot.date)}${
                    hasLogs ? `, ${logs.length} symptoms logged` : ', no symptoms logged'
                  }`}
                  aria-selected={isSelected}
                  className={`relative min-h-[72px] sm:min-h-[88px] p-2 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer select-none group ${bgClass} ${borderClass} ${
                    isFilteredOut ? 'opacity-40 grayscale' : ''
                  }`}
                >
                  {/* Day Header Row: Day number + Today Badge */}
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span
                      className={`text-sm font-black ${
                        !isCurrentMonth
                          ? 'text-slate-300 dark:text-slate-600'
                          : isSelected
                          ? 'text-teal-950 dark:text-teal-200'
                          : isToday
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {dayNumber}
                    </span>

                    {isToday && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-700 text-white dark:bg-emerald-600">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Indicators / Chips inside Cell */}
                  <div className="w-full space-y-1">
                    {hasLogs ? (
                      <div>
                        {/* Event Count & Peak Severity Pill */}
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1 ${
                              highestSeverity === 'severe'
                                ? 'bg-rose-200/90 text-rose-950 dark:bg-rose-900/80 dark:text-rose-200'
                                : highestSeverity === 'moderate'
                                ? 'bg-amber-200/90 text-amber-950 dark:bg-amber-900/80 dark:text-amber-200'
                                : 'bg-emerald-200/90 text-emerald-950 dark:bg-emerald-900/80 dark:text-emerald-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                highestSeverity === 'severe'
                                  ? 'bg-rose-600'
                                  : highestSeverity === 'moderate'
                                  ? 'bg-amber-600'
                                  : 'bg-emerald-600'
                              }`}
                            />
                            <span>{logs.length} {logs.length === 1 ? 'event' : 'events'}</span>
                          </span>
                        </div>

                        {/* Category Dots */}
                        <div className="flex items-center gap-1 pt-1 flex-wrap">
                          {categories.slice(0, 3).map((cat) => (
                            <span
                              key={cat}
                              title={cat}
                              className="text-[11px]"
                            >
                              {CATEGORY_ICONS[cat]}
                            </span>
                          ))}
                          {categories.length > 3 && (
                            <span className="text-[9px] text-slate-400 font-bold">
                              +{categories.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : isCurrentMonth ? (
                      <div className="text-[10px] text-slate-300 dark:text-slate-600 font-medium py-1">
                        Clear
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Day Jumper Links */}
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={jumpToPreviousLoggedDay}
              className="text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 font-bold flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous Logged Day</span>
            </button>
            <span className="text-slate-400 text-[11px]">
              {sortedDatesWithLogs.length} days with logged history
            </span>
            <button
              type="button"
              onClick={jumpToNextLoggedDay}
              className="text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Next Logged Day</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column: Selected Day Detail Ledger (5 cols on desktop) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            {/* Header of Selected Date */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                    Detailed Day Ledger
                  </span>
                  {selectedDateKey === todayKey && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                      TODAY
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {formatDateHeading(selectedDateObj)}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedDayLogs.length === 0
                    ? 'No symptom disruptions reported'
                    : `${selectedDayLogs.length} symptom record${
                        selectedDayLogs.length > 1 ? 's' : ''
                      } on this date`}
                </p>
              </div>

              <VoiceReadButton
                text={selectedDaySummarySpeech}
                label="Listen"
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl"
              />
            </div>

            {/* List of Symptoms on this selected date */}
            {selectedDayLogs.length === 0 ? (
              <div className="py-10 px-4 text-center space-y-3 bg-slate-50/60 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <div>
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                    No Symptoms Recorded
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
                    No discomfort or alarms were logged for {MONTH_NAMES[selectedDateObj.getMonth()]}{' '}
                    {selectedDateObj.getDate()}. Recovery routine was uninterrupted.
                  </p>
                </div>
                {onLogNewClick && (
                  <button
                    id="log-for-this-empty-date"
                    type="button"
                    onClick={() => onLogNewClick(selectedDateKey)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log Symptom for {MONTH_NAMES[selectedDateObj.getMonth()]} {selectedDateObj.getDate()}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayLogs.map((log) => {
                  const cat = log.category || inferSymptomCategory(log.symptom);
                  const cfg = getCategoryConfig(cat);
                  const tags = log.tags && log.tags.length > 0 ? log.tags : inferSymptomTags(log.symptom, cat);

                  return (
                    <div
                      key={log.id}
                      id={`day-log-${log.id}`}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-all space-y-2.5"
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Safety state */}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              log.safetyState === 'ESCALATE'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                                : log.safetyState === 'MONITOR'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                            }`}
                          >
                            {log.safetyState}
                          </span>

                          {/* Category Badge */}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${cfg.badgeClass}`}
                          >
                            {CATEGORY_ICONS[cat]}
                            <span>{cat}</span>
                          </span>

                          {/* Severity */}
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              log.severity === 'severe'
                                ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'
                                : log.severity === 'moderate'
                                ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
                                : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                            }`}
                          >
                            {log.severity}
                          </span>
                        </div>

                        {/* Timestamp */}
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {log.timestamp}
                        </span>
                      </div>

                      {/* Symptom Title */}
                      <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        {log.symptom}
                      </p>

                      {/* Tags */}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tags.map((t) => (
                            <span
                              key={t}
                              className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Clinical Rationale & Action Taken */}
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5">
                        <p className="text-slate-600 dark:text-slate-300">
                          <strong className="text-slate-900 dark:text-white">Reason:</strong> {log.reason}
                        </p>
                        <p className="text-slate-700 dark:text-slate-200">
                          <strong className="text-emerald-800 dark:text-emerald-400">Action:</strong>{' '}
                          {log.actionTaken}
                        </p>
                      </div>

                      {/* Caregiver Escalation Flag */}
                      {log.caregiverNotified && (
                        <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-2 text-xs text-amber-900 dark:text-amber-300">
                          <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                          <span>
                            Caregiver was notified for recovery check and non-pharmacological pacing.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Action to switch to Forecast or Trends */}
            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
              {onViewForecastClick && (
                <button
                  type="button"
                  onClick={onViewForecastClick}
                  className="text-xs text-teal-700 dark:text-teal-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Check 7-Day Risk Forecast</span>
                </button>
              )}

              {onViewTrendsClick && (
                <button
                  type="button"
                  onClick={onViewTrendsClick}
                  className="text-xs text-slate-600 dark:text-slate-300 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>View Charts</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Helper Functions ---

function filterLogs(
  logs: SymptomLog[],
  categoryFilter: 'all' | SymptomCategory,
  severityFilter: 'all' | 'mild' | 'moderate' | 'severe',
  searchQuery: string
): SymptomLog[] {
  return logs.filter((log) => {
    if (categoryFilter !== 'all') {
      const cat = log.category || inferSymptomCategory(log.symptom);
      if (cat !== categoryFilter) return false;
    }
    if (severityFilter !== 'all') {
      if (log.severity !== severityFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSymptom = log.symptom.toLowerCase().includes(q);
      const matchReason = log.reason.toLowerCase().includes(q);
      const matchAction = log.actionTaken.toLowerCase().includes(q);
      const matchTag = log.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchSymptom && !matchReason && !matchAction && !matchTag) return false;
    }
    return true;
  });
}

function getHighestSeverity(logs: SymptomLog[]): 'severe' | 'moderate' | 'mild' | null {
  if (!logs || logs.length === 0) return null;
  if (logs.some((l) => l.severity === 'severe')) return 'severe';
  if (logs.some((l) => l.severity === 'moderate')) return 'moderate';
  return 'mild';
}

function getUniqueCategories(logs: SymptomLog[]): SymptomCategory[] {
  const set = new Set<SymptomCategory>();
  for (const log of logs) {
    const cat = log.category || inferSymptomCategory(log.symptom);
    set.add(cat);
  }
  return Array.from(set);
}
