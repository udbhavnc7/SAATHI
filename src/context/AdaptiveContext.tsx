import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Profile,
  Medication,
  RecoveryTask,
  Appointment,
  SymptomLog,
  CaregiverAlert,
  HealthDocument,
  TimelineEvent,
  UrgencyLevel,
  AppLanguage,
  CareCircleMember,
  HealthUpdateLog,
  SymptomCategory,
  ScannedMedicationItem,
  DesignatedEmergencyContact,
  QuickAlertData,
  MedicationDoseAlert,
  AppMode,
  CaretakerProfile,
} from '../types';
import { inferSymptomCategory, inferSymptomTags } from '../utils/symptomTaxonomy';
import {
  createDoseAlertsFromScannedMeds,
  createDoseAlertsFromMedications,
  formatTime12,
  formatTime24,
  parseMedicationTimingToSlots,
} from '../services/medicationScheduler';
import {
  requestNotificationPermission as reqBrowserNotificationPerm,
  getNotificationPermissionStatus,
  dispatchDoseAlert,
  testNotificationAlert,
  playLowSupplyChime,
  dispatchLowSupplyNotification,
} from '../services/notificationService';

interface AdaptiveContextType {
  profile: Profile;
  setProfile: (p: Profile) => void;
  availableProfiles: Profile[];
  switchProfileById: (id: string) => void;
  urgencyState: UrgencyLevel;

  // App Mode & Role Selection (Patient vs Caretaker vs Splash)
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;

  // Multilingual
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;

  // Global Accessibility Theme (Light vs High-Contrast Dark for Eye Strain & Migraine)
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  isHighContrastDark: boolean;

  // Care Circle & Granular Consent
  careCircle: CareCircleMember[];
  toggleCareCirclePermission: (memberId: string, permKey: keyof CareCircleMember['permissions']) => void;

  // Interactive Pitch & Demo Walkthrough Guide
  isPitchGuideOpen: boolean;
  setIsPitchGuideOpen: (open: boolean) => void;
  pitchStep: number;
  setPitchStep: (step: number) => void;

  // Quick Alert Feature (SOS SMS & Call to Designated Emergency Contact)
  designatedContact: DesignatedEmergencyContact;
  setDesignatedContact: (contact: DesignatedEmergencyContact) => void;
  availableEmergencyContacts: DesignatedEmergencyContact[];
  addCustomEmergencyContact: (contact: Omit<DesignatedEmergencyContact, 'id'>) => void;
  quickAlertData: QuickAlertData;
  openQuickAlert: (symptom?: string, severity?: 'mild' | 'moderate' | 'severe', category?: string, source?: 'manual' | 'voice' | 'header') => void;
  closeQuickAlert: () => void;
  triggerQuickAlertSMS: (symptom?: string, targetContact?: DesignatedEmergencyContact) => Promise<{ success: boolean; smsUri: string; payload: string; receiptId?: string }>;
  triggerQuickAlertCall: (targetContact?: DesignatedEmergencyContact) => void;

  // Medicines & Dosage Supply Inventory
  medications: Medication[];
  toggleMedication: (id: string) => void;
  undoMedication: (id: string) => void;
  refillMedication: (id: string, additionalCount?: number) => void;
  medicationAdherenceRate: number;
  addScannedMedications: (meds: ScannedMedicationItem[], documentTitle?: string) => void;
  activeLowSupplyNotice: { medicationName: string; remainingSupply: number; unit: string } | null;
  dismissLowSupplyNotice: () => void;
  triggerTestLowSupplyAlert: (medicationId?: string) => void;

  // Medication Dosage Scheduling & Local Alerts
  doseAlerts: MedicationDoseAlert[];
  activeTriggeredAlert: MedicationDoseAlert | null;
  notificationPermission: NotificationPermission | 'unsupported';
  requestNotificationPermission: () => Promise<NotificationPermission | 'unsupported'>;
  toggleDoseAlert: (alertId: string) => void;
  toggleAlertSound: (alertId: string) => void;
  updateDoseAlertTime: (alertId: string, newTime24: string) => void;
  triggerTestAlert: (alertId?: string) => Promise<void>;
  dismissActiveAlert: () => void;
  snoozeActiveAlert: (alertId: string, minutes?: number) => void;
  markDoseAsTakenFromAlert: (alertId: string) => void;

  // Caretaker Hub & Multi-Patient Connection
  caretakerSession: CaretakerProfile;
  setCaretakerSession: React.Dispatch<React.SetStateAction<CaretakerProfile>>;
  linkedPatients: Profile[];
  linkPatientById: (patientCode: string) => { success: boolean; message: string; patient?: Profile };
  unlinkPatient: (patientCode: string) => void;
  selectedCaretakerPatientCode: string | 'all';
  setSelectedCaretakerPatientCode: (code: string | 'all') => void;
  sendCareNoteToPatient: (patientCodeOrId: string, note: string) => void;
  requestMedicationRefill: (medicationId: string, patientCodeOrId: string) => void;

  // Recovery Tasks
  recoveryTasks: RecoveryTask[];
  toggleTask: (id: string) => void;

  // Appointments
  appointments: Appointment[];
  addAppointment: (app: Appointment) => void;

  // Symptoms & Triage
  symptomLogs: SymptomLog[];
  reportSymptom: (
    symptom: string,
    severity?: 'mild' | 'moderate' | 'severe',
    category?: SymptomCategory,
    tags?: string[],
    customTimestamp?: string
  ) => Promise<SymptomLog>;

  // Voice Health Logging (Web Speech API)
  healthUpdates: HealthUpdateLog[];
  recordVoiceHealthLog: (
    transcript: string,
    explicitCategory?: 'symptom' | 'daily_update' | 'vital' | 'activity',
    severity?: 'mild' | 'moderate' | 'severe'
  ) => Promise<HealthUpdateLog>;
  isVoiceLoggerOpen: boolean;
  voiceLoggerDefaultCategory: 'symptom' | 'daily_update';
  openVoiceLogger: (defaultCategory?: 'symptom' | 'daily_update') => void;
  closeVoiceLogger: () => void;

  // Caregiver Center & Fatigue Feedback
  caregiverAlerts: CaregiverAlert[];
  acknowledgeAlert: (id: string) => void;
  dismissAlertNotUrgent: (id: string, note?: string) => void;
  lastFeedbackNotice: string | null;
  clearFeedbackNotice: () => void;

  // Documents & Timeline
  documents: HealthDocument[];
  addDocument: (doc: HealthDocument) => void;
  confirmDocument: (id: string) => void;
  timeline: TimelineEvent[];
  addTimelineEvent: (event: Omit<TimelineEvent, 'id' | 'timestamp'>) => void;

  // Emergency SOS
  isEmergencyModalOpen: boolean;
  openEmergencyModal: () => void;
  closeEmergencyModal: () => void;
  triggerSOSAlert: (customReason?: string) => void;

  // Voice Audio Feedback
  speakText: (text: string) => void;
  isSpeaking: boolean;
  stopSpeaking: () => void;

  // Voice-Guided Onboarding Walkthrough
  isOnboardingOpen: boolean;
  onboardingStep: number;
  openOnboarding: (stepIndex?: number) => void;
  closeOnboarding: () => void;
  setOnboardingStep: (step: number) => void;
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => void;
  dismissOnboardingBanner: () => void;
  showOnboardingBanner: boolean;
}

const DEFAULT_PROFILES: Profile[] = [
  {
    id: 'elder-ramesh',
    patientCode: 'PAT-8492',
    name: 'Ramesh Sharma',
    age: 68,
    gender: 'Male',
    ageBand: 'elder',
    role: 'patient',
    digitalLiteracy: 'low',
    accessibility: {
      largeText: true,
      highContrast: true,
      voicePrimary: true,
      reducedMotion: false,
    },
    diagnosis: 'CABG Bypass Surgery (Post-op Day 5)',
    hospitalName: 'Metro Heart & Surgical Institute',
    dischargeDate: 'Sept 6, 2026',
    caregiverName: 'Ananya Sharma (Daughter)',
    caregiverPhone: '+91 98201 44521',
    doctorName: 'Dr. Rajesh Mehta',
    doctorSpecialty: 'Senior Consultant Cardiothoracic Surgeon',
    doctorPhone: '+91 98110 32900',
    bloodGroup: 'B Positive (B+)',
    allergies: ['Penicillin', 'Sulfa drugs'],
  },
  {
    id: 'adult-priya',
    patientCode: 'PAT-3120',
    name: 'Priya Sharma',
    age: 36,
    gender: 'Female',
    ageBand: 'adult',
    role: 'patient',
    digitalLiteracy: 'high',
    accessibility: {
      largeText: false,
      highContrast: false,
      voicePrimary: false,
      reducedMotion: false,
    },
    diagnosis: 'Knee Arthroscopy & Preventive Cardiac Health',
    hospitalName: 'City Ortho-Care Hospital',
    dischargeDate: 'Sept 8, 2026',
    caregiverName: 'Vikram Sharma (Spouse)',
    caregiverPhone: '+91 98202 88712',
    doctorName: 'Dr. Sunita Rao',
    doctorSpecialty: 'Orthopedic & Joint Specialist',
    doctorPhone: '+91 98330 11244',
    bloodGroup: 'O Positive (O+)',
    allergies: ['Dust mites', 'Ibuprofen sensitivity'],
  },
  {
    id: 'child-aarav',
    patientCode: 'PAT-9941',
    name: 'Aarav Sharma (Child)',
    age: 7,
    gender: 'Male',
    ageBand: 'guardian',
    role: 'guardian',
    digitalLiteracy: 'high',
    accessibility: {
      largeText: false,
      highContrast: false,
      voicePrimary: false,
      reducedMotion: false,
    },
    diagnosis: 'Pediatric Asthma Management & MMR Booster',
    hospitalName: 'Apollo Children’s Specialty Clinic',
    dischargeDate: 'Ongoing Pediatric Plan',
    caregiverName: 'Priya Sharma (Mother & Primary Guardian)',
    caregiverPhone: '+91 98202 88712',
    doctorName: 'Dr. Neha Kapoor',
    doctorSpecialty: 'Consultant Pediatric Pulmonologist',
    doctorPhone: '+91 98199 44321',
    bloodGroup: 'B Positive (B+)',
    allergies: ['Peanuts', 'Pollen'],
    isMinor: true,
    guardianName: 'Priya Sharma',
    pediatricGuardrail: 'Guardian verification strictly required for all pediatric dosing.',
  },
  {
    id: 'caregiver-ananya',
    patientCode: 'PAT-8492',
    name: 'Ananya Sharma (Caregiver)',
    age: 38,
    gender: 'Female',
    ageBand: 'adult',
    role: 'caregiver',
    digitalLiteracy: 'high',
    accessibility: {
      largeText: false,
      highContrast: false,
      voicePrimary: false,
      reducedMotion: false,
    },
    diagnosis: 'Care Coordinator for Ramesh Sharma (Father)',
    hospitalName: 'Metro Heart & Surgical Institute',
    dischargeDate: 'Monitoring Active',
    caregiverName: 'Ananya Sharma',
    caregiverPhone: '+91 98201 44521',
    doctorName: 'Dr. Rajesh Mehta',
    doctorSpecialty: 'Cardiothoracic Surgery',
    doctorPhone: '+91 98110 32900',
    bloodGroup: 'B Positive (B+)',
    allergies: ['None'],
  },
];

const INITIAL_CARE_CIRCLE: CareCircleMember[] = [
  {
    id: 'circle-1',
    name: 'Ananya Sharma',
    relationship: 'Daughter & Primary Caregiver',
    phone: '+91 98201 44521',
    accessLevel: 'full',
    permissions: {
      medications: true,
      symptoms: true,
      documents: true,
      emergencyAlerts: true,
    },
    consentGrantedAt: 'Sept 6, 2026 (Hospital Discharge)',
  },
  {
    id: 'circle-2',
    name: 'Vikram Sharma',
    relationship: 'Son-in-Law',
    phone: '+91 98202 88712',
    accessLevel: 'emergency_only',
    permissions: {
      medications: false,
      symptoms: false,
      documents: false,
      emergencyAlerts: true,
    },
    consentGrantedAt: 'Sept 6, 2026',
  },
  {
    id: 'circle-3',
    name: 'Dr. Rajesh Mehta',
    relationship: 'Cardiothoracic Surgeon',
    phone: '+91 98110 32900',
    accessLevel: 'full',
    permissions: {
      medications: true,
      symptoms: true,
      documents: true,
      emergencyAlerts: true,
    },
    consentGrantedAt: 'Sept 6, 2026 (Hospital Consent Form Signed)',
  },
];

const INITIAL_MEDICATIONS: Medication[] = [
  {
    id: 'med-1',
    name: 'Metformin Hydrochloride',
    dosage: '500 mg',
    timing: '08:00 AM',
    period: 'morning',
    instructions: 'Take immediately after breakfast with a full glass of water',
    purpose: 'Maintains stable blood glucose during post-op recovery',
    takenToday: true,
    takenAt: '08:12 AM',
    missedCount: 0,
    provenance: 'discharge_plan',
    verifiedByDoctor: true,
    totalCount: 30,
    remainingSupply: 5,
    unit: 'tablets',
    refillThreshold: 7,
    lastRefilledAt: 'Sept 1, 2026',
  },
  {
    id: 'med-2',
    name: 'Ecosprin (Aspirin)',
    dosage: '75 mg',
    timing: '08:00 AM',
    period: 'morning',
    instructions: 'Take with morning meal; do not crush tablet',
    purpose: 'Antiplatelet protection for new arterial bypass graft',
    takenToday: true,
    takenAt: '08:14 AM',
    missedCount: 0,
    provenance: 'doctor_confirmed',
    verifiedByDoctor: true,
    totalCount: 30,
    remainingSupply: 22,
    unit: 'tablets',
    refillThreshold: 7,
    lastRefilledAt: 'Sept 6, 2026',
  },
  {
    id: 'med-3',
    name: 'Metoprolol Tartrate',
    dosage: '25 mg',
    timing: '01:00 PM',
    period: 'afternoon',
    instructions: 'Take after lunch; check pulse if feeling lightheaded',
    purpose: 'Regulates heart rate and maintains resting blood pressure',
    takenToday: false,
    missedCount: 0,
    provenance: 'discharge_plan',
    verifiedByDoctor: true,
    totalCount: 30,
    remainingSupply: 4,
    unit: 'tablets',
    refillThreshold: 6,
    lastRefilledAt: 'Sept 2, 2026',
  },
  {
    id: 'med-4',
    name: 'Atorvastatin',
    dosage: '20 mg',
    timing: '08:00 PM',
    period: 'evening',
    instructions: 'Take at bedtime after light dinner',
    purpose: 'Lipid stabilization and vascular recovery',
    takenToday: false,
    missedCount: 1,
    provenance: 'doctor_confirmed',
    verifiedByDoctor: true,
    totalCount: 30,
    remainingSupply: 18,
    unit: 'tablets',
    refillThreshold: 5,
    lastRefilledAt: 'Sept 6, 2026',
  },
  {
    id: 'med-5',
    name: 'Pantoprazole',
    dosage: '40 mg',
    timing: '07:30 AM',
    period: 'morning',
    instructions: 'Take on empty stomach 30 mins before breakfast',
    purpose: 'Protects stomach lining against post-surgery medicines',
    takenToday: true,
    takenAt: '07:35 AM',
    missedCount: 0,
    provenance: 'discharge_plan',
    verifiedByDoctor: true,
    totalCount: 15,
    remainingSupply: 3,
    unit: 'capsules',
    refillThreshold: 5,
    lastRefilledAt: 'Sept 6, 2026',
  },
];

const INITIAL_RECOVERY_TASKS: RecoveryTask[] = [
  {
    id: 'task-1',
    title: 'Post-op Incentive Spirometer',
    time: '10:00 AM',
    type: 'exercise',
    instructions: 'Inhale gently 10 times using lung exercise chamber to prevent fluid accumulation.',
    completed: true,
    completedAt: '10:15 AM',
    provenance: 'discharge_plan',
  },
  {
    id: 'task-2',
    title: 'Assisted Gentle Hallway Walk',
    time: '04:30 PM',
    type: 'activity',
    instructions: 'Walk 80-100 meters at a steady comfortable pace with family member. Stop if fatigued.',
    completed: false,
    provenance: 'doctor_confirmed',
  },
  {
    id: 'task-3',
    title: 'Evening Blood Pressure & Pulse Log',
    time: '06:00 PM',
    type: 'check',
    instructions: 'Sit comfortably for 5 minutes before recording cuff reading.',
    completed: false,
    provenance: 'discharge_plan',
  },
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'app-1',
    doctorName: 'Dr. Rajesh Mehta',
    specialty: 'Cardiothoracic Surgery',
    hospital: 'Metro Heart Institute, OPD Room 304',
    date: 'Friday, Sept 14, 2026',
    time: '10:30 AM',
    purpose: 'Post-Bypass Incision Inspection & ECG Review',
    notes: 'Bring previous 7-day blood pressure logs and discharge summary folder.',
    provenance: 'doctor_confirmed',
  },
  {
    id: 'app-2',
    doctorName: 'Diagnostic Pathology Lab',
    specialty: 'Blood Chemistry',
    hospital: 'Metro Diagnostic Center, Ground Floor',
    date: 'Tuesday, Sept 18, 2026',
    time: '08:15 AM',
    purpose: 'Fasting Lipid Profile, Creatinine & Serum Electrolytes',
    notes: 'Requires 10-hour overnight fasting. Water is permitted.',
    provenance: 'discharge_plan',
  },
];

const INITIAL_SYMPTOMS: SymptomLog[] = [
  {
    id: 'sym-1',
    timestamp: 'Sept 6, 2026, 04:30 PM',
    symptom: 'Sternal incision soreness & mild muscular stiffness when turning',
    severity: 'moderate',
    category: 'Pain',
    tags: ['Sternal Incision', 'Muscular Stiffness'],
    safetyState: 'MONITOR',
    reason: 'Expected post-CABG sternotomy muscular incision healing.',
    actionTaken: 'Supported chest with heart pillow when changing posture; pain subsided.',
    caregiverNotified: false,
  },
  {
    id: 'sym-2',
    timestamp: 'Sept 7, 2026, 11:15 AM',
    symptom: 'Mild breathlessness after walking 50 meters in corridor',
    severity: 'moderate',
    category: 'Respiratory',
    tags: ['Shortness of Breath', 'Corridor Walk'],
    safetyState: 'MONITOR',
    reason: 'Early ambulation conditioning post-cardiac surgery.',
    actionTaken: 'Sat down, completed 5 slow exhalations; respiration returned to baseline.',
    caregiverNotified: true,
  },
  {
    id: 'sym-3',
    timestamp: 'Sept 7, 2026, 07:45 PM',
    symptom: 'Right saphenous vein harvest leg tightness & mild ache',
    severity: 'mild',
    category: 'Pain',
    tags: ['Vein Harvest Leg', 'Throbbing Ache'],
    safetyState: 'NORMAL',
    reason: 'Expected post-surgical vein donor site healing.',
    actionTaken: 'Wore compression stocking and elevated leg on pillow.',
    caregiverNotified: false,
  },
  {
    id: 'sym-4',
    timestamp: 'Sept 8, 2026, 08:50 AM',
    symptom: 'Brief dizziness upon getting out of bed quickly',
    severity: 'moderate',
    category: 'Cardiovascular',
    tags: ['Orthostatic Dizziness', 'Bed Transfer'],
    safetyState: 'MONITOR',
    reason: 'Orthostatic readjustment under beta-blocker (Metoprolol) therapy.',
    actionTaken: 'Dangled feet at bed edge for 2 minutes before standing; vitals stable.',
    caregiverNotified: true,
  },
  {
    id: 'sym-5',
    timestamp: 'Sept 8, 2026, 06:10 PM',
    symptom: 'Surgical wound skin itchiness around sternal bandage',
    severity: 'mild',
    category: 'Wound / Skin',
    tags: ['Incision Itching', 'Bandage Tightness'],
    safetyState: 'NORMAL',
    reason: 'Normal healing of superficial dermis without redness or discharge.',
    actionTaken: 'Kept incision dry; avoided scratching bandage.',
    caregiverNotified: false,
  },
  {
    id: 'sym-6',
    timestamp: 'Sept 9, 2026, 02:20 PM',
    symptom: 'Post-lunch heavy eyelids and generalized fatigue',
    severity: 'mild',
    category: 'Fatigue',
    tags: ['General Exhaustion', 'Post-Lunch Slump'],
    safetyState: 'NORMAL',
    reason: 'Post-operative metabolic convalescence.',
    actionTaken: 'Took prescribed 45-minute afternoon rest in reclined position.',
    caregiverNotified: false,
  },
  {
    id: 'sym-7',
    timestamp: 'Sept 9, 2026, 09:30 PM',
    symptom: 'Evening recovery anxiety and restlessness before sleeping',
    severity: 'moderate',
    category: 'Mood',
    tags: ['Post-Op Anxiety', 'Sleep Disturbance'],
    safetyState: 'MONITOR',
    reason: 'Post-cardiac surgery psychological vulnerability and sleep transition stress.',
    actionTaken: 'Completed 5-minute slow diaphragmatic relaxation audio; heartbeat calmed.',
    caregiverNotified: false,
  },
  {
    id: 'sym-8',
    timestamp: 'Sept 10, 2026, 01:15 PM',
    symptom: 'Mild nausea and loss of appetite after midday medication',
    severity: 'mild',
    category: 'Digestive',
    tags: ['Nausea', 'Loss of Appetite'],
    safetyState: 'NORMAL',
    reason: 'Gastrointestinal adaptation to post-op pharmacotherapy.',
    actionTaken: 'Sipped warm ginger water with crackers; nausea subsided within 25 minutes.',
    caregiverNotified: false,
  },
  {
    id: 'sym-9',
    timestamp: 'Yesterday, 04:30 PM',
    symptom: 'Mild tightness at lower leg donor vein site',
    severity: 'mild',
    category: 'Pain',
    tags: ['Vein Harvest Leg', 'Lower Leg'],
    safetyState: 'NORMAL',
    reason: 'Expected post-surgical vein harvest healing process.',
    actionTaken: 'Advised leg elevation on pillow for 30 minutes; resolved.',
    caregiverNotified: false,
  },
  {
    id: 'sym-10',
    timestamp: 'Yesterday, 08:45 PM',
    symptom: 'Mild abdominal constipation and bloating from reduced mobility',
    severity: 'mild',
    category: 'Digestive',
    tags: ['Constipation', 'Bloating / Gas'],
    safetyState: 'NORMAL',
    reason: 'Common post-op bowel sluggishness from pain relievers and reduced ambulation.',
    actionTaken: 'Increased warm fluid hydration and completed gentle hallway walking.',
    caregiverNotified: false,
  },
  {
    id: 'sym-11',
    timestamp: 'Today, 09:15 AM',
    symptom: 'Mild calf muscle tiredness after morning corridor walking routine',
    severity: 'mild',
    category: 'Mobility',
    tags: ['Calf Muscle Tiredness', 'Gentle Walking Routine'],
    safetyState: 'NORMAL',
    reason: 'Gradual increase in physical conditioning.',
    actionTaken: 'Hydrated with warm water; completed gentle ankle rotations.',
    caregiverNotified: false,
  },
];

const INITIAL_ALERTS: CaregiverAlert[] = [
  {
    id: 'alt-supply-1',
    patientId: 'elder-ramesh',
    patientName: 'Ramesh Sharma',
    patientCode: 'PAT-8492',
    timestamp: 'Today, 08:30 AM',
    title: '⚠️ Low Medication Supply: Metformin Hydrochloride',
    detail: 'Only 5 tablets left (Refill threshold: 7 tablets). Please reorder a pharmacy refill for Ramesh Sharma.',
    urgency: 'warning',
    status: 'active',
    type: 'low_supply',
    medicationName: 'Metformin Hydrochloride',
    remainingSupply: 5,
  },
  {
    id: 'alt-supply-2',
    patientId: 'elder-ramesh',
    patientName: 'Ramesh Sharma',
    patientCode: 'PAT-8492',
    timestamp: 'Today, 08:15 AM',
    title: '⚠️ Low Medication Supply: Metoprolol Tartrate',
    detail: 'Only 4 tablets left (Refill threshold: 6 tablets). Beta-blocker refill required soon.',
    urgency: 'warning',
    status: 'active',
    type: 'low_supply',
    medicationName: 'Metoprolol Tartrate',
    remainingSupply: 4,
  },
  {
    id: 'alt-1',
    patientId: 'elder-ramesh',
    patientName: 'Ramesh Sharma',
    patientCode: 'PAT-8492',
    timestamp: 'Today, 08:45 AM',
    title: 'Evening Atorvastatin dose pending from yesterday',
    detail: 'Bedtime cholesterol pill was not logged before 10:00 PM.',
    urgency: 'warning',
    status: 'active',
    type: 'medication_missed',
  },
  {
    id: 'alt-2',
    patientId: 'elder-ramesh',
    patientName: 'Ramesh Sharma',
    patientCode: 'PAT-8492',
    timestamp: 'Yesterday, 05:00 PM',
    title: 'Reported leg swelling observation',
    detail: 'Patient logged mild donor site heaviness. Advised elevation.',
    urgency: 'info',
    status: 'acknowledged',
    type: 'symptom',
  },
];

const INITIAL_DOCUMENTS: HealthDocument[] = [
  {
    id: 'doc-1',
    title: 'Hospital Discharge Plan & Surgery Report',
    category: 'Discharge Summary',
    date: 'Sept 6, 2026',
    doctor: 'Dr. Rajesh Mehta (Cardiothoracic Surgery)',
    confirmed: true,
    summary: 'Successful 3-vessel CABG. Sternal closure intact. Initiated dual antiplatelet and beta-blocker therapy. No heavy lifting > 3kg for 6 weeks.',
    extractedItems: {
      medications: ['Metformin 500mg', 'Ecosprin 75mg', 'Metoprolol 25mg', 'Atorvastatin 20mg'],
      restrictions: ['No driving for 4 weeks', 'No lifting heavy items', 'Keep incision dry'],
      followUp: 'OPD visit in 8 days with fresh ECG',
    },
    provenance: 'discharge_plan',
  },
  {
    id: 'doc-2',
    title: 'Post-Op Echo & Cardiac Telemetry Summary',
    category: 'Imaging',
    date: 'Sept 5, 2026',
    doctor: 'Dr. Alok Verma (Imaging Specialist)',
    confirmed: true,
    summary: 'LVEF 52%. Normal left ventricular wall motion. Stable graft perfusion without pericardial effusion.',
    extractedItems: {},
    provenance: 'doctor_confirmed',
  },
];

const INITIAL_TIMELINE: TimelineEvent[] = [
  {
    id: 'time-1',
    timestamp: 'Today, 08:14 AM',
    title: 'Morning Medications Acknowledged',
    detail: 'Ecosprin 75mg, Metformin 500mg, and Pantoprazole 40mg taken after breakfast.',
    type: 'medication',
    provenance: 'patient_reported',
    statusBadge: 'Adherent',
  },
  {
    id: 'time-2',
    timestamp: 'Today, 10:15 AM',
    title: 'Spirometer Respiratory Exercise Completed',
    detail: '10 deep inhalation cycles successfully recorded in recovery tracker.',
    type: 'task',
    provenance: 'patient_reported',
  },
  {
    id: 'time-3',
    timestamp: 'Sept 6, 2026, 11:30 AM',
    title: 'Discharged from Metro Heart Institute',
    detail: 'Care plan created with 5 medications, 3 daily recovery tasks, and OPD appointment on Sept 14.',
    type: 'discharge',
    provenance: 'discharge_plan',
    statusBadge: 'Hospital Milestone',
  },
];

const INITIAL_HEALTH_UPDATES: HealthUpdateLog[] = [
  {
    id: 'vlog-seed-1',
    timestamp: 'Today, 08:30 AM',
    category: 'daily_update',
    transcript: 'Had warm water with light vegetable porridge. No chest discomfort after sitting.',
    summary: 'Ate light breakfast with good tolerance and no discomfort.',
    source: 'voice',
    provenance: 'patient_reported',
    patientId: 'elder-ramesh',
  },
  {
    id: 'vlog-seed-2',
    timestamp: 'Today, 10:15 AM',
    category: 'activity',
    transcript: 'Completed 10 cycles of breathing spirometer. Yellow ball held for 3 seconds.',
    summary: 'Performed morning incentive spirometry as prescribed.',
    source: 'voice',
    provenance: 'patient_reported',
    patientId: 'elder-ramesh',
  },
];

const AdaptiveContext = createContext<AdaptiveContextType | null>(null);

export const AdaptiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILES[0]);
  const [language, setLanguage] = useState<AppLanguage>('en');

  // App Mode (splash -> patient or caretaker)
  const [appMode, setAppModeState] = useState<AppMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sathi_app_mode');
        if (saved === 'patient' || saved === 'caretaker') return saved;
      } catch (e) {
        console.warn('Could not read saved app mode:', e);
      }
    }
    return 'splash';
  });

  const setAppMode = useCallback((mode: AppMode) => {
    setAppModeState(mode);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sathi_app_mode', mode);
      } catch (e) {}
    }
  }, []);

  // Caretaker Profile & Linked Patient Codes
  const [caretakerSession, setCaretakerSessionState] = useState<CaretakerProfile>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sathi_caretaker_session_v1');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Could not read saved caretaker session:', e);
      }
    }
    return {
      id: 'caregiver-ananya',
      name: 'Ananya Sharma',
      phone: '+91 98201 44521',
      relationship: 'Daughter & Primary Caregiver',
      linkedPatientCodes: ['PAT-8492'], // Pre-connected to Ramesh Sharma
    };
  });

  const setCaretakerSession = useCallback((updater: CaretakerProfile | ((prev: CaretakerProfile) => CaretakerProfile)) => {
    setCaretakerSessionState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('sathi_caretaker_session_v1', JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });
  }, []);

  const [selectedCaretakerPatientCode, setSelectedCaretakerPatientCode] = useState<string | 'all'>('PAT-8492');

  // Custom dynamically registered patients if entered ID is new
  const [dynamicPatients, setDynamicPatients] = useState<Profile[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sathi_dynamic_patients');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  const allAvailableProfiles = useMemo(() => {
    return [...DEFAULT_PROFILES, ...dynamicPatients];
  }, [dynamicPatients]);

  const linkedPatients = useMemo(() => {
    return allAvailableProfiles.filter((p) =>
      caretakerSession.linkedPatientCodes.some((code) => code.toUpperCase() === (p.patientCode || p.id).toUpperCase())
    );
  }, [allAvailableProfiles, caretakerSession.linkedPatientCodes]);

  const [activeLowSupplyNotice, setActiveLowSupplyNotice] = useState<{
    medicationName: string;
    remainingSupply: number;
    unit: string;
  } | null>(null);

  const dismissLowSupplyNotice = useCallback(() => {
    setActiveLowSupplyNotice(null);
  }, []);

  // Global Theme: Light vs High-Contrast Dark Mode (Optimized for Eye Strain & Migraine photophobia)
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sathi_theme');
        if (saved === 'light' || saved === 'dark') return saved;
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          return 'dark';
        }
      } catch (e) {
        console.warn('Could not read saved theme:', e);
      }
    }
    return 'light';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sathi_theme', theme);
        const root = document.documentElement;
        if (theme === 'dark') {
          root.classList.add('dark');
          root.setAttribute('data-theme', 'dark');
        } else {
          root.classList.remove('dark');
          root.setAttribute('data-theme', 'light');
        }
      } catch (e) {
        console.warn('Could not persist theme:', e);
      }
    }
  }, [theme]);

  const setTheme = useCallback((newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const [careCircle, setCareCircle] = useState<CareCircleMember[]>(INITIAL_CARE_CIRCLE);
  const [isPitchGuideOpen, setIsPitchGuideOpen] = useState(false);
  const [pitchStep, setPitchStep] = useState(0);
  const [lastFeedbackNotice, setLastFeedbackNotice] = useState<string | null>(null);

  const [medications, setMedications] = useState<Medication[]>(INITIAL_MEDICATIONS);
  const [recoveryTasks, setRecoveryTasks] = useState<RecoveryTask[]>(INITIAL_RECOVERY_TASKS);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);

  // Scheduled Medication Dose Alerts & Active Trigger State
  const [doseAlerts, setDoseAlerts] = useState<MedicationDoseAlert[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sathi_dose_alerts_v1');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Could not read saved dose alerts:', e);
      }
    }
    return createDoseAlertsFromMedications(INITIAL_MEDICATIONS);
  });

  const [activeTriggeredAlert, setActiveTriggeredAlert] = useState<MedicationDoseAlert | null>(null);

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    return getNotificationPermissionStatus();
  });

  // Health updates, symptoms, and timeline initialized from localStorage for real text log persistence
  const [healthUpdates, setHealthUpdates] = useState<HealthUpdateLog[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sathi_health_updates');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Could not read cached health updates:', e);
      }
    }
    return INITIAL_HEALTH_UPDATES;
  });

  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sathi_symptom_logs');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length >= 3) {
            return parsed.map((item) => {
              const cat = item.category || inferSymptomCategory(item.symptom || '');
              return {
                ...item,
                category: cat,
                tags: item.tags && item.tags.length > 0 ? item.tags : inferSymptomTags(item.symptom || '', cat),
              };
            });
          }
        }
      } catch (e) {
        console.warn('Could not read cached symptom logs:', e);
      }
    }
    return INITIAL_SYMPTOMS;
  });

  const [caregiverAlerts, setCaregiverAlerts] = useState<CaregiverAlert[]>(INITIAL_ALERTS);
  const [documents, setDocuments] = useState<HealthDocument[]>(INITIAL_DOCUMENTS);

  const [timeline, setTimeline] = useState<TimelineEvent[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sathi_timeline');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Could not read cached timeline:', e);
      }
    }
    return INITIAL_TIMELINE;
  });

  const [urgencyState, setUrgencyState] = useState<UrgencyLevel>('normal');
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Shell Voice Health Logging Modal state
  const [isVoiceLoggerOpen, setIsVoiceLoggerOpen] = useState(false);
  const [voiceLoggerDefaultCategory, setVoiceLoggerDefaultCategory] = useState<'symptom' | 'daily_update'>('daily_update');

  const openVoiceLogger = useCallback((defaultCategory: 'symptom' | 'daily_update' = 'daily_update') => {
    setVoiceLoggerDefaultCategory(defaultCategory);
    setIsVoiceLoggerOpen(true);
  }, []);

  const closeVoiceLogger = useCallback(() => {
    setIsVoiceLoggerOpen(false);
  }, []);

  // Voice-Guided Onboarding Walkthrough State
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sathi_voice_onboarding_v1') === 'completed';
    }
    return false;
  });
  const [showOnboardingBanner, setShowOnboardingBanner] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sathi_voice_onboarding_v1') !== 'completed';
    }
    return true;
  });

  const openOnboarding = useCallback((stepIndex: number = 0) => {
    setOnboardingStep(stepIndex);
    setIsOnboardingOpen(true);
  }, []);

  const closeOnboarding = useCallback(() => {
    setIsOnboardingOpen(false);
  }, []);

  const completeOnboarding = useCallback(() => {
    setHasCompletedOnboarding(true);
    setShowOnboardingBanner(false);
    setIsOnboardingOpen(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sathi_voice_onboarding_v1', 'completed');
      } catch (e) {
        console.warn('Could not save onboarding state:', e);
      }
    }
  }, []);

  const dismissOnboardingBanner = useCallback(() => {
    setShowOnboardingBanner(false);
  }, []);

  // Quick Alert State & Designated Emergency Contact Management
  const [customEmergencyContacts, setCustomEmergencyContacts] = useState<DesignatedEmergencyContact[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`sathi_custom_emergency_contacts_${profile.id}`);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Could not read custom emergency contacts:', e);
      }
    }
    return [];
  });

  const availableEmergencyContacts: DesignatedEmergencyContact[] = [
    {
      id: 'contact-caregiver',
      name: profile.caregiverName,
      phone: profile.caregiverPhone,
      relationship: profile.role === 'caregiver' ? 'Primary Patient Contact' : 'Primary Family Caregiver',
      role: 'caregiver',
    },
    {
      id: 'contact-doctor',
      name: profile.doctorName,
      phone: profile.doctorPhone,
      relationship: profile.doctorSpecialty || 'Treating Specialist Physician',
      role: 'doctor',
    },
    {
      id: 'contact-ambulance',
      name: `${profile.hospitalName} Emergency`,
      phone: '108',
      relationship: 'National Ambulance & Emergency (108 / 112)',
      role: 'ambulance',
    },
    ...customEmergencyContacts,
  ];

  const [designatedContactId, setDesignatedContactId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`sathi_designated_contact_id_${profile.id}`);
      if (saved) return saved;
    }
    return 'contact-caregiver';
  });

  const designatedContact =
    availableEmergencyContacts.find((c) => c.id === designatedContactId) || availableEmergencyContacts[0];

  const setDesignatedContact = useCallback((contact: DesignatedEmergencyContact) => {
    setDesignatedContactId(contact.id);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`sathi_designated_contact_id_${profile.id}`, contact.id);
      } catch (e) {
        console.warn('Could not save designated contact id:', e);
      }
    }
  }, [profile.id]);

  const addCustomEmergencyContact = useCallback((newContact: Omit<DesignatedEmergencyContact, 'id'>) => {
    const contactWithId: DesignatedEmergencyContact = {
      ...newContact,
      id: `custom-contact-${Date.now()}`,
    };
    setCustomEmergencyContacts((prev) => {
      const next = [...prev, contactWithId];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`sathi_custom_emergency_contacts_${profile.id}`, JSON.stringify(next));
        } catch (e) {
          console.warn('Could not save custom contact:', e);
        }
      }
      return next;
    });
    setDesignatedContact(contactWithId);
  }, [profile.id, setDesignatedContact]);

  const [quickAlertData, setQuickAlertData] = useState<QuickAlertData>({
    isOpen: false,
    symptom: '',
    severity: 'severe',
  });

  const openQuickAlert = useCallback((
    symptom: string = 'Severe symptom reported',
    severity: 'mild' | 'moderate' | 'severe' = 'severe',
    category?: string,
    source: 'manual' | 'voice' | 'header' = 'manual'
  ) => {
    setQuickAlertData({
      isOpen: true,
      symptom,
      severity,
      category,
      source,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  }, []);

  const closeQuickAlert = useCallback(() => {
    setQuickAlertData((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const triggerQuickAlertSMS = useCallback(
    async (symptomText?: string, targetContact?: DesignatedEmergencyContact) => {
      const contact = targetContact || designatedContact;
      const symptom = symptomText || quickAlertData.symptom || 'Severe acute symptom reported';
      const cleanPhone = contact.phone.replace(/[^0-9+]/g, '');

      const payload = `EMERGENCY SOS [SATHI Recovery Alert]
Patient: ${profile.name} (${profile.age}y, ${profile.gender})
Blood: ${profile.bloodGroup}
SEVERE SYMPTOM: ${symptom}
Diagnosis: ${profile.diagnosis}
Hospital: ${profile.hospitalName}
Known Allergies: ${profile.allergies.join(', ') || 'None'}
Action Needed: Immediate check or clinical review. Call patient now!`;

      const smsUri = `sms:${cleanPhone}?&body=${encodeURIComponent(payload)}`;

      let receiptId = `SMS-${Date.now()}`;
      try {
        const res = await fetch('/api/emergency/quick-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId: profile.id,
            patientName: profile.name,
            symptom,
            severity: 'severe',
            contactName: contact.name,
            contactPhone: contact.phone,
            contactRelationship: contact.relationship,
            mode: 'sms',
            smsPayload: payload,
            bloodGroup: profile.bloodGroup,
            allergies: profile.allergies,
            hospitalName: profile.hospitalName,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          receiptId = data.deliveryStatus?.receiptId || receiptId;
        }
      } catch (err) {
        console.warn('Quick alert API dispatch error:', err);
      }

      // Add high-priority event to timeline
      setTimeline((prev) => [
        {
          id: `time-sos-${Date.now()}`,
          timestamp: 'Just now',
          title: `Quick Alert SOS SMS Sent to ${contact.name}`,
          detail: `Dispatched urgent SMS to ${contact.phone} (${contact.relationship}) regarding: "${symptom}". Receipt: ${receiptId}.`,
          type: 'symptom',
          provenance: 'patient_reported',
          statusBadge: 'SOS_SMS_SENT',
        },
        ...prev,
      ]);

      // Add caregiver alert
      const newAlert: CaregiverAlert = {
        id: `alt-sms-${Date.now()}`,
        patientId: profile.id,
        patientName: profile.name,
        timestamp: 'Just now',
        title: `QUICK ALERT SOS SMS Dispatched!`,
        detail: `Sent to ${contact.name} (${contact.phone}): "${symptom}". Immediate review requested.`,
        urgency: 'urgent',
        status: 'active',
      };
      setCaregiverAlerts((prev) => [newAlert, ...prev]);

      return {
        success: true,
        smsUri,
        payload,
        receiptId,
      };
    },
    [designatedContact, quickAlertData.symptom, profile]
  );

  const triggerQuickAlertCall = useCallback(
    (targetContact?: DesignatedEmergencyContact) => {
      const contact = targetContact || designatedContact;
      const cleanPhone = contact.phone.replace(/[^0-9+]/g, '');

      // Transmit to API for DPDP logging
      fetch('/api/emergency/quick-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: profile.id,
          patientName: profile.name,
          symptom: quickAlertData.symptom || 'Severe acute symptom',
          severity: 'severe',
          contactName: contact.name,
          contactPhone: contact.phone,
          contactRelationship: contact.relationship,
          mode: 'call',
          bloodGroup: profile.bloodGroup,
          allergies: profile.allergies,
          hospitalName: profile.hospitalName,
        }),
      }).catch((err) => console.warn('Call audit error:', err));

      setTimeline((prev) => [
        {
          id: `time-call-${Date.now()}`,
          timestamp: 'Just now',
          title: `Quick Alert Call Placed: ${contact.name}`,
          detail: `Direct emergency call placed to ${contact.phone} (${contact.relationship}).`,
          type: 'symptom',
          provenance: 'patient_reported',
          statusBadge: 'CALL_PLACED',
        },
        ...prev,
      ]);

      window.location.href = `tel:${cleanPhone}`;
    },
    [designatedContact, quickAlertData.symptom, profile]
  );

  // Sync health updates, symptoms, and timeline to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sathi_health_updates', JSON.stringify(healthUpdates));
      } catch (e) {
        console.warn('Failed to persist health updates:', e);
      }
    }
  }, [healthUpdates]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sathi_symptom_logs', JSON.stringify(symptomLogs));
      } catch (e) {
        console.warn('Failed to persist symptom logs:', e);
      }
    }
  }, [symptomLogs]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sathi_timeline', JSON.stringify(timeline));
      } catch (e) {
        console.warn('Failed to persist timeline:', e);
      }
    }
  }, [timeline]);

  // Switch profile
  const switchProfileById = useCallback((id: string) => {
    const found = DEFAULT_PROFILES.find((p) => p.id === id);
    if (found) {
      setProfile(found);
    }
  }, []);

  // Toggle Care Circle permission
  const toggleCareCirclePermission = useCallback((memberId: string, permKey: keyof CareCircleMember['permissions']) => {
    setCareCircle((prev) =>
      prev.map((m) => {
        if (m.id === memberId) {
          return {
            ...m,
            permissions: {
              ...m.permissions,
              [permKey]: !m.permissions[permKey],
            },
          };
        }
        return m;
      })
    );
  }, []);

  // Medication adherence rate
  const takenCount = medications.filter((m) => m.takenToday).length;
  const medicationAdherenceRate = Math.round((takenCount / (medications.length || 1)) * 100);

  // Toggle medication taken with supply inventory tracking & push alerts
  const toggleMedication = useCallback((id: string) => {
    let toggledMedName = '';
    let isNowTaken = false;
    let alertNeededMed: Medication | null = null;
    let updatedSupplyCount = 0;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMedications((prev) =>
      prev.map((med) => {
        if (med.id === id) {
          isNowTaken = !med.takenToday;
          toggledMedName = med.name;
          const currentSupply = med.remainingSupply ?? 30;
          const newSupply = isNowTaken ? Math.max(0, currentSupply - 1) : currentSupply + 1;
          updatedSupplyCount = newSupply;

          if (isNowTaken && newSupply <= (med.refillThreshold ?? 7)) {
            alertNeededMed = { ...med, remainingSupply: newSupply };
          }

          return {
            ...med,
            takenToday: isNowTaken,
            takenAt: isNowTaken ? now : undefined,
            remainingSupply: newSupply,
          };
        }
        return med;
      })
    );

    // Sync corresponding doseAlerts
    setDoseAlerts((prev) =>
      prev.map((alert) => {
        if (
          alert.medicationId === id ||
          (toggledMedName && alert.medicationName.toLowerCase().includes(toggledMedName.toLowerCase()))
        ) {
          return {
            ...alert,
            status: isNowTaken ? 'taken' : 'pending',
            lastTakenAt: isNowTaken ? now : undefined,
            snoozedUntil: undefined,
          };
        }
        return alert;
      })
    );

    const med = medications.find((m) => m.id === id);
    if (med && !med.takenToday) {
      setTimeline((prev) => [
        {
          id: `time-${Date.now()}`,
          timestamp: 'Just now',
          title: `Medicine Taken: ${med.name} (${med.dosage})`,
          detail: `Logged as taken at ${now}. Inventory balance: ${updatedSupplyCount} ${med.unit || 'tablets'}.`,
          type: 'medication',
          provenance: 'patient_reported',
          statusBadge: 'Confirmed',
        },
        ...prev,
      ]);
    }

    // Trigger low supply alert if threshold reached
    if (alertNeededMed) {
      const alertMed = alertNeededMed as Medication;
      const unit = alertMed.unit || 'tablets';
      const remaining = updatedSupplyCount;

      dispatchLowSupplyNotification(alertMed.name, remaining, alertMed.totalCount ?? 30, unit, profile.name);

      setActiveLowSupplyNotice({
        medicationName: alertMed.name,
        remainingSupply: remaining,
        unit,
      });

      setCaregiverAlerts((prev) => [
        {
          id: `alt-supply-${Date.now()}`,
          patientId: profile.id,
          patientName: profile.name,
          patientCode: profile.patientCode || 'PAT-8492',
          timestamp: 'Just now',
          title: `⚠️ Low Supply Alert: ${alertMed.name}`,
          detail: `Only ${remaining} ${unit} remaining (${remaining}/${alertMed.totalCount || 30}). Refill recommended.`,
          urgency: remaining <= 2 ? 'urgent' : 'warning',
          status: 'active',
          type: 'low_supply',
          medicationName: alertMed.name,
          remainingSupply: remaining,
        },
        ...prev,
      ]);
    }
  }, [medications, profile.name, profile.id, profile.patientCode]);

  const undoMedication = useCallback((id: string) => {
    setMedications((prev) =>
      prev.map((med) => {
        if (med.id === id) {
          const restoredSupply = (med.remainingSupply ?? 29) + 1;
          return {
            ...med,
            takenToday: false,
            takenAt: undefined,
            remainingSupply: restoredSupply,
          };
        }
        return med;
      })
    );
    setDoseAlerts((prev) =>
      prev.map((alert) => (alert.medicationId === id ? { ...alert, status: 'pending', lastTakenAt: undefined } : alert))
    );
  }, []);

  // Refill medication supply
  const refillMedication = useCallback((id: string, additionalCount: number = 30) => {
    let refilledName = '';
    let updatedSupply = 0;
    let unitName = 'tablets';

    setMedications((prev) =>
      prev.map((m) => {
        if (m.id === id || m.name.toLowerCase().includes(id.toLowerCase())) {
          refilledName = m.name;
          unitName = m.unit || 'tablets';
          const newSupply = (m.remainingSupply ?? 0) + additionalCount;
          updatedSupply = newSupply;
          return {
            ...m,
            remainingSupply: newSupply,
            totalCount: Math.max(m.totalCount || 30, newSupply),
            lastRefilledAt: 'Just now',
          };
        }
        return m;
      })
    );

    setActiveLowSupplyNotice((curr) => (curr?.medicationName === refilledName ? null : curr));

    setCaregiverAlerts((prev) =>
      prev.map((alt) => {
        if (alt.type === 'low_supply' && alt.medicationName && refilledName.toLowerCase().includes(alt.medicationName.toLowerCase())) {
          return { ...alt, status: 'acknowledged' };
        }
        return alt;
      })
    );

    setTimeline((prev) => [
      {
        id: `time-refill-${Date.now()}`,
        timestamp: 'Just now',
        title: `Pharmacy Refill Logged: ${refilledName}`,
        detail: `Added +${additionalCount} ${unitName}. New balance: ${updatedSupply} ${unitName}.`,
        type: 'medication',
        provenance: 'user_confirmed',
        statusBadge: 'Refilled',
      },
      ...prev,
    ]);

    setLastFeedbackNotice(`Refill recorded: +${additionalCount} ${unitName} added for ${refilledName}`);
  }, []);

  const triggerTestLowSupplyAlert = useCallback((medicationId?: string) => {
    const med = medications.find((m) => m.id === medicationId) || medications[0];
    if (!med) return;

    const remaining = med.remainingSupply ?? 4;
    dispatchLowSupplyNotification(med.name, remaining, med.totalCount ?? 30, med.unit ?? 'tablets', profile.name);
    setActiveLowSupplyNotice({
      medicationName: med.name,
      remainingSupply: remaining,
      unit: med.unit ?? 'tablets',
    });

    setCaregiverAlerts((prev) => [
      {
        id: `alt-test-supply-${Date.now()}`,
        patientId: profile.id,
        patientName: profile.name,
        patientCode: profile.patientCode || 'PAT-8492',
        timestamp: 'Just now',
        title: `⚠️ Low Supply Warning: ${med.name}`,
        detail: `Test alert: Only ${remaining} ${med.unit || 'tablets'} remaining in supply.`,
        urgency: 'warning',
        status: 'active',
        type: 'low_supply',
        medicationName: med.name,
        remainingSupply: remaining,
      },
      ...prev,
    ]);
  }, [medications, profile]);

  // Caretaker patient linking
  const linkPatientById = useCallback((rawCode: string) => {
    const clean = rawCode.trim().toUpperCase();
    if (!clean) {
      return { success: false, message: 'Please enter a valid Patient ID or Code' };
    }

    if (caretakerSession.linkedPatientCodes.some((c) => c.toUpperCase() === clean)) {
      const found = allAvailableProfiles.find((p) => (p.patientCode || p.id).toUpperCase() === clean);
      return { success: true, message: `Patient ${found?.name || clean} is already connected to your Caretaker Hub.`, patient: found };
    }

    let target = allAvailableProfiles.find(
      (p) => (p.patientCode && p.patientCode.toUpperCase() === clean) || p.id.toUpperCase() === clean
    );

    if (!target) {
      const newPatient: Profile = {
        id: `patient-${clean.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        patientCode: clean,
        name: `Patient ${clean}`,
        age: 65,
        gender: 'Other',
        ageBand: 'elder',
        role: 'patient',
        digitalLiteracy: 'low',
        accessibility: { largeText: true, highContrast: false, voicePrimary: true, reducedMotion: false },
        diagnosis: 'Post-Operative Cardiac & General Monitoring',
        hospitalName: 'Apollo Care Health Network',
        dischargeDate: 'Recent',
        caregiverName: caretakerSession.name,
        caregiverPhone: caretakerSession.phone,
        doctorName: 'Dr. R. Gupta',
        doctorSpecialty: 'Internal Medicine',
        doctorPhone: '+91 98000 00000',
        bloodGroup: 'B Positive (B+)',
        allergies: ['None Reported'],
      };
      target = newPatient;
      setDynamicPatients((prev) => {
        const next = [...prev, newPatient];
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('sathi_dynamic_patients', JSON.stringify(next));
          } catch (e) {}
        }
        return next;
      });
    }

    setCaretakerSession((prev) => ({
      ...prev,
      linkedPatientCodes: [...prev.linkedPatientCodes, target!.patientCode || target!.id],
    }));

    setSelectedCaretakerPatientCode(target.patientCode || target.id);

    setCaregiverAlerts((prev) => [
      {
        id: `alt-link-${Date.now()}`,
        patientId: target!.id,
        patientName: target!.name,
        patientCode: target!.patientCode || target!.id,
        timestamp: 'Just now',
        title: `Patient Connected: ${target!.name}`,
        detail: `Successfully synchronized live telemetry, medicine schedules, and alerts for Patient ID ${target!.patientCode || target!.id}.`,
        urgency: 'info',
        status: 'acknowledged',
        type: 'symptom',
      },
      ...prev,
    ]);

    setLastFeedbackNotice(`Connected to ${target.name} (${target.patientCode || target.id})`);

    return {
      success: true,
      message: `Successfully connected to ${target.name} (${target.patientCode || target.id})!`,
      patient: target,
    };
  }, [caretakerSession, allAvailableProfiles, setCaretakerSession]);

  const unlinkPatient = useCallback((code: string) => {
    const clean = code.trim().toUpperCase();
    setCaretakerSession((prev) => ({
      ...prev,
      linkedPatientCodes: prev.linkedPatientCodes.filter((c) => c.toUpperCase() !== clean),
    }));
    setLastFeedbackNotice(`Disconnected patient ${clean}`);
  }, [setCaretakerSession]);

  const sendCareNoteToPatient = useCallback((patientCodeOrId: string, note: string) => {
    const target = allAvailableProfiles.find(
      (p) => (p.patientCode && p.patientCode.toUpperCase() === patientCodeOrId.toUpperCase()) || p.id === patientCodeOrId
    ) || profile;

    setTimeline((prev) => [
      {
        id: `time-care-note-${Date.now()}`,
        timestamp: 'Just now',
        title: `Care Note from ${caretakerSession.name}`,
        detail: `"${note}" — sent via Caregiver Hub for ${target.name}.`,
        type: 'caregiver_note',
        provenance: 'caregiver_entered',
        statusBadge: 'Caretaker Note',
      },
      ...prev,
    ]);

    setCaregiverAlerts((prev) => [
      {
        id: `alt-note-${Date.now()}`,
        patientId: target.id,
        patientName: target.name,
        patientCode: target.patientCode,
        timestamp: 'Just now',
        title: `Note sent to ${target.name}`,
        detail: `Caretaker message: "${note}"`,
        urgency: 'info',
        status: 'acknowledged',
        type: 'symptom',
      },
      ...prev,
    ]);

    setLastFeedbackNotice(`Care note transmitted to ${target.name}`);
  }, [allAvailableProfiles, profile, caretakerSession.name]);

  const requestMedicationRefill = useCallback((medicationId: string, patientCodeOrId: string) => {
    const med = medications.find((m) => m.id === medicationId);
    const medName = med ? med.name : medicationId;
    const target = allAvailableProfiles.find(
      (p) => (p.patientCode && p.patientCode.toUpperCase() === patientCodeOrId.toUpperCase()) || p.id === patientCodeOrId
    ) || profile;

    setCaregiverAlerts((prev) => [
      {
        id: `alt-refill-req-${Date.now()}`,
        patientId: target.id,
        patientName: target.name,
        patientCode: target.patientCode,
        timestamp: 'Just now',
        title: `Refill Requested: ${medName}`,
        detail: `Caretaker ${caretakerSession.name} requested pharmacy reorder for ${target.name}.`,
        urgency: 'warning',
        status: 'active',
        type: 'low_supply',
        medicationName: medName,
      },
      ...prev,
    ]);

    setLastFeedbackNotice(`Refill request submitted to pharmacy for ${medName}`);
  }, [medications, allAvailableProfiles, profile, caretakerSession.name]);

  // Persist scheduled dose alerts to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sathi_dose_alerts_v1', JSON.stringify(doseAlerts));
      } catch (e) {
        console.warn('Failed to persist dose alerts:', e);
      }
    }
  }, [doseAlerts]);

  // Background Medication Alert Scheduler Ticker (Runs every 15 seconds)
  useEffect(() => {
    const checkAlertSchedule = () => {
      const now = new Date();
      const currentHour = now.getHours().toString().padStart(2, '0');
      const currentMinute = now.getMinutes().toString().padStart(2, '0');
      const currentTime24 = `${currentHour}:${currentMinute}`;
      const nowTimestamp = Date.now();

      // Look for any alert that should trigger
      const dueAlert = doseAlerts.find((alert) => {
        if (!alert.enabled) return false;

        // Snooze check: was snoozed and snooze duration has passed
        if (alert.status === 'snoozed' && alert.snoozedUntil && alert.snoozedUntil <= nowTimestamp) {
          return true;
        }

        // Standard time check: pending and matching current minute
        if (alert.status === 'pending' && alert.dosageTime24 === currentTime24) {
          return true;
        }

        return false;
      });

      if (dueAlert && (!activeTriggeredAlert || activeTriggeredAlert.id !== dueAlert.id)) {
        setActiveTriggeredAlert(dueAlert);
        dispatchDoseAlert(dueAlert, true);
      }
    };

    checkAlertSchedule();
    const interval = setInterval(checkAlertSchedule, 15000);
    return () => clearInterval(interval);
  }, [doseAlerts, activeTriggeredAlert]);

  // Alert Action Handlers
  const requestNotificationPermission = useCallback(async () => {
    const status = await reqBrowserNotificationPerm();
    setNotificationPermission(status);
    return status;
  }, []);

  const toggleDoseAlert = useCallback((alertId: string) => {
    setDoseAlerts((prev) =>
      prev.map((alert) => (alert.id === alertId ? { ...alert, enabled: !alert.enabled } : alert))
    );
  }, []);

  const toggleAlertSound = useCallback((alertId: string) => {
    setDoseAlerts((prev) =>
      prev.map((alert) => (alert.id === alertId ? { ...alert, soundEnabled: !alert.soundEnabled } : alert))
    );
  }, []);

  const updateDoseAlertTime = useCallback((alertId: string, newTime24: string) => {
    const newTime12 = formatTime12(newTime24);
    setDoseAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, dosageTime24: newTime24, dosageTime: newTime12 } : alert
      )
    );
  }, []);

  const triggerTestAlert = useCallback(async (alertId?: string) => {
    let targetAlert: MedicationDoseAlert | undefined;
    if (alertId) {
      targetAlert = doseAlerts.find((a) => a.id === alertId);
    }
    if (!targetAlert) {
      targetAlert = doseAlerts[0] || {
        id: 'test-alert-1',
        medicationId: 'med-1',
        medicationName: 'Metformin Hydrochloride',
        dosage: '500 mg',
        dosageTime: '08:00 AM',
        dosageTime24: '08:00',
        period: 'morning',
        instructions: 'Take immediately after breakfast with a full glass of water',
        purpose: 'Maintains stable blood glucose during post-op recovery',
        enabled: true,
        soundEnabled: true,
        status: 'pending',
        provenance: 'doctor_confirmed',
      };
    }

    setActiveTriggeredAlert(targetAlert);
    dispatchDoseAlert(targetAlert, true);
  }, [doseAlerts]);

  const dismissActiveAlert = useCallback(() => {
    setActiveTriggeredAlert(null);
  }, []);

  const snoozeActiveAlert = useCallback((alertId: string, minutes: number = 10) => {
    const snoozeUntil = Date.now() + minutes * 60 * 1000;
    setDoseAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId
          ? {
              ...alert,
              status: minutes > 0 ? 'snoozed' : 'pending',
              snoozedUntil: minutes > 0 ? snoozeUntil : undefined,
            }
          : alert
      )
    );

    if (minutes > 0) {
      setActiveTriggeredAlert(null);
    } else {
      const target = doseAlerts.find((a) => a.id === alertId);
      if (target) {
        setActiveTriggeredAlert(target);
        dispatchDoseAlert(target, true);
      }
    }
  }, [doseAlerts]);

  const addTimelineEvent = useCallback((event: Omit<TimelineEvent, 'id' | 'timestamp'>) => {
    setTimeline((prev) => [
      {
        ...event,
        id: `time-${Date.now()}`,
        timestamp: 'Just now',
      },
      ...prev,
    ]);
  }, []);

  const markDoseAsTakenFromAlert = useCallback((alertId: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setDoseAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId
          ? {
              ...alert,
              status: 'taken',
              lastTakenAt: timeStr,
              snoozedUntil: undefined,
            }
          : alert
      )
    );

    const targetAlert = doseAlerts.find((a) => a.id === alertId);
    if (targetAlert) {
      setMedications((prev) =>
        prev.map((med) => {
          if (
            med.id === targetAlert.medicationId ||
            med.name.toLowerCase().includes(targetAlert.medicationName.toLowerCase()) ||
            targetAlert.medicationName.toLowerCase().includes(med.name.toLowerCase())
          ) {
            return {
              ...med,
              takenToday: true,
              takenAt: timeStr,
            };
          }
          return med;
        })
      );

      addTimelineEvent({
        title: `Medication Dose Taken: ${targetAlert.medicationName}`,
        detail: `Dose recorded as taken at ${timeStr}. Scheduled time was ${targetAlert.dosageTime} (${targetAlert.dosage}).`,
        type: 'medication',
        provenance: 'user_confirmed',
      });
    }

    setActiveTriggeredAlert((curr) => (curr?.id === alertId ? null : curr));
  }, [doseAlerts, addTimelineEvent]);

  // Toggle recovery task
  const toggleTask = useCallback((id: string) => {
    setRecoveryTasks((prev) =>
      prev.map((task) => {
        if (task.id === id) {
          const newStatus = !task.completed;
          return {
            ...task,
            completed: newStatus,
            completedAt: newStatus
              ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : undefined,
          };
        }
        return task;
      })
    );
  }, []);

  const addAppointment = useCallback((app: Appointment) => {
    setAppointments((prev) => [app, ...prev]);
  }, []);

  // Report symptom with deterministic safety engine
  const reportSymptom = useCallback(
    async (
      symptomText: string,
      severity?: 'mild' | 'moderate' | 'severe',
      category?: SymptomCategory,
      tags?: string[],
      customTimestamp?: string
    ): Promise<SymptomLog> => {
      const finalCategory = category || inferSymptomCategory(symptomText);
      const finalTags = tags && tags.length > 0 ? tags : inferSymptomTags(symptomText, finalCategory);

      try {
        const response = await fetch('/api/triage-symptom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symptom: symptomText,
            severity: severity || 'mild',
            category: finalCategory,
            tags: finalTags,
            caregiverId: 'caregiver-ananya',
          }),
        });

        let triage = {
          safetyState: 'NORMAL' as 'NORMAL' | 'MONITOR' | 'ESCALATE',
          reason: 'Mild symptom logged on timeline.',
          action: 'Rest and follow standard instructions.',
          notifyCaregiver: false,
          alertMessage: `Symptom reported: "${symptomText}"`,
        };

        if (response.ok) {
          triage = await response.json();
        } else {
          // Fallback deterministic logic
          const lower = symptomText.toLowerCase();
          if (
            lower.includes('chest') ||
            lower.includes('breath') ||
            lower.includes('bleed') ||
            severity === 'severe'
          ) {
            triage = {
              safetyState: 'ESCALATE',
              reason: 'Cardio-respiratory red flag detected.',
              action: 'Immediate doctor or caregiver attention required.',
              notifyCaregiver: true,
              alertMessage: `Severe symptom alert: "${symptomText}"`,
            };
          } else if (lower.includes('dizzy') || lower.includes('pain') || severity === 'moderate') {
            triage = {
              safetyState: 'MONITOR',
              reason: 'Monitoring rule: Check progress in 2 hours.',
              action: 'Log resting vitals and observe.',
              notifyCaregiver: true,
              alertMessage: `Monitor symptom: "${symptomText}"`,
            };
          }
        }

        const newLog: SymptomLog = {
          id: `sym-${Date.now()}`,
          timestamp: customTimestamp || 'Just now',
          symptom: symptomText,
          severity:
            severity ||
            (triage.safetyState === 'ESCALATE'
              ? 'severe'
              : triage.safetyState === 'MONITOR'
              ? 'moderate'
              : 'mild'),
          category: finalCategory,
          tags: finalTags,
          safetyState: triage.safetyState,
          reason: triage.reason,
          actionTaken: triage.action,
          caregiverNotified: triage.notifyCaregiver,
        };

        setSymptomLogs((prev) => [newLog, ...prev]);

        if (triage.safetyState === 'ESCALATE') {
          setUrgencyState('escalate');
          openQuickAlert(symptomText, 'severe', finalCategory, 'manual');
        } else if (severity === 'severe') {
          openQuickAlert(symptomText, 'severe', finalCategory, 'manual');
        } else if (triage.safetyState === 'MONITOR' && urgencyState !== 'escalate') {
          setUrgencyState('monitor');
        }

        // If caregiver notification triggered, add to caregiver alerts
        if (triage.notifyCaregiver) {
          const newAlert: CaregiverAlert = {
            id: `alt-${Date.now()}`,
            patientId: profile.id,
            patientName: profile.name,
            timestamp: 'Just now',
            title: triage.alertMessage,
            detail: `Reported by ${profile.name}: "${symptomText}". Category: ${finalCategory}. Reason: ${triage.reason}`,
            urgency: triage.safetyState === 'ESCALATE' ? 'urgent' : 'warning',
            status: 'active',
          };
          setCaregiverAlerts((prev) => [newAlert, ...prev]);
        }

        // Add timeline event
        setTimeline((prev) => [
          {
            id: `time-${Date.now()}`,
            timestamp: 'Just now',
            title: `Symptom Reported [${finalCategory}]: ${symptomText}`,
            detail: `Triage evaluation: ${triage.safetyState}. ${triage.reason}`,
            type: 'symptom',
            provenance: 'patient_reported',
            statusBadge: triage.safetyState,
          },
          ...prev,
        ]);

        return newLog;
      } catch {
        const fallbackLog: SymptomLog = {
          id: `sym-${Date.now()}`,
          timestamp: 'Just now',
          symptom: symptomText,
          severity: severity || 'mild',
          category: finalCategory,
          tags: finalTags,
          safetyState: 'NORMAL',
          reason: 'Logged on personal timeline.',
          actionTaken: 'Continue scheduled rest.',
          caregiverNotified: false,
        };
        setSymptomLogs((prev) => [fallbackLog, ...prev]);
        return fallbackLog;
      }
    },
    [profile.id, profile.name, urgencyState, openQuickAlert]
  );

  // Voice Health Log (Web Speech API -> Structured & Persisted Text Logs)
  const recordVoiceHealthLog = useCallback(
    async (
      transcript: string,
      explicitCategory?: 'symptom' | 'daily_update' | 'vital' | 'activity',
      severity?: 'mild' | 'moderate' | 'severe'
    ): Promise<HealthUpdateLog> => {
      let resultLog: HealthUpdateLog;

      try {
        const res = await fetch('/api/voice-health-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript,
            category: explicitCategory,
            severity,
            patientId: profile.id,
            patientName: profile.name,
            userRole: profile.role,
            language,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          resultLog = {
            id: data.id || `vlog-${Date.now()}`,
            timestamp: data.timestamp || 'Just now',
            category: data.category || explicitCategory || 'daily_update',
            transcript: data.transcript || transcript,
            summary: data.summary || transcript,
            severity: data.severity,
            safetyState: data.safetyState,
            source: 'voice',
            provenance: 'patient_reported',
            patientId: profile.id,
            caregiverNotified: data.notifyCaregiver,
          };
        } else {
          throw new Error('Server classification failed');
        }
      } catch (err) {
        console.warn('Voice log server call fallback:', err);
        const lower = transcript.toLowerCase();
        const isSymptom =
          explicitCategory === 'symptom' ||
          lower.includes('pain') ||
          lower.includes('dizzy') ||
          lower.includes('breath') ||
          lower.includes('chest') ||
          lower.includes('swoll');
        const isEscalate = lower.includes('chest') || lower.includes('breath') || severity === 'severe';
        const isMonitor = lower.includes('dizzy') || lower.includes('swoll') || severity === 'moderate';

        resultLog = {
          id: `vlog-${Date.now()}`,
          timestamp: 'Just now',
          category: isSymptom ? 'symptom' : explicitCategory || 'daily_update',
          transcript,
          summary: transcript,
          severity: severity || (isEscalate ? 'severe' : isMonitor ? 'moderate' : 'mild'),
          safetyState: isSymptom ? (isEscalate ? 'ESCALATE' : isMonitor ? 'MONITOR' : 'NORMAL') : undefined,
          source: 'voice',
          provenance: 'patient_reported',
          patientId: profile.id,
          caregiverNotified: isEscalate || isMonitor,
        };
      }

      // Persist into healthUpdates state & localStorage
      setHealthUpdates((prev) => [resultLog, ...prev]);

      // If symptom, also reflect into symptomLogs and dispatch caregiver alerts if necessary
      if (resultLog.category === 'symptom' || resultLog.safetyState) {
        const safetyState = resultLog.safetyState || 'NORMAL';
        const vCat = inferSymptomCategory(resultLog.transcript);
        const vTags = inferSymptomTags(resultLog.transcript, vCat);
        const symLog: SymptomLog = {
          id: `sym-${Date.now()}`,
          timestamp: resultLog.timestamp,
          symptom: resultLog.transcript,
          severity: resultLog.severity || 'mild',
          category: vCat,
          tags: vTags,
          safetyState,
          reason:
            safetyState === 'ESCALATE'
              ? 'Cardio-respiratory red flag detected in voice update.'
              : safetyState === 'MONITOR'
              ? 'Monitored recovery symptom logged via voice.'
              : 'Normal post-op observation logged via voice.',
          actionTaken:
            safetyState === 'ESCALATE'
              ? 'Immediate escalation to caregiver and doctor.'
              : safetyState === 'MONITOR'
              ? 'Rest comfortably and monitor vitals.'
              : 'Logged on recovery ledger.',
          caregiverNotified: !!resultLog.caregiverNotified,
        };
        setSymptomLogs((prev) => [symLog, ...prev]);

        if (safetyState === 'ESCALATE') {
          setUrgencyState('escalate');
          openQuickAlert(resultLog.transcript, 'severe', resultLog.category, 'voice');
          const newAlert: CaregiverAlert = {
            id: `alt-voice-${Date.now()}`,
            patientId: profile.id,
            patientName: profile.name,
            timestamp: 'Just now',
            title: `Voice Escalation: "${resultLog.transcript.slice(0, 45)}..."`,
            detail: `Spoken by ${profile.name}: "${resultLog.transcript}". Flagged for immediate clinical / caregiver review.`,
            urgency: 'urgent',
            status: 'active',
          };
          setCaregiverAlerts((prev) => [newAlert, ...prev]);
        } else if (resultLog.severity === 'severe') {
          openQuickAlert(resultLog.transcript, 'severe', resultLog.category, 'voice');
        } else if (safetyState === 'MONITOR' && urgencyState !== 'escalate') {
          setUrgencyState('monitor');
          const newAlert: CaregiverAlert = {
            id: `alt-voice-${Date.now()}`,
            patientId: profile.id,
            patientName: profile.name,
            timestamp: 'Just now',
            title: `Voice Update (Monitor): "${resultLog.transcript.slice(0, 45)}..."`,
            detail: `Spoken by ${profile.name}: "${resultLog.transcript}". Routine check advised.`,
            urgency: 'warning',
            status: 'active',
          };
          setCaregiverAlerts((prev) => [newAlert, ...prev]);
        }
      }

      // Add to timeline
      setTimeline((prev) => [
        {
          id: `time-voice-${Date.now()}`,
          timestamp: 'Just now',
          title:
            resultLog.category === 'symptom'
              ? `Voice Symptom: ${resultLog.summary || resultLog.transcript}`
              : `Voice Update: ${resultLog.summary || resultLog.transcript}`,
          detail: `Voice-documented entry: "${resultLog.transcript}"`,
          type: resultLog.category === 'symptom' ? 'symptom' : 'voice_log',
          provenance: 'patient_reported',
          statusBadge:
            resultLog.safetyState ||
            (resultLog.category === 'activity'
              ? 'Exercise'
              : resultLog.category === 'vital'
              ? 'Vitals'
              : 'Daily Update'),
        },
        ...prev,
      ]);

      return resultLog;
    },
    [profile.id, profile.name, profile.role, language, urgencyState, openQuickAlert]
  );

  // Caregiver alert feedback loop (prevents alert fatigue!)
  const acknowledgeAlert = useCallback((id: string) => {
    setCaregiverAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'acknowledged' } : a))
    );
  }, []);

  const dismissAlertNotUrgent = useCallback((id: string, note?: string) => {
    // Send feedback to backend engine to adapt threshold and prevent alert fatigue
    fetch('/api/caregiver/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caregiverId: 'caregiver-ananya',
        alertId: id,
        feedbackType: 'not_urgent',
        symptomText: note,
      }),
    }).catch((err) => console.warn('Caregiver feedback sync error:', err));

    setCaregiverAlerts((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: 'dismissed_not_urgent',
              feedbackNote: note || 'Marked as non-urgent by caregiver feedback.',
            }
          : a
      )
    );
    setLastFeedbackNotice(
      'Caregiver Feedback Logged: Safety rule threshold adapted on backend. Sathi will require 2 consecutive reports or higher severity before alarming for this pattern, preventing alert fatigue.'
    );
  }, []);

  const clearFeedbackNotice = useCallback(() => setLastFeedbackNotice(null), []);

  // Confirm document
  const confirmDocument = useCallback((id: string) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, confirmed: true, provenance: 'user_confirmed' } : doc))
    );
  }, []);

  const addDocument = useCallback((doc: HealthDocument) => {
    setDocuments((prev) => [doc, ...prev]);
  }, []);

  const addScannedMedications = useCallback(
    (scannedMeds: ScannedMedicationItem[], documentTitle = 'Scanned Prescription Receipt') => {
      if (!scannedMeds || scannedMeds.length === 0) return;

      const newMeds: Medication[] = scannedMeds.map((m, idx) => {
        let period: 'morning' | 'afternoon' | 'evening' | 'night' = m.period || 'morning';
        const timingLower = (m.timing || '').toLowerCase();
        if (
          timingLower.includes('night') ||
          timingLower.includes('bedtime') ||
          timingLower.includes('nocte') ||
          timingLower.includes('0-0-1')
        ) {
          period = 'night';
        } else if (timingLower.includes('evening')) {
          period = 'evening';
        } else if (
          timingLower.includes('afternoon') ||
          timingLower.includes('lunch') ||
          timingLower.includes('midday')
        ) {
          period = 'afternoon';
        } else {
          period = 'morning';
        }

        const displayName =
          m.genericName && !m.name.toLowerCase().includes(m.genericName.toLowerCase())
            ? `${m.name} (${m.genericName})`
            : m.name;

        return {
          id: `med-scan-${Date.now()}-${idx}`,
          name: displayName,
          dosage: m.dosage || 'As prescribed',
          timing: m.timing || '08:00 AM',
          period,
          instructions: m.instructions || 'Take as indicated on prescription receipt',
          purpose: m.purpose || 'Prescribed recovery medication',
          takenToday: false,
          missedCount: 0,
          provenance: 'user_confirmed',
          verifiedByDoctor: true,
        };
      });

      setMedications((prev) => [...prev, ...newMeds]);

      // Parse & Schedule Local Dosage Alerts from Extracted Medicines
      const newAlerts = createDoseAlertsFromScannedMeds(scannedMeds, documentTitle);
      setDoseAlerts((prev) => [...prev, ...newAlerts]);

      // Request browser notification permission if not yet decided
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        reqBrowserNotificationPerm().then((p) => setNotificationPermission(p));
      }

      const newDoc: HealthDocument = {
        id: `doc-rx-${Date.now()}`,
        title: documentTitle,
        category: 'Prescription',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        doctor: 'Prescribing Physician · Verified by Patient via OCR',
        confirmed: true,
        summary: `Verified prescription receipt with ${scannedMeds.length} active medications: ${scannedMeds.map(
          (m) => m.name
        ).join(', ')}. Configured ${newAlerts.length} scheduled local dosage alerts.`,
        extractedItems: {
          medications: scannedMeds.map((m) => `${m.name} ${m.dosage} (${m.timing})`),
        },
        provenance: 'user_confirmed',
      };
      setDocuments((prev) => [newDoc, ...prev]);

      addTimelineEvent({
        title: 'Prescription Schedule & Alerts Configured',
        detail: `Added ${newMeds.length} medicines and scheduled ${newAlerts.length} local dosage notification alert${newAlerts.length !== 1 ? 's' : ''} with audio chimes.`,
        type: 'medication',
        provenance: 'user_confirmed',
      });
    },
    [addTimelineEvent]
  );


  const openEmergencyModal = useCallback(() => setIsEmergencyModalOpen(true), []);
  const closeEmergencyModal = useCallback(() => setIsEmergencyModalOpen(false), []);

  const triggerSOSAlert = useCallback((customReason?: string) => {
    setUrgencyState('escalate');

    // Transmit emergency broadcast to backend dispatch & DPDP audit log
    fetch('/api/emergency/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId: profile.id,
        patientName: profile.name,
        bloodGroup: profile.bloodGroup,
        allergies: profile.allergies,
        caregiverPhone: profile.caregiverPhone,
        doctorPhone: profile.doctorPhone,
      }),
    }).catch((err) => console.warn('Emergency dispatch error:', err));

    const newAlert: CaregiverAlert = {
      id: `alt-sos-${Date.now()}`,
      patientId: profile.id,
      patientName: profile.name,
      timestamp: 'Just now',
      title: `EMERGENCY SOS Triggered by ${profile.name}!`,
      detail: customReason || 'Patient tapped Emergency SOS button. Immediate check required.',
      urgency: 'urgent',
      status: 'active',
    };
    setCaregiverAlerts((prev) => [newAlert, ...prev]);
  }, [profile.id, profile.name, profile.bloodGroup, profile.allergies, profile.caregiverPhone, profile.doctorPhone]);

  // Voice narration (Web Speech API)
  const speakText = useCallback((text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.92; // slightly calmer pace for elderly clarity
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <AdaptiveContext.Provider
      value={{
        profile,
        setProfile,
        availableProfiles: allAvailableProfiles,
        switchProfileById,
        urgencyState,
        appMode,
        setAppMode,
        language,
        setLanguage,
        theme,
        setTheme,
        toggleTheme,
        isHighContrastDark: theme === 'dark',
        careCircle,
        toggleCareCirclePermission,
        isPitchGuideOpen,
        setIsPitchGuideOpen,
        pitchStep,
        setPitchStep,
        medications,
        toggleMedication,
        undoMedication,
        refillMedication,
        activeLowSupplyNotice,
        dismissLowSupplyNotice,
        triggerTestLowSupplyAlert,
        medicationAdherenceRate,
        addScannedMedications,
        doseAlerts,
        activeTriggeredAlert,
        notificationPermission,
        requestNotificationPermission,
        toggleDoseAlert,
        toggleAlertSound,
        updateDoseAlertTime,
        triggerTestAlert,
        dismissActiveAlert,
        snoozeActiveAlert,
        markDoseAsTakenFromAlert,
        caretakerSession,
        setCaretakerSession,
        linkedPatients,
        linkPatientById,
        unlinkPatient,
        selectedCaretakerPatientCode,
        setSelectedCaretakerPatientCode,
        sendCareNoteToPatient,
        requestMedicationRefill,
        recoveryTasks,
        toggleTask,
        appointments,
        addAppointment,
        symptomLogs,
        reportSymptom,
        healthUpdates,
        recordVoiceHealthLog,
        isVoiceLoggerOpen,
        voiceLoggerDefaultCategory,
        openVoiceLogger,
        closeVoiceLogger,
        caregiverAlerts,
        acknowledgeAlert,
        dismissAlertNotUrgent,
        lastFeedbackNotice,
        clearFeedbackNotice,
        documents,
        addDocument,
        confirmDocument,
        timeline,
        addTimelineEvent,
        isEmergencyModalOpen,
        openEmergencyModal,
        closeEmergencyModal,
        triggerSOSAlert,
        speakText,
        isSpeaking,
        stopSpeaking,
        isOnboardingOpen,
        onboardingStep,
        openOnboarding,
        closeOnboarding,
        setOnboardingStep,
        hasCompletedOnboarding,
        completeOnboarding,
        dismissOnboardingBanner,
        showOnboardingBanner,
        designatedContact,
        setDesignatedContact,
        availableEmergencyContacts,
        addCustomEmergencyContact,
        quickAlertData,
        openQuickAlert,
        closeQuickAlert,
        triggerQuickAlertSMS,
        triggerQuickAlertCall,
      }}
    >
      {children}
    </AdaptiveContext.Provider>
  );
};

export const useAdaptive = () => {
  const ctx = useContext(AdaptiveContext);
  if (!ctx) {
    throw new Error('useAdaptive must be used within an AdaptiveProvider');
  }
  return ctx;
};
