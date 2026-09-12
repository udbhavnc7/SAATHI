export type AgeBand = 'elder' | 'adult' | 'young_adult' | 'guardian';
export type Role = 'patient' | 'caregiver' | 'guardian';
export type DigitalLiteracy = 'low' | 'medium' | 'high';
export type UrgencyLevel = 'normal' | 'monitor' | 'escalate';
export type AppLanguage = 'en' | 'hi' | 'ta' | 'es';

export interface AccessibilityFlags {
  largeText: boolean;
  highContrast: boolean;
  voicePrimary: boolean;
  reducedMotion: boolean;
}

export type ProvenanceTag =
  | 'doctor_confirmed'
  | 'discharge_plan'
  | 'user_confirmed'
  | 'patient_reported'
  | 'caregiver_added'
  | 'ai_extracted';

export interface Profile {
  id: string;
  patientCode: string; // Clinical patient identifier e.g. "PAT-8492"
  name: string;
  age: number;
  gender: string;
  ageBand: AgeBand;
  role: Role;
  digitalLiteracy: DigitalLiteracy;
  accessibility: AccessibilityFlags;
  diagnosis: string;
  hospitalName: string;
  dischargeDate: string;
  caregiverName: string;
  caregiverPhone: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorPhone: string;
  bloodGroup: string;
  allergies: string[];
  isMinor?: boolean;
  guardianName?: string;
  pediatricGuardrail?: string;
}

export interface DesignatedEmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  role: 'caregiver' | 'doctor' | 'family' | 'ambulance' | 'custom';
}

export interface QuickAlertData {
  isOpen: boolean;
  symptom: string;
  severity: 'mild' | 'moderate' | 'severe';
  category?: string;
  source?: 'manual' | 'voice' | 'header';
  timestamp?: string;
}

export interface CareCircleMember {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  accessLevel: 'full' | 'summary_only' | 'emergency_only';
  permissions: {
    medications: boolean;
    symptoms: boolean;
    documents: boolean;
    emergencyAlerts: boolean;
  };
  consentGrantedAt: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  timing: string; // e.g. "08:00 AM"
  period: 'morning' | 'afternoon' | 'evening' | 'night';
  instructions: string; // e.g. "Take after breakfast with water"
  purpose: string;
  takenToday: boolean;
  takenAt?: string;
  missedCount: number;
  provenance: ProvenanceTag;
  verifiedByDoctor: boolean;
  // Dosage and Supply Inventory Tracking
  totalCount?: number; // Total prescribed / bottle capacity (e.g. 30, 60 tablets)
  remainingSupply?: number; // Remaining doses/tablets in stock
  unit?: string; // 'tablets' | 'capsules' | 'puffs' | 'ml'
  refillThreshold?: number; // Low supply alert threshold (default 5-7 doses)
  lastRefilledAt?: string;
  lowSupplyAlertDispatched?: boolean;
}

export interface RecoveryTask {
  id: string;
  title: string;
  time: string;
  type: 'activity' | 'exercise' | 'check' | 'diet';
  instructions: string;
  completed: boolean;
  completedAt?: string;
  provenance: ProvenanceTag;
}

export interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  hospital: string;
  date: string;
  time: string;
  purpose: string;
  notes?: string;
  provenance: ProvenanceTag;
}

export type SymptomCategory =
  | 'Pain'
  | 'Mood'
  | 'Digestive'
  | 'Respiratory'
  | 'Cardiovascular'
  | 'Fatigue'
  | 'Wound / Skin'
  | 'Mobility'
  | 'Other';

export interface SymptomLog {
  id: string;
  timestamp: string;
  symptom: string;
  severity: 'mild' | 'moderate' | 'severe';
  category?: SymptomCategory;
  tags?: string[];
  safetyState: 'NORMAL' | 'MONITOR' | 'ESCALATE';
  reason: string;
  actionTaken: string;
  caregiverNotified: boolean;
}

export interface CaregiverAlert {
  id: string;
  patientId: string;
  patientName: string;
  patientCode?: string; // e.g. "PAT-8492"
  timestamp: string;
  title: string;
  detail: string;
  urgency: 'urgent' | 'warning' | 'info';
  status: 'active' | 'acknowledged' | 'dismissed_not_urgent';
  feedbackNote?: string;
  type?: 'low_supply' | 'symptom' | 'medication_missed' | 'emergency' | 'vital' | 'general';
  medicationName?: string;
  remainingSupply?: number;
}

export interface HealthDocument {
  id: string;
  title: string;
  category: 'Discharge Summary' | 'Prescription' | 'Lab Report' | 'Imaging';
  date: string;
  doctor: string;
  confirmed: boolean;
  summary: string;
  extractedItems: {
    medications?: string[];
    restrictions?: string[];
    followUp?: string;
  };
  provenance: ProvenanceTag;
}

export interface HealthUpdateLog {
  id: string;
  timestamp: string;
  category: 'symptom' | 'daily_update' | 'vital' | 'activity';
  transcript: string;
  summary?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  safetyState?: 'NORMAL' | 'MONITOR' | 'ESCALATE';
  source: 'voice' | 'manual';
  provenance: ProvenanceTag;
  patientId: string;
  caregiverNotified?: boolean;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  type: 'medication' | 'symptom' | 'discharge' | 'appointment' | 'task' | 'document' | 'daily_update' | 'voice_log';
  provenance: ProvenanceTag;
  statusBadge?: string;
}

export interface ParsedDosageSlot {
  slotId: string;
  label: string; // e.g. "Morning Dose (Post-Breakfast)"
  time: string; // e.g. "08:30 AM"
  time24: string; // "08:30"
  period: 'morning' | 'afternoon' | 'evening' | 'night';
  relationToMeal?: 'before_food' | 'after_food' | 'with_food' | 'bedtime' | 'anytime';
  instructions: string;
}

export interface MedicationDoseAlert {
  id: string;
  medicationId: string;
  medicationName: string;
  genericName?: string;
  dosage: string;
  dosageTime: string; // "08:30 AM"
  dosageTime24: string; // "08:30"
  period: 'morning' | 'afternoon' | 'evening' | 'night';
  instructions: string;
  purpose?: string;
  relationToMeal?: 'before_food' | 'after_food' | 'with_food' | 'bedtime' | 'anytime';
  enabled: boolean;
  soundEnabled: boolean;
  status: 'pending' | 'taken' | 'snoozed' | 'dismissed';
  lastTakenAt?: string;
  snoozedUntil?: number;
  sourceDocument?: string;
  provenance: ProvenanceTag;
}

export interface ScannedMedicationItem {
  id?: string;
  name: string;
  genericName?: string;
  dosage: string;
  timing: string;
  period?: 'morning' | 'afternoon' | 'evening' | 'night';
  instructions: string;
  duration?: string;
  quantity?: string;
  purpose: string;
  confidence?: number;
  selected?: boolean;
  parsedSchedule?: ParsedDosageSlot[];
}

export interface ScannedPrescriptionResult {
  documentTitle: string;
  category: string;
  doctorOrHospital?: string;
  pharmacyName?: string;
  date?: string;
  rxNumber?: string;
  totalAmount?: string;
  extractedMedications: ScannedMedicationItem[];
  extractedRestrictions: string[];
  warningSigns: string[];
  summary: string;
  rawOcrText?: string;
  confidenceScore: number;
  confirmedByPatient: boolean;
  provenance: string;
  preprocessingMetrics?: {
    contrastGainPercent?: number;
    sharpnessGainPercent?: number;
    processingTimeMs?: number;
    presetUsed?: string;
  };
}

export type AppMode = 'splash' | 'patient' | 'caretaker';

export interface CaretakerProfile {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  email?: string;
  linkedPatientCodes: string[];
}

