/**
 * Clinical Medication Schedule Parser & Alert Engine for SATHI
 * Parses OCR-extracted prescription frequency codes (e.g. 1-0-1, BD, TDS, HS, AC, PC),
 * resolves explicit and meal-relative dose times, and generates local notification alerts.
 */

import { ParsedDosageSlot, ScannedMedicationItem, Medication, MedicationDoseAlert, ProvenanceTag } from '../types';

// Standard Clinical Time Slots for Indian & International Post-Op Home Care
export const STANDARD_DOSE_TIMES = {
  emptyStomachMorning: { time24: '07:30', time12: '07:30 AM', label: 'Empty Stomach (Pre-Breakfast)' },
  morningAfterFood: { time24: '08:30', time12: '08:30 AM', label: 'Morning (Post-Breakfast)' },
  middayLunch: { time24: '13:00', time12: '01:00 PM', label: 'Afternoon (Post-Lunch)' },
  eveningTea: { time24: '17:30', time12: '05:30 PM', label: 'Evening (Tea / Snack)' },
  nightDinner: { time24: '20:30', time12: '08:30 PM', label: 'Night (Post-Dinner)' },
  bedtime: { time24: '21:30', time12: '09:30 PM', label: 'Bedtime (Before Sleep)' },
};

/**
 * Converts 24-hour time "HH:MM" to 12-hour "hh:mm AM/PM"
 */
export function formatTime12(time24: string): string {
  if (!time24 || !time24.includes(':')) return '08:00 AM';
  const parts = time24.split(':');
  let hour = parseInt(parts[0], 10);
  const minute = parts[1] || '00';
  if (isNaN(hour)) return '08:00 AM';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  const hourStr = hour < 10 ? `0${hour}` : `${hour}`;
  return `${hourStr}:${minute} ${ampm}`;
}

/**
 * Converts 12-hour "hh:mm AM/PM" to 24-hour "HH:MM"
 */
export function formatTime24(time12: string): string {
  if (!time12) return '08:30';
  const clean = time12.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  const timePart = clean.replace(/AM|PM/g, '').trim();
  const parts = timePart.split(':');
  let hour = parseInt(parts[0], 10) || 8;
  const minute = parts[1] ? parts[1].slice(0, 2) : '00';

  if (isPM && hour < 12) hour += 12;
  if (isAM && hour === 12) hour = 0;

  const hStr = hour < 10 ? `0${hour}` : `${hour}`;
  return `${hStr}:${minute}`;
}

/**
 * Determines relationship to meal from prescription text
 */
function detectMealRelation(text: string): 'before_food' | 'after_food' | 'with_food' | 'bedtime' | 'anytime' {
  const lower = text.toLowerCase();
  if (
    lower.includes('empty stomach') ||
    lower.includes('before food') ||
    lower.includes('before meal') ||
    lower.includes('before breakfast') ||
    /\b(ac|ante cibum)\b/.test(lower)
  ) {
    return 'before_food';
  }
  if (
    lower.includes('bedtime') ||
    lower.includes('at bedtime') ||
    lower.includes('before sleep') ||
    /\b(hs|hora somni)\b/.test(lower)
  ) {
    return 'bedtime';
  }
  if (
    lower.includes('with food') ||
    lower.includes('with meal') ||
    lower.includes('with breakfast')
  ) {
    return 'with_food';
  }
  if (
    lower.includes('after food') ||
    lower.includes('after meal') ||
    lower.includes('after meals') ||
    lower.includes('after breakfast') ||
    lower.includes('after dinner') ||
    lower.includes('after lunch') ||
    /\b(pc|post cibum)\b/.test(lower)
  ) {
    return 'after_food';
  }
  return 'anytime';
}

/**
 * Searches for explicit time strings (e.g. "08:00 AM", "8:30pm", "13:00")
 */
function extractExplicitTimes(text: string): string[] {
  const matches: string[] = [];
  // Match "08:00 AM", "8:30 PM", "08:00am"
  const regex12 = /\b(0?[1-9]|1[0-2]):([0-5][0-9])\s*(am|pm)\b/gi;
  let match;
  while ((match = regex12.exec(text)) !== null) {
    matches.push(formatTime12(formatTime24(match[0])));
  }
  return matches;
}

/**
 * Parses OCR medication timing string into concrete daily dosage time slots
 */
export function parseMedicationTimingToSlots(
  name: string,
  timing: string,
  instructions: string = '',
  defaultPeriod?: 'morning' | 'afternoon' | 'evening' | 'night'
): ParsedDosageSlot[] {
  const combined = `${timing} ${instructions}`.trim();
  const lower = combined.toLowerCase();
  const mealRelation = detectMealRelation(combined);
  const explicitTimes = extractExplicitTimes(combined);

  // 1. Check for standard 3-part or 4-part frequency pattern (e.g., 1-0-1, 1-0-0, 0-0-1, 1-1-1, 1-1-1-1)
  const patternMatch = combined.match(/\b([0-2](?:\.5|\/2)?)\s*[-/.]\s*([0-2](?:\.5|\/2)?)\s*[-/.]\s*([0-2](?:\.5|\/2)?)(?:\s*[-/.]\s*([0-2](?:\.5|\/2)?))?\b/);

  if (patternMatch) {
    const morningDose = patternMatch[1];
    const afternoonDose = patternMatch[2];
    const nightDose = patternMatch[3];
    const eveningOrFourthDose = patternMatch[4];

    const slots: ParsedDosageSlot[] = [];

    // Morning Slot
    if (morningDose && morningDose !== '0') {
      const isAC = mealRelation === 'before_food';
      const defaultTime = isAC ? STANDARD_DOSE_TIMES.emptyStomachMorning : STANDARD_DOSE_TIMES.morningAfterFood;
      slots.push({
        slotId: `slot-morn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        label: isAC ? 'Morning Dose (Empty Stomach · 30m Before Breakfast)' : 'Morning Dose (Post-Breakfast)',
        time: defaultTime.time12,
        time24: defaultTime.time24,
        period: 'morning',
        relationToMeal: isAC ? 'before_food' : 'after_food',
        instructions: instructions || (isAC ? 'Take 30 minutes before breakfast with plain water' : 'Take after breakfast with water'),
      });
    }

    // Afternoon Slot
    if (afternoonDose && afternoonDose !== '0') {
      slots.push({
        slotId: `slot-aft-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        label: 'Afternoon Dose (Post-Lunch)',
        time: STANDARD_DOSE_TIMES.middayLunch.time12,
        time24: STANDARD_DOSE_TIMES.middayLunch.time24,
        period: 'afternoon',
        relationToMeal: 'after_food',
        instructions: instructions || 'Take after lunch with water',
      });
    }

    // 4th Dose (if 4-part like 1-1-1-1 or 1-0-1-1)
    if (eveningOrFourthDose && eveningOrFourthDose !== '0') {
      slots.push({
        slotId: `slot-eve-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        label: 'Evening Dose (Tea / Snack)',
        time: STANDARD_DOSE_TIMES.eveningTea.time12,
        time24: STANDARD_DOSE_TIMES.eveningTea.time24,
        period: 'evening',
        relationToMeal: 'with_food',
        instructions: instructions || 'Take in the evening with light snack or water',
      });
    }

    // Night Slot
    if (nightDose && nightDose !== '0') {
      const isHS = mealRelation === 'bedtime' || lower.includes('bedtime') || lower.includes('hs');
      const defaultTime = isHS ? STANDARD_DOSE_TIMES.bedtime : STANDARD_DOSE_TIMES.nightDinner;
      slots.push({
        slotId: `slot-night-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        label: isHS ? 'Bedtime Dose (Night · Before Sleep)' : 'Night Dose (Post-Dinner)',
        time: defaultTime.time12,
        time24: defaultTime.time24,
        period: 'night',
        relationToMeal: isHS ? 'bedtime' : 'after_food',
        instructions: instructions || (isHS ? 'Take at bedtime before sleep' : 'Take after dinner with water'),
      });
    }

    if (slots.length > 0) return slots;
  }

  // 2. Check for Medical Abbreviations: BD / BID (Twice Daily)
  if (/\b(bd|bid)\b/.test(lower) || lower.includes('twice daily') || lower.includes('twice a day')) {
    return [
      {
        slotId: `slot-bd-1-${Date.now()}`,
        label: 'Morning Dose (Post-Breakfast)',
        time: STANDARD_DOSE_TIMES.morningAfterFood.time12,
        time24: STANDARD_DOSE_TIMES.morningAfterFood.time24,
        period: 'morning',
        relationToMeal: 'after_food',
        instructions: instructions || 'Take after morning breakfast with water',
      },
      {
        slotId: `slot-bd-2-${Date.now()}`,
        label: 'Night Dose (Post-Dinner)',
        time: STANDARD_DOSE_TIMES.nightDinner.time12,
        time24: STANDARD_DOSE_TIMES.nightDinner.time24,
        period: 'night',
        relationToMeal: 'after_food',
        instructions: instructions || 'Take after night dinner with water',
      },
    ];
  }

  // 3. Check for TDS / TID (Three Times Daily)
  if (/\b(tds|tid)\b/.test(lower) || lower.includes('three times') || lower.includes('thrice')) {
    return [
      {
        slotId: `slot-tid-1-${Date.now()}`,
        label: 'Morning Dose (Post-Breakfast)',
        time: STANDARD_DOSE_TIMES.morningAfterFood.time12,
        time24: STANDARD_DOSE_TIMES.morningAfterFood.time24,
        period: 'morning',
        relationToMeal: 'after_food',
        instructions: instructions || 'Take after breakfast with water',
      },
      {
        slotId: `slot-tid-2-${Date.now()}`,
        label: 'Afternoon Dose (Post-Lunch)',
        time: STANDARD_DOSE_TIMES.middayLunch.time12,
        time24: STANDARD_DOSE_TIMES.middayLunch.time24,
        period: 'afternoon',
        relationToMeal: 'after_food',
        instructions: instructions || 'Take after lunch with water',
      },
      {
        slotId: `slot-tid-3-${Date.now()}`,
        label: 'Night Dose (Post-Dinner)',
        time: STANDARD_DOSE_TIMES.nightDinner.time12,
        time24: STANDARD_DOSE_TIMES.nightDinner.time24,
        period: 'night',
        relationToMeal: 'after_food',
        instructions: instructions || 'Take after dinner with water',
      },
    ];
  }

  // 4. Check for QID / QDS (Four Times Daily)
  if (/\b(qid|qds)\b/.test(lower) || lower.includes('four times')) {
    return [
      {
        slotId: `slot-qid-1-${Date.now()}`,
        label: 'Early Morning Dose',
        time: '08:00 AM',
        time24: '08:00',
        period: 'morning',
        relationToMeal: 'after_food',
        instructions: instructions || 'Take morning dose with water',
      },
      {
        slotId: `slot-qid-2-${Date.now()}`,
        label: 'Midday Dose',
        time: '12:30 PM',
        time24: '12:30',
        period: 'afternoon',
        relationToMeal: 'after_food',
        instructions: instructions || 'Take midday dose with food',
      },
      {
        slotId: `slot-qid-3-${Date.now()}`,
        label: 'Evening Dose',
        time: '05:30 PM',
        time24: '17:30',
        period: 'evening',
        relationToMeal: 'with_food',
        instructions: instructions || 'Take evening dose with snack',
      },
      {
        slotId: `slot-qid-4-${Date.now()}`,
        label: 'Bedtime Dose',
        time: '09:30 PM',
        time24: '21:30',
        period: 'night',
        relationToMeal: 'bedtime',
        instructions: instructions || 'Take at bedtime with water',
      },
    ];
  }

  // 5. Check for Bedtime / HS / Nocte
  if (/\b(hs|nocte)\b/.test(lower) || lower.includes('bedtime') || lower.includes('before sleep') || defaultPeriod === 'night') {
    const explicit = explicitTimes[0];
    const time12 = explicit || STANDARD_DOSE_TIMES.bedtime.time12;
    const time24 = explicit ? formatTime24(explicit) : STANDARD_DOSE_TIMES.bedtime.time24;
    return [
      {
        slotId: `slot-hs-${Date.now()}`,
        label: 'Bedtime Dose (Night · Before Sleep)',
        time: time12,
        time24: time24,
        period: 'night',
        relationToMeal: 'bedtime',
        instructions: instructions || 'Take at night before going to sleep',
      },
    ];
  }

  // 6. Check for Empty Stomach / AC / Ante Cibum
  if (mealRelation === 'before_food' || /\b(ac)\b/.test(lower) || lower.includes('empty stomach')) {
    const explicit = explicitTimes[0];
    const time12 = explicit || STANDARD_DOSE_TIMES.emptyStomachMorning.time12;
    const time24 = explicit ? formatTime24(explicit) : STANDARD_DOSE_TIMES.emptyStomachMorning.time24;
    return [
      {
        slotId: `slot-ac-${Date.now()}`,
        label: 'Empty Stomach Dose (30m Before Breakfast)',
        time: time12,
        time24: time24,
        period: 'morning',
        relationToMeal: 'before_food',
        instructions: instructions || 'Take 30 minutes before first meal with plain water',
      },
    ];
  }

  // 7. Check for Afternoon / Lunch
  if (lower.includes('afternoon') || lower.includes('lunch') || defaultPeriod === 'afternoon') {
    const explicit = explicitTimes[0];
    const time12 = explicit || STANDARD_DOSE_TIMES.middayLunch.time12;
    const time24 = explicit ? formatTime24(explicit) : STANDARD_DOSE_TIMES.middayLunch.time24;
    return [
      {
        slotId: `slot-aft-def-${Date.now()}`,
        label: 'Afternoon Dose (Post-Lunch)',
        time: time12,
        time24: time24,
        period: 'afternoon',
        relationToMeal: 'after_food',
        instructions: instructions || 'Take after lunch with water',
      },
    ];
  }

  // 8. Check for Evening
  if (lower.includes('evening') || defaultPeriod === 'evening') {
    const explicit = explicitTimes[0];
    const time12 = explicit || STANDARD_DOSE_TIMES.eveningTea.time12;
    const time24 = explicit ? formatTime24(explicit) : STANDARD_DOSE_TIMES.eveningTea.time24;
    return [
      {
        slotId: `slot-eve-def-${Date.now()}`,
        label: 'Evening Dose',
        time: time12,
        time24: time24,
        period: 'evening',
        relationToMeal: 'with_food',
        instructions: instructions || 'Take in the evening after light snack',
      },
    ];
  }

  // Default: Once Daily Morning Dose
  const explicit = explicitTimes[0];
  const time12 = explicit || STANDARD_DOSE_TIMES.morningAfterFood.time12;
  const time24 = explicit ? formatTime24(explicit) : STANDARD_DOSE_TIMES.morningAfterFood.time24;

  return [
    {
      slotId: `slot-morn-def-${Date.now()}`,
      label: 'Morning Dose (Post-Breakfast)',
      time: time12,
      time24: time24,
      period: 'morning',
      relationToMeal: 'after_food',
      instructions: instructions || 'Take after breakfast with water',
    },
  ];
}

/**
 * Creates MedicationDoseAlert entries from scanned OCR medications
 */
export function createDoseAlertsFromScannedMeds(
  scannedMeds: ScannedMedicationItem[],
  sourceDocTitle = 'Scanned Prescription'
): MedicationDoseAlert[] {
  const alerts: MedicationDoseAlert[] = [];

  scannedMeds.forEach((med, medIdx) => {
    const slots =
      med.parsedSchedule && med.parsedSchedule.length > 0
        ? med.parsedSchedule
        : parseMedicationTimingToSlots(med.name, med.timing, med.instructions, med.period);

    slots.forEach((slot, slotIdx) => {
      alerts.push({
        id: `alert-scan-${medIdx}-${slotIdx}-${Date.now()}`,
        medicationId: med.id || `med-scan-${medIdx}`,
        medicationName: med.name,
        genericName: med.genericName,
        dosage: med.dosage || 'As prescribed',
        dosageTime: slot.time,
        dosageTime24: slot.time24,
        period: slot.period,
        instructions: slot.instructions || med.instructions,
        purpose: med.purpose,
        relationToMeal: slot.relationToMeal,
        enabled: true,
        soundEnabled: true,
        status: 'pending',
        sourceDocument: sourceDocTitle,
        provenance: 'ai_extracted',
      });
    });
  });

  return alerts;
}

/**
 * Creates default alerts from confirmed Medication records
 */
export function createDoseAlertsFromMedications(medications: Medication[]): MedicationDoseAlert[] {
  const alerts: MedicationDoseAlert[] = [];

  medications.forEach((med, idx) => {
    const time24 = formatTime24(med.timing);
    const time12 = formatTime12(time24);

    alerts.push({
      id: `alert-med-${med.id || idx}`,
      medicationId: med.id,
      medicationName: med.name,
      dosage: med.dosage,
      dosageTime: time12,
      dosageTime24: time24,
      period: med.period,
      instructions: med.instructions,
      purpose: med.purpose,
      relationToMeal: detectMealRelation(med.instructions || med.timing),
      enabled: true,
      soundEnabled: true,
      status: med.takenToday ? 'taken' : 'pending',
      lastTakenAt: med.takenAt,
      sourceDocument: 'Hospital Discharge Regimen',
      provenance: med.provenance,
    });
  });

  return alerts;
}

/**
 * Calculates remaining minutes/hours until a dose time today
 */
export function calculateTimeRemaining(time24: string): {
  hours: number;
  minutes: number;
  text: string;
  isPast: boolean;
  isDueNow: boolean;
} {
  const now = new Date();
  const [hStr, mStr] = time24.split(':');
  const targetHour = parseInt(hStr, 10);
  const targetMinute = parseInt(mStr, 10);

  const targetDate = new Date();
  targetDate.setHours(targetHour, targetMinute, 0, 0);

  const diffMs = targetDate.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (Math.abs(diffMinutes) <= 10) {
    return { hours: 0, minutes: Math.abs(diffMinutes), text: 'Due right now', isPast: false, isDueNow: true };
  }

  if (diffMinutes < 0) {
    const pastMinutes = Math.abs(diffMinutes);
    const hours = Math.floor(pastMinutes / 60);
    const minutes = pastMinutes % 60;
    const text = hours > 0 ? `${hours}h ${minutes}m ago` : `${minutes}m ago`;
    return { hours, minutes, text, isPast: true, isDueNow: false };
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  const text = hours > 0 ? `in ${hours}h ${minutes}m` : `in ${minutes}m`;
  return { hours, minutes, text, isPast: false, isDueNow: false };
}
