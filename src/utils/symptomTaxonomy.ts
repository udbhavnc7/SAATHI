import { SymptomCategory } from '../types';

export interface CategoryMetadata {
  id: SymptomCategory;
  name: string;
  shortLabel: string;
  description: string;
  color: string; // HEX for Recharts and SVG
  bgLight: string; // Tailwind background
  borderLight: string; // Tailwind border
  textDark: string; // Tailwind text
  badgeClass: string;
  iconName: 'Activity' | 'Smile' | 'Utensils' | 'Wind' | 'HeartPulse' | 'Battery' | 'Bandage' | 'Footprints' | 'Layers';
  suggestedTags: string[];
}

export const SYMPTOM_CATEGORIES_CONFIG: Record<SymptomCategory, CategoryMetadata> = {
  Pain: {
    id: 'Pain',
    name: 'Pain & Discomfort',
    shortLabel: 'Pain',
    description: 'Sternal incision, harvest leg ache, muscular soreness, or chest discomfort',
    color: '#e11d48', // rose-600
    bgLight: 'bg-rose-50',
    borderLight: 'border-rose-200',
    textDark: 'text-rose-900',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    iconName: 'Activity',
    suggestedTags: [
      'Sternal Incision',
      'Vein Harvest Leg',
      'Muscular Stiffness',
      'Throbbing Ache',
      'Chest Soreness',
      'Shoulder / Back Pain',
      'Headache',
    ],
  },
  Mood: {
    id: 'Mood',
    name: 'Mood & Emotional Wellbeing',
    shortLabel: 'Mood',
    description: 'Post-op emotional recovery, anxiety, sleep disturbances, or low mood',
    color: '#8b5cf6', // violet-500
    bgLight: 'bg-purple-50',
    borderLight: 'border-purple-200',
    textDark: 'text-purple-900',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    iconName: 'Smile',
    suggestedTags: [
      'Post-Op Anxiety',
      'Low Mood / Down',
      'Sleep Disturbance',
      'Recovery Frustration',
      'Restlessness',
      'Fear of Movement',
      'Feeling Overwhelmed',
    ],
  },
  Digestive: {
    id: 'Digestive',
    name: 'Digestive & Gastrointestinal',
    shortLabel: 'Digestive',
    description: 'Appetite, nausea, constipation, acid reflux, or medication gut effects',
    color: '#f59e0b', // amber-500
    bgLight: 'bg-amber-50',
    borderLight: 'border-amber-200',
    textDark: 'text-amber-900',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    iconName: 'Utensils',
    suggestedTags: [
      'Nausea',
      'Loss of Appetite',
      'Constipation',
      'Acid Reflux',
      'Bloating / Gas',
      'Medication Stomach Upset',
      'Abdominal Fullness',
    ],
  },
  Respiratory: {
    id: 'Respiratory',
    name: 'Respiratory & Lungs',
    shortLabel: 'Respiratory',
    description: 'Breathing sensations, spirometer conditioning, coughing, or dyspnea',
    color: '#06b6d4', // cyan-500
    bgLight: 'bg-cyan-50',
    borderLight: 'border-cyan-200',
    textDark: 'text-cyan-900',
    badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    iconName: 'Wind',
    suggestedTags: [
      'Shortness of Breath',
      'Corridor Walk Fatigue',
      'Spirometer Discomfort',
      'Dry Cough',
      'Shallow Breathing',
    ],
  },
  Cardiovascular: {
    id: 'Cardiovascular',
    name: 'Cardiovascular & Hemodynamic',
    shortLabel: 'Cardio',
    description: 'Blood pressure adjustments, orthostatic dizziness, lightheadedness, or pulse',
    color: '#dc2626', // red-600
    bgLight: 'bg-red-50',
    borderLight: 'border-red-200',
    textDark: 'text-red-900',
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
    iconName: 'HeartPulse',
    suggestedTags: [
      'Orthostatic Dizziness',
      'Standing Lightheaded',
      'Palpitations',
      'BP Fluctuation',
      'Rapid Pulse',
    ],
  },
  Fatigue: {
    id: 'Fatigue',
    name: 'Energy & Fatigue',
    shortLabel: 'Fatigue',
    description: 'Post-operative exhaustion, heavy eyelids, or convalescent energy slumps',
    color: '#10b981', // emerald-500
    bgLight: 'bg-emerald-50',
    borderLight: 'border-emerald-200',
    textDark: 'text-emerald-900',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    iconName: 'Battery',
    suggestedTags: [
      'General Exhaustion',
      'Post-Lunch Slump',
      'Heavy Eyelids',
      'Low Physical Stamina',
      'Slow Recovery Pace',
    ],
  },
  'Wound / Skin': {
    id: 'Wound / Skin',
    name: 'Wound & Surgical Site',
    shortLabel: 'Wound/Skin',
    description: 'Surgical incision healing, bandage tightness, itching, or skin sensations',
    color: '#0d9488', // teal-600
    bgLight: 'bg-teal-50',
    borderLight: 'border-teal-200',
    textDark: 'text-teal-900',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
    iconName: 'Bandage',
    suggestedTags: [
      'Incision Itching',
      'Bandage Tightness',
      'Healing Sensation',
      'Dressing Pressure',
      'Dry Skin Around Wound',
    ],
  },
  Mobility: {
    id: 'Mobility',
    name: 'Mobility & Physical Movement',
    shortLabel: 'Mobility',
    description: 'Bed transitions, torso posture, calf movement, or ambulatory stiffness',
    color: '#3b82f6', // blue-500
    bgLight: 'bg-blue-50',
    borderLight: 'border-blue-200',
    textDark: 'text-blue-900',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    iconName: 'Footprints',
    suggestedTags: [
      'Bed Transfer Difficulty',
      'Calf Muscle Tiredness',
      'Torso Turning Stiffness',
      'Gentle Walking Routine',
    ],
  },
  Other: {
    id: 'Other',
    name: 'Other General Sensations',
    shortLabel: 'Other',
    description: 'Miscellaneous sensations, temperature sensitivity, or general observations',
    color: '#64748b', // slate-500
    bgLight: 'bg-slate-50',
    borderLight: 'border-slate-200',
    textDark: 'text-slate-900',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    iconName: 'Layers',
    suggestedTags: ['Chills', 'Sweating', 'Medication Metallic Taste', 'Unspecified Sensation'],
  },
};

export const ALL_SYMPTOM_CATEGORIES: SymptomCategory[] = [
  'Pain',
  'Mood',
  'Digestive',
  'Respiratory',
  'Cardiovascular',
  'Fatigue',
  'Wound / Skin',
  'Mobility',
  'Other',
];

/**
 * Deterministically infers a likely category if none was explicitly provided by the user
 */
export function inferSymptomCategory(text: string): SymptomCategory {
  const lower = text.toLowerCase();

  // Mood checks
  if (
    lower.includes('anxi') ||
    lower.includes('mood') ||
    lower.includes('worr') ||
    lower.includes('depress') ||
    lower.includes('sad') ||
    lower.includes('cry') ||
    lower.includes('fear') ||
    lower.includes('scared') ||
    lower.includes('frustrat') ||
    lower.includes('restless') ||
    lower.includes('panic') ||
    lower.includes('sleep') ||
    lower.includes('insomnia') ||
    lower.includes('nightmare')
  ) {
    return 'Mood';
  }

  // Digestive checks
  if (
    lower.includes('nausea') ||
    lower.includes('vomit') ||
    lower.includes('appetite') ||
    lower.includes('constipat') ||
    lower.includes('digest') ||
    lower.includes('stomach') ||
    lower.includes('bloat') ||
    lower.includes('gas') ||
    lower.includes('acid') ||
    lower.includes('reflux') ||
    lower.includes('heartburn') ||
    lower.includes('bowel') ||
    lower.includes('stool') ||
    lower.includes('cramp') && lower.includes('stomach')
  ) {
    return 'Digestive';
  }

  // Respiratory checks
  if (
    lower.includes('breath') ||
    lower.includes('dyspnea') ||
    lower.includes('cough') ||
    lower.includes('spiromet') ||
    lower.includes('lung') ||
    lower.includes('wheez')
  ) {
    return 'Respiratory';
  }

  // Cardiovascular / Hemodynamic checks
  if (
    lower.includes('dizzy') ||
    lower.includes('dizziness') ||
    lower.includes('lighthead') ||
    lower.includes('faint') ||
    lower.includes('palpitat') ||
    lower.includes('pulse') ||
    lower.includes('blood pressure') ||
    lower.includes('orthostatic') ||
    lower.includes('standing') && lower.includes('up')
  ) {
    return 'Cardiovascular';
  }

  // Wound / Skin checks
  if (
    lower.includes('itch') ||
    lower.includes('bandage') ||
    lower.includes('dressing') ||
    lower.includes('skin') ||
    lower.includes('wound') ||
    lower.includes('redness')
  ) {
    return 'Wound / Skin';
  }

  // Fatigue checks
  if (
    lower.includes('fatigue') ||
    lower.includes('tired') ||
    lower.includes('exhaust') ||
    lower.includes('weak') ||
    lower.includes('eyelids') ||
    lower.includes('drowsy')
  ) {
    return 'Fatigue';
  }

  // Mobility checks
  if (
    lower.includes('walk') ||
    lower.includes('stiff') && lower.includes('joint') ||
    lower.includes('ambulat') ||
    lower.includes('bed') && lower.includes('out') ||
    lower.includes('turning')
  ) {
    return 'Mobility';
  }

  // Pain default checks
  if (
    lower.includes('pain') ||
    lower.includes('sore') ||
    lower.includes('ache') ||
    lower.includes('tight') ||
    lower.includes('sternum') ||
    lower.includes('incision') ||
    lower.includes('harvest') ||
    lower.includes('leg') ||
    lower.includes('chest')
  ) {
    return 'Pain';
  }

  return 'Other';
}

/**
 * Extracts or infers relevant tags from symptom text
 */
export function inferSymptomTags(text: string, category?: SymptomCategory): string[] {
  const lower = text.toLowerCase();
  const tags: string[] = [];

  const cat = category || inferSymptomCategory(text);
  const config = SYMPTOM_CATEGORIES_CONFIG[cat];

  // Check matching suggested tags
  config.suggestedTags.forEach((tag) => {
    const parts = tag.toLowerCase().split(/[\s/]+/);
    if (parts.some((p) => p.length > 3 && lower.includes(p))) {
      tags.push(tag);
    }
  });

  // Cross-category key patterns
  if (lower.includes('sternal') || lower.includes('chest')) tags.push('Sternal Incision');
  if (lower.includes('leg') || lower.includes('vein') || lower.includes('harvest')) tags.push('Vein Harvest Leg');
  if (lower.includes('walk')) tags.push('Corridor Walk');
  if (lower.includes('bed')) tags.push('Bed Transfer');
  if (lower.includes('anxiet') || lower.includes('worr')) tags.push('Anxiety');
  if (lower.includes('nausea')) tags.push('Nausea');
  if (lower.includes('constipat')) tags.push('Constipation');
  if (lower.includes('appetite')) tags.push('Appetite Loss');
  if (lower.includes('sleep')) tags.push('Sleep Disturbance');

  // Deduplicate and cap at 3 tags
  const unique = Array.from(new Set(tags));
  if (unique.length > 0) return unique.slice(0, 3);

  // Fallback: pick the first suggested tag of that category
  return [config.suggestedTags[0]];
}

export function getCategoryConfig(category?: string): CategoryMetadata {
  if (category && category in SYMPTOM_CATEGORIES_CONFIG) {
    return SYMPTOM_CATEGORIES_CONFIG[category as SymptomCategory];
  }
  return SYMPTOM_CATEGORIES_CONFIG.Other;
}
