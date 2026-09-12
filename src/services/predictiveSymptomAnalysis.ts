import { SymptomCategory, SymptomLog, Profile } from '../types';

export interface RecurringPattern {
  id: string;
  category: SymptomCategory;
  name: string;
  keyLabel: string;
  matchingTags: string[];
  totalOccurrences: number;
  averageSeverity: 'mild' | 'moderate' | 'severe';
  averageIntervalDays: number;
  lastOccurredDate: string;
  daysSinceLastOccurred: number;
  nextProjectedDate: string;
  peakDaysOfWeek: string[];
  commonTimeOfDay: 'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'Varied';
  trend: 'increasing' | 'stable' | 'improving';
  riskContribution: number; // 0-100
  triggerContext: string;
  preventiveAdvice: string[];
}

export interface DayForecast {
  dateStr: string; // YYYY-MM-DD
  formattedDate: string; // e.g. "Sat, Sep 12"
  dayOfWeek: string; // "Saturday"
  isToday: boolean;
  isTomorrow: boolean;
  daysFromToday: number;
  overallRiskScore: number; // 0-100
  riskLevel: 'high' | 'moderate' | 'low';
  topCategory: SymptomCategory;
  likelySymptoms: Array<{
    name: string;
    category: SymptomCategory;
    probability: number; // 0-100%
    expectedSeverity: 'mild' | 'moderate' | 'severe';
    expectedTiming: string;
    rationale: string;
    actionItem: string;
  }>;
  historicalRationale: string;
  preventiveCareTips: string[];
  caregiverAlertRecommended: boolean;
  suggestedPacing: string;
}

export interface PredictiveAnalysisSummary {
  highestRiskDay: DayForecast | null;
  highRiskCount: number;
  moderateRiskCount: number;
  lowRiskCount: number;
  recurringPatterns: RecurringPattern[];
  forecastNext7Days: DayForecast[];
  primaryConcernCategory: SymptomCategory;
  clinicalNarrative: string;
  generatedAt: string;
  analyzedLogsCount: number;
  overallRecoveryTrajectory: 'improving' | 'cyclical' | 'elevated';
}

/**
 * Robust date parser for various timestamp formats present in SATHI:
 * - "Sept 6, 2026, 04:30 PM"
 * - "Sept 6, 2026"
 * - "Yesterday, 04:30 PM"
 * - "Today, 09:15 AM"
 * - "Just now"
 * - ISO string
 */
export function parseLogTimestamp(timestampStr: string, baseDate = new Date(2026, 8, 12, 12, 0, 0)): Date {
  if (!timestampStr) return baseDate;

  const raw = timestampStr.trim();
  const lower = raw.toLowerCase();

  if (lower.includes('just now') || lower === 'today') {
    return new Date(baseDate);
  }

  if (lower.startsWith('today')) {
    const timePart = raw.split(',')[1]?.trim();
    return parseTimeIntoDate(new Date(baseDate), timePart);
  }

  if (lower.startsWith('yesterday')) {
    const yesterday = new Date(baseDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const timePart = raw.split(',')[1]?.trim();
    return parseTimeIntoDate(yesterday, timePart);
  }

  // Handle formats like "Sept 6, 2026, 04:30 PM" or "Sep 6, 2026"
  const standardMatch = raw.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})(?:,\s*(.*))?/);
  if (standardMatch) {
    const monthName = standardMatch[1].slice(0, 3).toLowerCase();
    const day = parseInt(standardMatch[2], 10);
    const year = parseInt(standardMatch[3], 10);
    const timeStr = standardMatch[4];

    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };

    const monthIndex = months[monthName] ?? 8;
    const dateObj = new Date(year, monthIndex, day, 12, 0, 0);
    if (timeStr) {
      return parseTimeIntoDate(dateObj, timeStr);
    }
    return dateObj;
  }

  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return baseDate;
}

function parseTimeIntoDate(targetDate: Date, timeStr?: string): Date {
  if (!timeStr) return targetDate;
  const match = timeStr.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return targetDate;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  targetDate.setHours(hours, minutes, 0, 0);
  return targetDate;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Deterministic Clinical Predictive Symptom Engine
 * Analyzes recurring patterns, intervals, day-of-week clustering, and time-of-day trends.
 */
export function analyzeSymptomHistory(
  logs: SymptomLog[],
  referenceDate = new Date(2026, 8, 12, 12, 0, 0) // Default Saturday Sep 12, 2026
): PredictiveAnalysisSummary {
  if (!logs || logs.length === 0) {
    return createEmptyForecast(referenceDate);
  }

  // 1. Sort logs chronologically
  const sortedLogs = [...logs].map((log) => ({
    ...log,
    parsedDate: parseLogTimestamp(log.timestamp, referenceDate),
  })).sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

  // 2. Identify and cluster recurring symptom groups
  const clusters: Record<string, {
    category: SymptomCategory;
    name: string;
    keyLabel: string;
    matchingTags: Set<string>;
    logs: typeof sortedLogs;
  }> = {};

  sortedLogs.forEach((item) => {
    const cat = item.category || 'Other';
    const textLower = item.symptom.toLowerCase();
    const tags = item.tags || [];

    // Form a distinctive cluster key
    let clusterKey = `${cat}_general`;
    let clusterName = `${cat} Flare-up`;

    if (cat === 'Pain') {
      if (textLower.includes('sternal') || textLower.includes('chest') || tags.some(t => t.toLowerCase().includes('sternal'))) {
        clusterKey = 'pain_sternal';
        clusterName = 'Sternal Incision Soreness & Stiffness';
      } else if (textLower.includes('vein') || textLower.includes('leg') || textLower.includes('harvest')) {
        clusterKey = 'pain_harvest_leg';
        clusterName = 'Donor Vein Harvest Leg Tightness';
      } else {
        clusterKey = 'pain_muscular';
        clusterName = 'Post-op Muscular Soreness';
      }
    } else if (cat === 'Cardiovascular' || textLower.includes('dizzy') || tags.some(t => t.toLowerCase().includes('dizziness'))) {
      clusterKey = 'cardio_dizziness';
      clusterName = 'Orthostatic Dizziness upon Transfer';
    } else if (cat === 'Respiratory' || textLower.includes('breath')) {
      clusterKey = 'resp_breathlessness';
      clusterName = 'Post-Exertional Shortness of Breath';
    } else if (cat === 'Fatigue') {
      clusterKey = 'fatigue_afternoon';
      clusterName = 'Mid-Afternoon Metabolic Fatigue Slump';
    } else if (cat === 'Digestive') {
      if (textLower.includes('nausea') || textLower.includes('appetite')) {
        clusterKey = 'digestive_nausea';
        clusterName = 'Midday Medication Nausea';
      } else {
        clusterKey = 'digestive_bowel';
        clusterName = 'Reduced-Mobility Bowel Sluggishness';
      }
    } else if (cat === 'Mood' || textLower.includes('anxiety') || textLower.includes('sleep')) {
      clusterKey = 'mood_anxiety';
      clusterName = 'Evening Recovery Anxiety & Sleep Transition';
    } else if (cat === 'Wound / Skin') {
      clusterKey = 'wound_healing';
      clusterName = 'Surgical Wound Dressing Pruritus & Itching';
    } else if (cat === 'Mobility') {
      clusterKey = 'mobility_fatigue';
      clusterName = 'Calf & Ambulation Tiredness';
    }

    if (!clusters[clusterKey]) {
      clusters[clusterKey] = {
        category: cat,
        name: clusterName,
        keyLabel: clusterKey,
        matchingTags: new Set(),
        logs: [],
      };
    }

    clusters[clusterKey].logs.push(item);
    tags.forEach((t) => clusters[clusterKey].matchingTags.add(t));
  });

  // 3. Compute recurring pattern metrics
  const recurringPatterns: RecurringPattern[] = [];

  Object.entries(clusters).forEach(([key, cluster]) => {
    const count = cluster.logs.length;
    if (count === 0) return;

    // Calculate recurrence intervals
    let avgIntervalDays = 2.5; // default fallback
    if (count > 1) {
      let totalDiffMs = 0;
      for (let i = 1; i < count; i++) {
        totalDiffMs += Math.max(0, cluster.logs[i].parsedDate.getTime() - cluster.logs[i - 1].parsedDate.getTime());
      }
      const days = totalDiffMs / (count - 1) / (1000 * 60 * 60 * 24);
      avgIntervalDays = Math.max(1, Math.round(days * 10) / 10);
    }

    const lastLog = cluster.logs[cluster.logs.length - 1];
    const msSinceLast = Math.max(0, referenceDate.getTime() - lastLog.parsedDate.getTime());
    const daysSinceLast = Math.round((msSinceLast / (1000 * 60 * 60 * 24)) * 10) / 10;

    // Compute peak days of week
    const dayCounts: Record<number, number> = {};
    cluster.logs.forEach((l) => {
      const day = l.parsedDate.getDay();
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    const sortedDays = Object.entries(dayCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([dayNum]) => DAY_NAMES[parseInt(dayNum, 10)]);

    const peakDays = sortedDays.slice(0, 2);

    // Common time of day
    let morningCount = 0, afternoonCount = 0, eveningCount = 0, nightCount = 0;
    cluster.logs.forEach((l) => {
      const hour = l.parsedDate.getHours();
      if (hour >= 5 && hour < 12) morningCount++;
      else if (hour >= 12 && hour < 17) afternoonCount++;
      else if (hour >= 17 && hour < 21) eveningCount++;
      else nightCount++;
    });

    let timeOfDay: 'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'Varied' = 'Varied';
    const maxTime = Math.max(morningCount, afternoonCount, eveningCount, nightCount);
    if (maxTime === morningCount) timeOfDay = 'Morning';
    else if (maxTime === afternoonCount) timeOfDay = 'Afternoon';
    else if (maxTime === eveningCount) timeOfDay = 'Evening';
    else if (maxTime === nightCount) timeOfDay = 'Night';

    // Average severity
    const sevScore = cluster.logs.reduce((acc, l) => {
      if (l.severity === 'severe') return acc + 3;
      if (l.severity === 'moderate') return acc + 2;
      return acc + 1;
    }, 0) / count;

    const avgSeverity: 'mild' | 'moderate' | 'severe' =
      sevScore >= 2.3 ? 'severe' : sevScore >= 1.6 ? 'moderate' : 'mild';

    // Projected next date
    const nextDate = new Date(lastLog.parsedDate);
    nextDate.setDate(nextDate.getDate() + Math.round(avgIntervalDays));
    const nextProjectedDate = nextDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    // Trend assessment
    let trend: 'increasing' | 'stable' | 'improving' = 'stable';
    if (count >= 3) {
      const recentSev = cluster.logs.slice(-2).reduce((s, l) => s + (l.severity === 'severe' ? 3 : l.severity === 'moderate' ? 2 : 1), 0) / 2;
      const olderSev = cluster.logs.slice(0, 2).reduce((s, l) => s + (l.severity === 'severe' ? 3 : l.severity === 'moderate' ? 2 : 1), 0) / 2;
      if (recentSev < olderSev) trend = 'improving';
      else if (recentSev > olderSev) trend = 'increasing';
    }

    const { triggerContext, preventiveAdvice } = getClinicalAdviceForPattern(cluster.category, key);

    // Calculate risk contribution
    const recencyRatio = daysSinceLast / avgIntervalDays;
    let riskContribution = Math.min(95, Math.round(recencyRatio * 45 + (sevScore * 18) + (count * 4)));
    if (recencyRatio > 2.5) riskContribution = Math.max(20, riskContribution - 20); // If overdue long without incident, might be resolved

    recurringPatterns.push({
      id: `pat-${key}`,
      category: cluster.category,
      name: cluster.name,
      keyLabel: key,
      matchingTags: Array.from(cluster.matchingTags),
      totalOccurrences: count,
      averageSeverity: avgSeverity,
      averageIntervalDays: avgIntervalDays,
      lastOccurredDate: lastLog.parsedDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      daysSinceLastOccurred: daysSinceLast,
      nextProjectedDate,
      peakDaysOfWeek: peakDays.length > 0 ? peakDays : ['Thursday', 'Friday'],
      commonTimeOfDay: timeOfDay,
      trend,
      riskContribution,
      triggerContext,
      preventiveAdvice,
    });
  });

  // Sort patterns by risk contribution
  recurringPatterns.sort((a, b) => b.riskContribution - a.riskContribution);

  // 4. Calculate day-of-week historical baseline risks (0-100)
  const dayOfWeekHistoricalLoad: Record<number, number> = {
    0: 25, // Sunday
    1: 30, // Monday
    2: 35, // Tuesday
    3: 40, // Wednesday
    4: 75, // Thursday (peak post-op physical exertion)
    5: 80, // Friday (cumulative physical therapy exertion)
    6: 45, // Saturday
  };

  // Enhance with user's actual day occurrences
  sortedLogs.forEach((l) => {
    const d = l.parsedDate.getDay();
    const weight = l.severity === 'severe' ? 20 : l.severity === 'moderate' ? 12 : 6;
    dayOfWeekHistoricalLoad[d] = Math.min(95, (dayOfWeekHistoricalLoad[d] || 30) + weight);
  });

  // 5. Generate 7-Day Forecast (Today + next 6 days)
  const forecastNext7Days: DayForecast[] = [];

  for (let offset = 0; offset < 7; offset++) {
    const currentTarget = new Date(referenceDate);
    currentTarget.setDate(currentTarget.getDate() + offset);

    const dayOfWeekIndex = currentTarget.getDay();
    const dayOfWeekName = DAY_NAMES[dayOfWeekIndex];
    const isToday = offset === 0;
    const isTomorrow = offset === 1;

    const dateStr = currentTarget.toISOString().split('T')[0];
    const formattedDate = currentTarget.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    // Determine which recurring patterns are due or elevated on this day
    const likelySymptoms: DayForecast['likelySymptoms'] = [];
    let combinedDayRisk = 0;

    recurringPatterns.forEach((pat) => {
      const daysFromLast = pat.daysSinceLastOccurred + offset;
      const interval = pat.averageIntervalDays;
      const cyclePosition = (daysFromLast % interval) / interval;

      // Peak risk occurs near 0.8 - 1.2 of the interval cycle or on historically peak days
      const isDayOfWeekMatch = pat.peakDaysOfWeek.includes(dayOfWeekName);
      const isCycleDue = Math.abs(daysFromLast - interval) <= 0.8 || (daysFromLast >= interval && cyclePosition < 0.3);

      let probability = 30; // baseline
      if (isCycleDue) probability += 35;
      if (isDayOfWeekMatch) probability += 25;
      if (pat.averageSeverity === 'moderate' || pat.averageSeverity === 'severe') probability += 10;
      if (pat.trend === 'improving') probability -= 15;

      probability = Math.min(95, Math.max(15, probability));

      if (probability >= 45 || isDayOfWeekMatch || isCycleDue) {
        combinedDayRisk += probability * 0.4;
        likelySymptoms.push({
          name: pat.name,
          category: pat.category,
          probability,
          expectedSeverity: pat.averageSeverity,
          expectedTiming: `${pat.commonTimeOfDay} (${getTimeRangeForLabel(pat.commonTimeOfDay)})`,
          rationale: `Historically recurs every ~${pat.averageIntervalDays} days. ${daysFromLast.toFixed(0)} days since last log.${isDayOfWeekMatch ? ` ${dayOfWeekName} has high historical frequency.` : ''}`,
          actionItem: pat.preventiveAdvice[0] || 'Observe and keep medications on schedule.',
        });
      }
    });

    // Blend with day-of-week load
    const dowLoad = dayOfWeekHistoricalLoad[dayOfWeekIndex] || 35;
    const rawScore = Math.round(dowLoad * 0.45 + combinedDayRisk * 0.55);
    const overallRiskScore = Math.min(95, Math.max(15, rawScore));

    const riskLevel: 'high' | 'moderate' | 'low' =
      overallRiskScore >= 65 ? 'high' : overallRiskScore >= 38 ? 'moderate' : 'low';

    // Sort symptoms by probability
    likelySymptoms.sort((a, b) => b.probability - a.probability);

    const topCategory: SymptomCategory =
      likelySymptoms[0]?.category || (overallRiskScore >= 65 ? 'Pain' : 'Fatigue');

    // Historical Rationale
    let historicalRationale = `Low baseline variance expected for ${dayOfWeekName}. Standard recovery pace indicated.`;
    if (riskLevel === 'high') {
      historicalRationale = `High Risk Warning: ${dayOfWeekName} matches historical peak windows where cumulative ambulation fatigue and surgical site tightness (e.g. sternal/vein harvest) coincide with cyclic recurrence intervals (~${recurringPatterns[0]?.averageIntervalDays || 3} days).`;
    } else if (riskLevel === 'moderate') {
      historicalRationale = `Moderate Attention Advised: Anticipate mild post-exertional fatigue or posture transition sensitivity based on multi-day historical intervals.`;
    }

    // Preventive tips
    const preventiveCareTips = generateDayPreventiveTips(riskLevel, likelySymptoms, topCategory);

    forecastNext7Days.push({
      dateStr,
      formattedDate,
      dayOfWeek: dayOfWeekName,
      isToday,
      isTomorrow,
      daysFromToday: offset,
      overallRiskScore,
      riskLevel,
      topCategory,
      likelySymptoms,
      historicalRationale,
      preventiveCareTips,
      caregiverAlertRecommended: riskLevel === 'high',
      suggestedPacing: riskLevel === 'high' ? 'Paced & Protected (Rest periods every 2 hrs)' : riskLevel === 'moderate' ? 'Standard Ambulatory Pacing' : 'Normal Active Recovery',
    });
  }

  // Count risk levels
  const highRiskCount = forecastNext7Days.filter((d) => d.riskLevel === 'high').length;
  const moderateRiskCount = forecastNext7Days.filter((d) => d.riskLevel === 'moderate').length;
  const lowRiskCount = forecastNext7Days.filter((d) => d.riskLevel === 'low').length;

  const highestRiskDay = [...forecastNext7Days].sort((a, b) => b.overallRiskScore - a.overallRiskScore)[0] || null;

  // Primary concern category
  const categoryCounts: Record<string, number> = {};
  sortedLogs.forEach((l) => {
    const c = l.category || 'Pain';
    categoryCounts[c] = (categoryCounts[c] || 0) + (l.severity === 'severe' ? 3 : l.severity === 'moderate' ? 2 : 1);
  });
  const primaryConcernCategory = (Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as SymptomCategory) || 'Pain';

  // Trajectory
  const severeCount = sortedLogs.filter((l) => l.severity === 'severe').length;
  const overallRecoveryTrajectory: 'improving' | 'cyclical' | 'elevated' =
    severeCount >= 2 ? 'elevated' : highRiskCount >= 2 ? 'cyclical' : 'improving';

  // Clinical synthesis narrative
  const clinicalNarrative = generateClinicalNarrative(
    highestRiskDay,
    recurringPatterns,
    primaryConcernCategory,
    sortedLogs.length
  );

  return {
    highestRiskDay,
    highRiskCount,
    moderateRiskCount,
    lowRiskCount,
    recurringPatterns,
    forecastNext7Days,
    primaryConcernCategory,
    clinicalNarrative,
    generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    analyzedLogsCount: sortedLogs.length,
    overallRecoveryTrajectory,
  };
}

function getTimeRangeForLabel(time: string): string {
  switch (time) {
    case 'Morning': return '08:00 AM - 11:30 AM';
    case 'Afternoon': return '01:30 PM - 04:30 PM';
    case 'Evening': return '06:00 PM - 08:30 PM';
    case 'Night': return '09:00 PM - 11:30 PM';
    default: return 'Daytime';
  }
}

function getClinicalAdviceForPattern(category: SymptomCategory, key: string): { triggerContext: string; preventiveAdvice: string[] } {
  switch (key) {
    case 'pain_sternal':
      return {
        triggerContext: 'Turning in bed, coughing without heart pillow, or excessive upper-torso reaching.',
        preventiveAdvice: [
          'Hug heart pillow firmly to chest prior to changing sitting posture or coughing.',
          'Take scheduled analgesics 30 minutes before morning corridor walking.',
          'Avoid lifting objects over 2.5 kg or pushing heavily on armrests when standing up.',
        ],
      };
    case 'pain_harvest_leg':
      return {
        triggerContext: 'Prolonged sitting with legs dependent, standing in one spot, or missed elevation.',
        preventiveAdvice: [
          'Elevate operated leg on 2 soft pillows whenever reclining for 30+ minutes.',
          'Wear prescribed thigh-high or knee-high compression stockings before morning steps.',
          'Perform gentle seated ankle-pump flexes (10 reps every hour) to maintain venous return.',
        ],
      };
    case 'cardio_dizziness':
      return {
        triggerContext: 'Rapid postural change from supine/sleeping position under beta-blocker therapy.',
        preventiveAdvice: [
          'Sit on the edge of the bed ("dangle feet") for 2 full minutes before standing.',
          'Drink a glass of water before getting out of bed to prevent orthostatic drops.',
          'Have a family member nearby for the first morning transfer.',
        ],
      };
    case 'fatigue_afternoon':
      return {
        triggerContext: 'Post-prandial blood flow redistribution and mid-day metabolic recovery demand.',
        preventiveAdvice: [
          'Protect a mandatory 45-minute horizontal rest window between 02:00 PM and 03:30 PM.',
          'Keep lunch portions balanced and avoid heavy high-glycemic carbohydrates.',
          'Complete physical ambulation tasks in the cooler morning hours.',
        ],
      };
    case 'mood_anxiety':
      return {
        triggerContext: 'Evening quiet hours, fear of nighttime complications, and post-op sleep transition.',
        preventiveAdvice: [
          'Listen to 5-10 minutes of gentle diaphragmatic relaxation audio before bedtime.',
          'Review the next day’s completed medicine checklist with caregiver for reassurance.',
          'Keep room dimly lit and maintain consistent bedtime (by 10:00 PM).',
        ],
      };
    case 'digestive_nausea':
      return {
        triggerContext: 'Medication administration on an insufficiently padded stomach.',
        preventiveAdvice: [
          'Never take midday capsules without a small snack (toast, crackers, or warm milk).',
          'Sip warm ginger or cumin-infused water after taking medications.',
        ],
      };
    default:
      return {
        triggerContext: 'Physical exertion and post-surgical tissue healing cycles.',
        preventiveAdvice: [
          'Pace all recovery activities and avoid back-to-back walking sessions without rest.',
          'Maintain 1.5 - 2 liters of fluid hydration throughout the day unless fluid restricted.',
          'Report any abrupt change in symptom intensity to caregiver or doctor.',
        ],
      };
  }
}

function generateDayPreventiveTips(
  riskLevel: 'high' | 'moderate' | 'low',
  likelySymptoms: DayForecast['likelySymptoms'],
  topCategory: SymptomCategory
): string[] {
  if (riskLevel === 'high') {
    return [
      `Pre-plan 2 scheduled rest periods (morning and afternoon) before ${likelySymptoms[0]?.name || 'discomfort'} peaks.`,
      `Keep heart pillow and compression aids ready at bedside; inform caregiver ahead of physical tasks.`,
      `Take scheduled doses with meals strictly on time to preserve therapeutic analgesic coverage.`,
    ];
  }

  if (riskLevel === 'moderate') {
    return [
      `Pace corridor walking in two 10-minute bouts rather than one continuous 20-minute walk.`,
      `Stay well hydrated and practice 5 gentle deep breathing incentive spirometer cycles.`,
      `Observe for early signs of ${topCategory.toLowerCase()} fatigue and rest at first notice.`,
    ];
  }

  return [
    `Baseline recovery rhythm expected. Continue prescribed routine tasks safely.`,
    `Log any new observations on your SATHI voice timeline as they happen.`,
  ];
}

function generateClinicalNarrative(
  highestRiskDay: DayForecast | null,
  patterns: RecurringPattern[],
  primaryCategory: SymptomCategory,
  totalLogs: number
): string {
  if (!highestRiskDay) {
    return 'Consistent recovery trajectory observed with stable baseline metrics across all recorded symptoms.';
  }

  const dayName = highestRiskDay.dayOfWeek;
  const topSymptom = highestRiskDay.likelySymptoms[0]?.name || 'discomfort';

  return `Predictive analysis of ${totalLogs} historical symptom entries indicates a cyclical recurrence pattern primarily centered on ${primaryCategory} (e.g. ${topSymptom}). Historically, symptoms cluster around ${highestRiskDay.formattedDate} (${dayName}) due to mid-week physical exertion and the ~${patterns[0]?.averageIntervalDays || 2.5}-day healing interval. Proactive pacing and scheduled rest on ${dayName} are clinically advised.`;
}

function createEmptyForecast(referenceDate: Date): PredictiveAnalysisSummary {
  const forecast: DayForecast[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() + i);
    forecast.push({
      dateStr: d.toISOString().split('T')[0],
      formattedDate: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      dayOfWeek: DAY_NAMES[d.getDay()],
      isToday: i === 0,
      isTomorrow: i === 1,
      daysFromToday: i,
      overallRiskScore: 20,
      riskLevel: 'low',
      topCategory: 'Pain',
      likelySymptoms: [],
      historicalRationale: 'No historical symptom logs recorded yet. Maintain general discharge recovery guidance.',
      preventiveCareTips: ['Continue standard recovery tasks as directed by your doctor.'],
      caregiverAlertRecommended: false,
      suggestedPacing: 'Normal Active Recovery',
    });
  }

  return {
    highestRiskDay: null,
    highRiskCount: 0,
    moderateRiskCount: 0,
    lowRiskCount: 7,
    recurringPatterns: [],
    forecastNext7Days: forecast,
    primaryConcernCategory: 'Pain',
    clinicalNarrative: 'Awaiting sufficient historical symptom entries to project recurring risk patterns.',
    generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    analyzedLogsCount: 0,
    overallRecoveryTrajectory: 'improving',
  };
}
