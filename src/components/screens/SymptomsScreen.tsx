import React, { useState } from 'react';
import {
  HeartPulse,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Send,
  Info,
  PhoneCall,
  Clock,
  HelpCircle,
  Activity,
  Mic,
  BarChart3,
  Calendar as CalendarIcon,
  Tag,
  Filter,
  Check,
  Plus,
  X,
  Smile,
  Utensils,
  Wind,
  Battery,
  Bandage,
  Footprints,
  Layers,
  Sparkles,
  Headphones,
  MessageSquare,
  Phone,
  Copy,
} from 'lucide-react';
import { useAdaptive } from '../../context/AdaptiveContext';
import { VoiceInputButton, VoiceReadButton } from '../ui/VoiceButton';
import { SymptomAnalyticsDashboard } from '../SymptomAnalyticsDashboard';
import { PredictiveSymptomForecaster } from '../symptoms/PredictiveSymptomForecaster';
import { SymptomCalendarView, toDateKey } from '../symptoms/SymptomCalendarView';
import { parseLogTimestamp } from '../../services/predictiveSymptomAnalysis';
import { SymptomCategory, SymptomLog } from '../../types';
import {
  ALL_SYMPTOM_CATEGORIES,
  SYMPTOM_CATEGORIES_CONFIG,
  getCategoryConfig,
  inferSymptomCategory,
  inferSymptomTags,
} from '../../utils/symptomTaxonomy';

const CATEGORY_ICONS: Record<SymptomCategory, React.ReactNode> = {
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

export const SymptomsScreen: React.FC = () => {
  const {
    profile,
    symptomLogs,
    reportSymptom,
    openEmergencyModal,
    openVoiceLogger,
    openOnboarding,
    designatedContact,
    openQuickAlert,
    triggerQuickAlertSMS,
    triggerQuickAlertCall,
  } = useAdaptive();
  const [symptomInput, setSymptomInput] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<'mild' | 'moderate' | 'severe'>('mild');
  const [selectedCategory, setSelectedCategory] = useState<SymptomCategory>('Pain');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Sternal Incision']);
  const [customTagInput, setCustomTagInput] = useState('');
  const [showCustomTagInput, setShowCustomTagInput] = useState(false);
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<'all' | SymptomCategory>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSubView, setActiveSubView] = useState<'forecast' | 'calendar' | 'trends' | 'log'>('forecast');
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string>('2026-09-12');
  const [prefillLogDate, setPrefillLogDate] = useState<string | null>(null);
  const [quickAlertStatus, setQuickAlertStatus] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<{
    symptom: string;
    category?: SymptomCategory;
    tags?: string[];
    safetyState: 'NORMAL' | 'MONITOR' | 'ESCALATE';
    reason: string;
    action: string;
  } | null>(null);

  const isElder = profile.ageBand === 'elder';

  const commonSymptomPresets: Array<{
    label: string;
    sev: 'mild' | 'moderate' | 'severe';
    cat: SymptomCategory;
    tags: string[];
  }> = [
    {
      label: 'Sternal incision soreness & mild muscular stiffness when turning',
      sev: 'mild',
      cat: 'Pain',
      tags: ['Sternal Incision', 'Muscular Stiffness'],
    },
    {
      label: 'Evening recovery anxiety & restlessness before falling asleep',
      sev: 'moderate',
      cat: 'Mood',
      tags: ['Post-Op Anxiety', 'Sleep Disturbance'],
    },
    {
      label: 'Mild nausea and reduced appetite following oral medications',
      sev: 'mild',
      cat: 'Digestive',
      tags: ['Nausea', 'Loss of Appetite'],
    },
    {
      label: 'Brief lightheadedness upon standing up from bed',
      sev: 'moderate',
      cat: 'Cardiovascular',
      tags: ['Orthostatic Dizziness', 'Bed Transfer'],
    },
    {
      label: 'Mild breathlessness after 50m corridor walking routine',
      sev: 'moderate',
      cat: 'Respiratory',
      tags: ['Shortness of Breath', 'Corridor Walk'],
    },
    {
      label: 'Superficial itching around sternal bandage dressing',
      sev: 'mild',
      cat: 'Wound / Skin',
      tags: ['Incision Itching', 'Bandage Tightness'],
    },
  ];

  const handleCategorySelect = (cat: SymptomCategory) => {
    setSelectedCategory(cat);
    // Suggest first default tag of new category if none currently selected for it
    const config = SYMPTOM_CATEGORIES_CONFIG[cat];
    if (config && config.suggestedTags.length > 0) {
      // keep existing relevant tags or seed with top suggested tag
      setSelectedTags([config.suggestedTags[0]]);
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = customTagInput.trim();
    if (clean && !selectedTags.includes(clean)) {
      setSelectedTags([...selectedTags, clean]);
      setCustomTagInput('');
      setShowCustomTagInput(false);
    }
  };

  const handlePresetClick = (preset: typeof commonSymptomPresets[0]) => {
    setSymptomInput(preset.label);
    setSelectedSeverity(preset.sev);
    setSelectedCategory(preset.cat);
    setSelectedTags(preset.tags);
  };

  const handleInputChange = (text: string) => {
    setSymptomInput(text);
    // If text changes and user has not picked custom tags, gently auto-detect category
    if (text.length > 4) {
      const detectedCat = inferSymptomCategory(text);
      if (detectedCat !== 'Other' && detectedCat !== selectedCategory) {
        // Auto-align category to typed keywords
        setSelectedCategory(detectedCat);
        const inferred = inferSymptomTags(text, detectedCat);
        if (inferred.length > 0) {
          setSelectedTags(inferred);
        }
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!symptomInput.trim()) return;

    setIsSubmitting(true);
    try {
      const finalTags = selectedTags.length > 0 ? selectedTags : inferSymptomTags(symptomInput, selectedCategory);
      let customTimestamp: string | undefined = undefined;
      if (prefillLogDate) {
        const [y, m, d] = prefillLogDate.split('-').map(Number);
        const dt = new Date(y, m - 1, d, 14, 0);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
        customTimestamp = `${monthNames[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}, 02:00 PM`;
      }
      const result = await reportSymptom(symptomInput, selectedSeverity, selectedCategory, finalTags, customTimestamp);
      setLatestResult({
        symptom: result.symptom,
        category: result.category || selectedCategory,
        tags: result.tags || finalTags,
        safetyState: result.safetyState,
        reason: result.reason,
        action: result.actionTaken,
      });
      setSymptomInput('');
      setPrefillLogDate(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered symptom history list
  const filteredHistoryLogs = symptomLogs.filter((log) => {
    if (historyCategoryFilter === 'all') return true;
    const cat = log.category || inferSymptomCategory(log.symptom);
    return cat === historyCategoryFilter;
  });

  const activeCategoryConfig = SYMPTOM_CATEGORIES_CONFIG[selectedCategory];

  return (
    <div id="symptoms-screen" className="space-y-6 pb-16 animate-fade-in">
      {/* Header */}
      <div
        className={`p-6 rounded-3xl ${
          isElder
            ? 'bg-emerald-800 text-white border-2 border-emerald-900'
            : 'bg-white border border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              isElder ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            Deterministic Safety & Categorization Engine
          </span>
          <span className={`text-xs ${isElder ? 'text-emerald-200' : 'text-slate-500'}`}>
            Pain · Mood · Digestive · Cardiopulmonary
          </span>
        </div>
        <h1 className={`font-black tracking-tight ${isElder ? 'text-3xl' : 'text-2xl text-slate-900'}`}>
          Symptom Log & Safety Triage
        </h1>
        <p className={`mt-1 font-medium ${isElder ? 'text-lg text-emerald-100' : 'text-xs text-slate-500'}`}>
          Log symptoms with explicit categories (Pain, Mood, Digestive) and clinical tags to track your recovery trajectory.
        </p>
      </div>

      {/* Sub-View Switcher: Predictive Forecast vs Analytics Trends vs Log Form */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 max-w-3xl w-full">
          <button
            id="symptoms-tab-forecast"
            type="button"
            onClick={() => setActiveSubView('forecast')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeSubView === 'forecast'
                ? 'bg-white text-teal-950 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>Risk Forecast</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-black hidden sm:inline-block">
              High-Risk
            </span>
          </button>

          <button
            id="symptoms-tab-calendar"
            type="button"
            onClick={() => setActiveSubView('calendar')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeSubView === 'calendar'
                ? 'bg-white text-teal-950 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarIcon className="w-4 h-4 text-teal-600" />
            <span>Calendar View</span>
          </button>

          <button
            id="symptoms-tab-trends"
            type="button"
            onClick={() => setActiveSubView('trends')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeSubView === 'trends'
                ? 'bg-white text-teal-950 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-teal-700" />
            <span>Trends</span>
          </button>

          <button
            id="symptoms-tab-log"
            type="button"
            onClick={() => setActiveSubView('log')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeSubView === 'log'
                ? 'bg-white text-emerald-950 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HeartPulse className="w-4 h-4 text-emerald-700" />
            <span>Report</span>
          </button>
        </div>

        {/* Quick Alert Fast Trigger Strip */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-2xl">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />
          <div className="text-xs text-rose-950 min-w-0">
            <span className="font-semibold text-rose-800">Quick Alert Contact:</span>{' '}
            <strong className="font-black truncate">{designatedContact.name}</strong>{' '}
            <span className="text-[11px] text-rose-700">({designatedContact.phone})</span>
          </div>
          <button
            type="button"
            onClick={() =>
              openQuickAlert(
                symptomInput.trim() || 'Severe symptom distress',
                'severe',
                selectedCategory,
                'manual'
              )
            }
            className="ml-auto px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <span>⚡ Trigger SOS</span>
          </button>
        </div>
      </div>

      {/* 1. PREDICTIVE RECURRENCE & HIGH-RISK DAYS VIEW */}
      {activeSubView === 'forecast' && (
        <PredictiveSymptomForecaster
          onLogNewClick={() => setActiveSubView('log')}
          onNavigateToTrends={() => setActiveSubView('trends')}
          onNavigateToCalendar={(dateKey) => {
            if (dateKey) setCalendarSelectedDate(dateKey);
            setActiveSubView('calendar');
          }}
        />
      )}

      {/* 2. CALENDAR HISTORY & DETAILED DAILY LEDGER VIEW */}
      {activeSubView === 'calendar' && (
        <SymptomCalendarView
          initialSelectedDate={calendarSelectedDate}
          onLogNewClick={(dateKey) => {
            if (dateKey) setPrefillLogDate(dateKey);
            setActiveSubView('log');
          }}
          onViewTrendsClick={() => setActiveSubView('trends')}
          onViewForecastClick={() => setActiveSubView('forecast')}
        />
      )}

      {/* 3. RECHARTS ANALYTICS VIEW */}
      {activeSubView === 'trends' && (
        <SymptomAnalyticsDashboard
          onLogNewClick={() => setActiveSubView('log')}
          onViewForecastClick={() => setActiveSubView('forecast')}
          onViewCalendarClick={(dateKey) => {
            if (dateKey) setCalendarSelectedDate(dateKey);
            setActiveSubView('calendar');
          }}
        />
      )}

      {/* 4. LOG & TRIAGE VIEW */}
      {activeSubView === 'log' && (
        <>
          {/* Prefill Date Notice if navigating from Calendar */}
          {prefillLogDate && (
            <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-teal-950 font-bold">
                <CalendarIcon className="w-4 h-4 text-teal-700 shrink-0" />
                <span>
                  Logging symptom for selected calendar date: <strong className="underline">{prefillLogDate}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPrefillLogDate(null)}
                className="text-xs text-teal-800 hover:text-teal-950 font-black underline cursor-pointer shrink-0"
              >
                Reset to Today
              </button>
            </div>
          )}

          {/* Input Section */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-emerald-700" />
                <span>Log Symptom With Category & Tags</span>
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openOnboarding(1)}
                  title="Voice-guided walkthrough on how voice-first symptom logging works"
                  className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-300 text-teal-950 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Headphones className="w-3.5 h-3.5 text-teal-700" />
                  <span>How Voice Works (Guide)</span>
                </button>
                <button
                  type="button"
                  onClick={() => openVoiceLogger('symptom')}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Mic className="w-3.5 h-3.5 text-emerald-700 animate-pulse" />
                  <span>Voice Journal Mode</span>
                </button>
              </div>
            </div>

            {/* Quick Presets (Pain, Mood, Digestive, etc.) */}
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Quick Clinical Presets (Tap to Pre-fill)</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {commonSymptomPresets.map((preset, i) => {
                  const cfg = SYMPTOM_CATEGORIES_CONFIG[preset.cat];
                  const isMatch = symptomInput === preset.label;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handlePresetClick(preset)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isMatch
                          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cfg.badgeClass}`}>
                          {preset.cat}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-slate-400">{preset.sev}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 line-clamp-2">{preset.label}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {preset.tags.map((t) => (
                          <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-200">
              {/* Text Description */}
              <div>
                <label htmlFor="symptom-input-textarea" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  1. Symptom Description
                </label>
                <div className="relative">
                  <textarea
                    id="symptom-input-textarea"
                    rows={isElder ? 3 : 2}
                    value={symptomInput}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder={
                      isElder
                        ? 'Describe how your body feels (e.g. sharp sternal soreness, evening anxiousness, nausea)...'
                        : 'e.g. Mild sternal ache after sitting up, feeling anxious about breathing, nausea post-meds...'
                    }
                    className={`w-full p-4 rounded-2xl border-2 border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-hidden transition-all text-slate-900 ${
                      isElder ? 'text-xl font-medium placeholder:text-slate-400' : 'text-sm'
                    }`}
                  />
                </div>
              </div>

              {/* Category Selector (Explicit Categories: Pain, Mood, Digestive, etc.) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-teal-600" />
                    <span>2. Symptom Category</span>
                    <span className="text-[10px] text-slate-500 font-normal normal-case">(Required for visualization)</span>
                  </label>
                  <span className="text-xs font-semibold text-teal-700">
                    Active: <strong>{activeCategoryConfig.name}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {ALL_SYMPTOM_CATEGORIES.map((cat) => {
                    const cfg = SYMPTOM_CATEGORIES_CONFIG[cat];
                    const isSelected = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategorySelect(cat)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2 ${
                          isSelected
                            ? `${cfg.bgLight} ${cfg.borderLight} ring-2 ring-teal-500 shadow-2xs font-bold`
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 font-medium'
                        }`}
                      >
                        <span className="shrink-0">{CATEGORY_ICONS[cat]}</span>
                        <div className="min-w-0">
                          <p className={`text-xs truncate ${isSelected ? cfg.textDark : 'text-slate-800'}`}>
                            {cat}
                          </p>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-teal-700 ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tags Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    <span>3. Clinical Tags for {selectedCategory}</span>
                    <span className="text-[10px] text-slate-500 font-normal normal-case">(Multi-select to refine dashboard filtering)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCustomTagInput(!showCustomTagInput)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Custom Tag</span>
                  </button>
                </div>

                {/* Tag Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {activeCategoryConfig.suggestedTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span>#{tag}</span>
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })}

                  {/* Custom added tags */}
                  {selectedTags
                    .filter((t) => !activeCategoryConfig.suggestedTags.includes(t))
                    .map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center gap-1.5"
                      >
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className="hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                </div>

                {/* Inline Custom Tag Input */}
                {showCustomTagInput && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 animate-fade-in max-w-sm">
                    <input
                      type="text"
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value)}
                      placeholder="Type custom tag name..."
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 flex-1 focus:ring-1 focus:ring-indigo-500 outline-hidden"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomTag();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomTag}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomTagInput(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Severity & Action Bar */}
              <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
                {/* Severity Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase mr-1">4. Intensity:</span>
                  {(['mild', 'moderate', 'severe'] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSelectedSeverity(sev)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer min-h-[38px] ${
                        selectedSeverity === sev
                          ? sev === 'severe'
                            ? 'bg-rose-600 text-white'
                            : sev === 'moderate'
                            ? 'bg-amber-600 text-white'
                            : 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>

                {/* Voice & Submit */}
                <div className="flex items-center gap-2">
                  <VoiceInputButton
                    onTranscript={(transcript) => handleInputChange(transcript)}
                    label={isElder ? 'Speak Symptom' : 'Speak'}
                  />

                  <button
                    id="submit-symptom-button"
                    type="submit"
                    disabled={isSubmitting || !symptomInput.trim()}
                    className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-xs min-h-[44px]"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'Evaluating...' : 'Evaluate & Log'}</span>
                  </button>
                </div>
              </div>

              {/* Severe Alert Indicator & Direct Trigger */}
              {selectedSeverity === 'severe' && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />
                    <span>
                      <strong>Severe Intensity Selected:</strong> Quick Alert will immediately arm 1-tap SOS SMS and Direct Call to <strong>{designatedContact.name}</strong> ({designatedContact.phone}).
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      openQuickAlert(
                        symptomInput.trim() || 'Severe acute symptom',
                        'severe',
                        selectedCategory,
                        'manual'
                      )
                    }
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <span>⚡ Arm Quick Alert Now</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Latest Evaluation Result */}
          {latestResult && (
            <div
              id="triage-result-card"
              className={`p-6 rounded-3xl border-2 shadow-md space-y-4 animate-scale-in ${
                latestResult.safetyState === 'ESCALATE'
                  ? 'bg-rose-50 border-rose-300 text-rose-950'
                  : latestResult.safetyState === 'MONITOR'
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-950'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {latestResult.safetyState === 'ESCALATE' ? (
                    <ShieldAlert className="w-8 h-8 text-rose-600 shrink-0 animate-bounce" />
                  ) : latestResult.safetyState === 'MONITOR' ? (
                    <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs font-extrabold uppercase tracking-wider">
                        SAFETY STATE: {latestResult.safetyState}
                      </span>
                      {latestResult.category && (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            getCategoryConfig(latestResult.category).badgeClass
                          }`}
                        >
                          {latestResult.category}
                        </span>
                      )}
                      {latestResult.tags &&
                        latestResult.tags.map((t) => (
                          <span
                            key={t}
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/80 border border-black/10 text-slate-700"
                          >
                            #{t}
                          </span>
                        ))}
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mt-0.5">
                      Reported: "{latestResult.symptom}"
                    </h3>
                  </div>
                </div>

                <VoiceReadButton
                  text={`Safety evaluation: ${latestResult.safetyState}. Category: ${
                    latestResult.category || ''
                  }. ${latestResult.reason}. Action: ${latestResult.action}`}
                  label="Listen"
                />
              </div>

              <div className="p-4 bg-white/80 rounded-2xl border border-black/10 space-y-2">
                <p className="text-sm font-bold text-slate-900">Why was this flagged?</p>
                <p className="text-sm text-slate-700">{latestResult.reason}</p>
                <p className="text-xs text-slate-500 pt-1 border-t border-slate-200">
                  <strong>Next Action:</strong> {latestResult.action}
                </p>
              </div>

              {/* Quick Alert Emergency SOS Action Center */}
              {(latestResult.safetyState === 'ESCALATE' || selectedSeverity === 'severe') && (
                <div className="p-4 sm:p-5 bg-rose-100/80 border-2 border-rose-400 rounded-2xl space-y-3.5 animate-fade-in shadow-sm">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse shrink-0" />
                      <span className="text-xs font-black text-rose-950 uppercase tracking-wider">
                        Quick Alert: Designated Emergency Response
                      </span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 border border-rose-300">
                      Auto-Armed for Severe Symptoms
                    </span>
                  </div>

                  {/* Target Contact Card */}
                  <div className="p-3 bg-white rounded-xl border border-rose-200 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                        Designated Emergency Contact
                      </p>
                      <p className="text-sm font-black text-slate-900 truncate">
                        {designatedContact.name}{' '}
                        <span className="text-xs font-semibold text-slate-600">
                          ({designatedContact.relationship})
                        </span>
                      </p>
                      <p className="text-xs font-mono font-bold text-rose-700">
                        {designatedContact.phone}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        openQuickAlert(
                          latestResult.symptom,
                          'severe',
                          latestResult.category,
                          'manual'
                        )
                      }
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 cursor-pointer shrink-0"
                    >
                      Change Contact
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await triggerQuickAlertSMS(
                          latestResult.symptom,
                          designatedContact
                        );
                        if (res.success) {
                          setQuickAlertStatus(
                            `SOS SMS dispatched to ${designatedContact.name} (${designatedContact.phone})`
                          );
                          setTimeout(() => setQuickAlertStatus(null), 6000);
                        }
                      }}
                      className="w-full px-4 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 min-h-[46px]"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Send SOS SMS Now (1-Tap)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerQuickAlertCall(designatedContact);
                        setQuickAlertStatus(`Dialing ${designatedContact.name}...`);
                        setTimeout(() => setQuickAlertStatus(null), 4000);
                      }}
                      className="w-full px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-sm rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 min-h-[46px]"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Direct Call ({designatedContact.name.split(' ')[0]})</span>
                    </button>
                  </div>

                  {/* Status Notification Toast */}
                  {quickAlertStatus && (
                    <div className="p-2.5 bg-emerald-100 border border-emerald-300 rounded-xl text-xs text-emerald-950 font-bold flex items-center gap-2 animate-fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>{quickAlertStatus}</span>
                    </div>
                  )}

                  {/* Secondary Emergency SOS Triggers */}
                  <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-rose-200 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={openEmergencyModal}
                        className="font-bold text-rose-800 hover:text-rose-950 underline cursor-pointer flex items-center gap-1"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                        <span>Open 108 Ambulance Card</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        openQuickAlert(
                          latestResult.symptom,
                          'severe',
                          latestResult.category,
                          'manual'
                        )
                      }
                      className="font-bold text-slate-800 hover:text-slate-950 underline cursor-pointer"
                    >
                      Open Full Quick Alert Dialog &rarr;
                    </button>
                  </div>
                </div>
              )}

              {latestResult.safetyState === 'ESCALATE' && selectedSeverity !== 'severe' && (
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={openEmergencyModal}
                    className="w-full sm:w-auto px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <ShieldAlert className="w-4 h-4" /> Open Emergency SOS Card
                  </button>
                  <a
                    href={`tel:${profile.caregiverPhone.replace(/\s+/g, '')}`}
                    className="w-full sm:w-auto px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <PhoneCall className="w-4 h-4" /> Call Caregiver ({profile.caregiverName})
                  </a>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveSubView('trends')}
                  className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-teal-700" />
                  <span>Inspect on Recharts Trends Dashboard &rarr;</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Symptom History Timeline Ledger */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Recorded Symptom Ledger</span>
              <span className="text-xs font-normal text-slate-500">
                ({filteredHistoryLogs.length} of {symptomLogs.length} events)
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Filtered by category with tags and deterministic safety outcomes
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveSubView('calendar')}
              className="text-xs text-teal-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendar Grid &rarr;</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubView('trends')}
              className="text-xs text-teal-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Visual Trends &rarr;</span>
            </button>
            {activeSubView !== 'log' && (
              <button
                type="button"
                onClick={() => setActiveSubView('log')}
                className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <HeartPulse className="w-3.5 h-3.5" />
                <span>+ Report New</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Chips for History Ledger */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-500 uppercase mr-1 shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" /> Filter:
          </span>
          <button
            type="button"
            onClick={() => setHistoryCategoryFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all shrink-0 ${
              historyCategoryFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({symptomLogs.length})
          </button>

          {ALL_SYMPTOM_CATEGORIES.map((cat) => {
            const count = symptomLogs.filter((l) => (l.category || inferSymptomCategory(l.symptom)) === cat).length;
            if (count === 0) return null;
            const isSelected = historyCategoryFilter === cat;
            const cfg = SYMPTOM_CATEGORIES_CONFIG[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setHistoryCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all shrink-0 flex items-center gap-1 ${
                  isSelected
                    ? `${cfg.badgeClass} ring-2 ring-slate-800 shadow-2xs font-extrabold`
                    : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{cat}</span>
                <span className="text-[10px] opacity-80">({count})</span>
              </button>
            );
          })}
        </div>

        {/* List of Symptoms */}
        <div className="space-y-3">
          {filteredHistoryLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-200 rounded-2xl">
              No symptoms found for category "{historyCategoryFilter}".
            </div>
          ) : (
            filteredHistoryLogs.map((log) => {
              const cat = log.category || inferSymptomCategory(log.symptom);
              const cfg = getCategoryConfig(cat);
              const tags = log.tags && log.tags.length > 0 ? log.tags : inferSymptomTags(log.symptom, cat);

              return (
                <div
                  key={log.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Safety state */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          log.safetyState === 'ESCALATE'
                            ? 'bg-rose-100 text-rose-800'
                            : log.safetyState === 'MONITOR'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {log.safetyState}
                      </span>

                      {/* Category Badge */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cfg.badgeClass}`}>
                        {cat}
                      </span>

                      {/* Severity */}
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                          log.severity === 'severe'
                            ? 'text-rose-700'
                            : log.severity === 'moderate'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {log.severity}
                      </span>

                      <span className="text-slate-400 font-medium">{log.timestamp}</span>
                    </div>

                    <p className="text-sm font-bold text-slate-900">{log.symptom}</p>

                    {/* Tags */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {tags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white text-slate-600 border border-slate-200/90"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-slate-600 text-xs">{log.reason}</p>
                    <p className="text-[11px] text-slate-500">
                      <strong>Action:</strong> {log.actionTaken}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        const parsed = parseLogTimestamp(log.timestamp);
                        setCalendarSelectedDate(toDateKey(parsed));
                        setActiveSubView('calendar');
                      }}
                      className="px-2.5 py-1 text-slate-600 hover:text-teal-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      title="Jump to this date on Calendar Grid"
                    >
                      <CalendarIcon className="w-3.5 h-3.5 text-teal-600" />
                      <span>View in Calendar</span>
                    </button>

                    {log.caregiverNotified && (
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-bold">
                        Caregiver Alerted
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
