import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  FileText,
  Activity,
  HeartPulse,
  ArrowRight,
  ArrowLeft,
  X,
  SlidersHorizontal,
  Wand2,
  ShieldCheck,
  Check,
  Clock,
  Pill,
  Headphones,
  Eye,
  Camera,
} from 'lucide-react';
import { useAdaptive } from '../context/AdaptiveContext';
import { SymptomCategory } from '../types';

interface VoiceTourStep {
  id: string;
  stepNumber: number;
  title: string;
  badge: string;
  subtitle: string;
  narrationText: string;
  keyPoints: Array<{
    title: string;
    description: string;
    icon: React.ReactNode;
  }>;
}

export const VoiceGuidedOnboardingModal: React.FC<{
  onNavigateToTab?: (tab: string) => void;
  onOpenOcrScanner?: () => void;
}> = ({ onNavigateToTab, onOpenOcrScanner }) => {
  const {
    isOnboardingOpen,
    closeOnboarding,
    onboardingStep,
    setOnboardingStep,
    completeOnboarding,
    openVoiceLogger,
    profile,
    language,
  } = useAdaptive();

  const isElder = profile.ageBand === 'elder';

  // Voice narration state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(isElder ? 0.88 : 0.95);
  const [autoNarrate, setAutoNarrate] = useState<boolean>(true);
  const [currentCaption, setCurrentCaption] = useState<string>('');

  // Interactive Voice Logging Simulator State
  const [simulatedVoiceState, setSimulatedVoiceState] = useState<{
    status: 'idle' | 'listening' | 'evaluating' | 'completed';
    transcript: string;
    category?: SymptomCategory;
    severity?: 'mild' | 'moderate' | 'severe';
    safetyState?: 'NORMAL' | 'MONITOR' | 'ESCALATE';
    explanation?: string;
  }>({
    status: 'idle',
    transcript: '',
  });

  // Interactive OCR Simulator State
  const [ocrDemoMode, setOcrDemoMode] = useState<'preprocessed' | 'original'>('preprocessed');
  const [ocrActiveFilter, setOcrActiveFilter] = useState<'clinical_auto' | 'faint_thermal' | 'handwriting_sharpen'>('faint_thermal');

  // Live mic test inside simulator
  const [isLiveMicActive, setIsLiveMicActive] = useState<boolean>(false);
  const [liveMicError, setLiveMicError] = useState<string | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const steps: VoiceTourStep[] = [
    {
      id: 'welcome',
      stepNumber: 1,
      title: 'Welcome to SATHI · Voice-First Healthcare',
      badge: 'Step 1 of 4 · Introduction',
      subtitle: 'Designed for effortless recovery at home without typing on small screens.',
      narrationText:
        'Welcome to SATHI! SATHI is your voice-first healthcare companion, built specifically for recovery at home. With SATHI, you do not need to struggle with tiny phone keyboards or decipher confusing doctor handwriting. You can simply speak to log your symptoms in real time, and snap photos of crumpled pharmacy receipts or doctor slips for instant digital scanning. Let us take a quick two-minute tour to see how it works.',
      keyPoints: [
        {
          title: 'Hands-Free Voice Journal',
          description: 'Speak in natural everyday language. SATHI transcribes and triages your recovery symptoms automatically.',
          icon: <Mic className="w-5 h-5 text-emerald-600" />,
        },
        {
          title: 'Advanced Receipt & Rx Scanner',
          description: 'Automatic contrast leveling and 3x3 sharpening clarify faded thermal ink and doctor handwriting before Gemini OCR.',
          icon: <Receipt className="w-5 h-5 text-teal-600" />,
        },
        {
          title: 'Adaptive Safety & Simplicity',
          description: 'Large fonts and 1-tap buttons for elders; prioritized clinical alerts to protect caregivers from alert fatigue.',
          icon: <ShieldCheck className="w-5 h-5 text-indigo-600" />,
        },
      ],
    },
    {
      id: 'voice-logging',
      stepNumber: 2,
      title: 'Voice-First Symptom Logging & Clinical Triage',
      badge: 'Step 2 of 4 · Voice Journal',
      subtitle: 'Report discomfort, recovery progress, or medication effects using natural speech.',
      narrationText:
        'Whenever you feel discomfort, fatigue, or any unusual sensation, simply tap the floating green microphone. You can speak colloquially in everyday language, like: "I took my morning pills, but I feel slight heaviness in my chest while climbing the stairs." SATHI transcribes your speech in real time, classifies the category, and cross-checks your words against cardiac safety guidelines. If there is a red flag, your family or doctor is alerted immediately.',
      keyPoints: [
        {
          title: '1-Tap Microphone Activation',
          description: 'Tap the mic icon anytime on the Today screen, header, or the floating button to start recording.',
          icon: <Mic className="w-5 h-5 text-emerald-600" />,
        },
        {
          title: 'Colloquial & Multilingual',
          description: 'Speak naturally in English or Hindi without needing medical jargon or clinical codes.',
          icon: <Sparkles className="w-5 h-5 text-amber-600" />,
        },
        {
          title: 'Deterministic Red Flag Safeguard',
          description: 'Cardio-respiratory symptoms like acute chest tightness trigger instant escalation with complete clinical provenance.',
          icon: <HeartPulse className="w-5 h-5 text-rose-600" />,
        },
      ],
    },
    {
      id: 'ocr-scanning',
      stepNumber: 3,
      title: 'OCR Receipt Scanning with Image Pre-processing',
      badge: 'Step 3 of 4 · OCR Scanner',
      subtitle: 'Turn crumpled paper slips, faded thermal receipts, and doctor notes into active medicine reminders.',
      narrationText:
        'Doctors often hand you paper discharge slips and pharmacy bills with confusing abbreviations like 1-0-1 or OD. SATHI includes an automated image pre-processing engine. When you snap a photo, it normalizes lighting, stretches faded contrast, and applies a 3x3 Laplacian sharpening kernel to make faint ink and doctor cursive crystal clear before sending it to Gemini OCR. The scanner automatically extracts medicine names, dosages, and schedules into your daily routine.',
      keyPoints: [
        {
          title: 'Automated Image Pre-processing',
          description: 'Percentile-clipped contrast leveling and 3x3 edge convolution rescue faded pharmacy thermal slips and phone shadows.',
          icon: <Wand2 className="w-5 h-5 text-emerald-600" />,
        },
        {
          title: 'Gemini Multimodal Extraction',
          description: 'Accurately parses medicine names, dosages, frequency codes (1-0-1, BD, TDS), and doctor cautionary instructions.',
          icon: <FileText className="w-5 h-5 text-teal-600" />,
        },
        {
          title: 'A/B Inspection & 1-Tap Add',
          description: 'Toggle between Cleaned and Original image views, verify extracted items, and add them directly to your recovery schedule.',
          icon: <CheckCircle2 className="w-5 h-5 text-blue-600" />,
        },
      ],
    },
    {
      id: 'ready',
      stepNumber: 4,
      title: 'You Are All Set · Start Your Recovery',
      badge: 'Step 4 of 4 · Summary',
      subtitle: 'Your personalized recovery plan is active and ready to support you.',
      narrationText:
        'You are all set! SATHI automatically adapts to your needs. In Elder mode, fonts are enlarged with 1-tap confirmation. In Caregiver mode, alerts are prioritized to prevent burnout. Whenever you need help, look for the Voice Journal microphone or the OCR Scanner in Medicines. Tap Complete Tour to begin your recovery.',
      keyPoints: [
        {
          title: 'Voice Journal Shortcut',
          description: 'Tap the green floating microphone anytime to record symptoms or speak a daily update.',
          icon: <Mic className="w-5 h-5 text-emerald-600" />,
        },
        {
          title: 'Medicines & Scan Shortcut',
          description: 'Visit Medicines to view your schedule or tap "Scan Prescription Receipt" to upload new slips.',
          icon: <Pill className="w-5 h-5 text-emerald-600" />,
        },
        {
          title: 'Emergency SOS Card',
          description: 'The red SOS button in the top bar provides 1-tap access to your emergency contacts and clinical summary.',
          icon: <HeartPulse className="w-5 h-5 text-rose-600" />,
        },
      ],
    },
  ];

  const currentStepData = steps[onboardingStep] || steps[0];

  // Stop any active speech synthesis
  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setCurrentCaption('');
  }, []);

  // Speak narration for current step
  const speakCurrentStep = useCallback(() => {
    if (isMuted) {
      stopSpeech();
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const textToSpeak = currentStepData.narrationText;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utteranceRef.current = utterance;

    utterance.rate = playbackRate;
    utterance.pitch = 1.0;

    // Try to pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => (v.lang.includes('en-IN') || v.lang.includes('en-GB') || v.lang.includes('en-US')) && !v.name.includes('Google')
    ) || voices.find((v) => v.lang.includes('en'));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setCurrentCaption(textToSpeak);
    };

    utterance.onend = () => {
      setIsPlaying(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [currentStepData.narrationText, isMuted, playbackRate, stopSpeech]);

  // Effect: when step changes, trigger speech if auto-narrate is on
  useEffect(() => {
    if (isOnboardingOpen) {
      if (autoNarrate && !isMuted) {
        // Small delay to allow modal transition
        const timer = setTimeout(() => {
          speakCurrentStep();
        }, 250);
        return () => clearTimeout(timer);
      } else {
        stopSpeech();
      }
    } else {
      stopSpeech();
    }
  }, [onboardingStep, isOnboardingOpen, autoNarrate, isMuted, speakCurrentStep, stopSpeech]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, [stopSpeech]);

  // Play / Pause narration toggle
  const togglePlayPause = () => {
    if (isPlaying) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
    } else {
      setIsMuted(false);
      speakCurrentStep();
    }
  };

  // Step navigation
  const handleNext = () => {
    stopSpeech();
    if (onboardingStep < steps.length - 1) {
      setOnboardingStep(onboardingStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const handlePrev = () => {
    stopSpeech();
    if (onboardingStep > 0) {
      setOnboardingStep(onboardingStep - 1);
    }
  };

  // Run interactive voice simulation
  const runVoiceSimulation = (presetIndex: number) => {
    const presets = [
      {
        transcript: 'I have slight sternal incision soreness when getting out of bed this morning.',
        category: 'Pain' as SymptomCategory,
        severity: 'mild' as const,
        safetyState: 'NORMAL' as const,
        explanation: 'Expected post-sternotomy muscular stiffness on day 5. Non-cardiac profile, no radiating pressure.',
      },
      {
        transcript: 'Feeling sudden tight squeezing chest pain with shortness of breath while walking to bathroom.',
        category: 'Cardiovascular' as SymptomCategory,
        severity: 'severe' as const,
        safetyState: 'ESCALATE' as const,
        explanation: 'CARDIO-RESPIRATORY RED FLAG: Acute chest squeezing with dyspnea exceeds safe threshold. Escalating to Caregiver & Doctor.',
      },
      {
        transcript: 'Took my morning metoprolol with toast and tea. Feeling well and energized.',
        category: 'Other' as SymptomCategory,
        severity: 'mild' as const,
        safetyState: 'NORMAL' as const,
        explanation: 'Routine medication compliance update recorded to daily recovery timeline.',
      },
    ];

    const chosen = presets[presetIndex];
    setSimulatedVoiceState({
      status: 'listening',
      transcript: 'Listening...',
    });

    setTimeout(() => {
      setSimulatedVoiceState({
        status: 'evaluating',
        transcript: `"${chosen.transcript}"`,
      });

      setTimeout(() => {
        setSimulatedVoiceState({
          status: 'completed',
          transcript: chosen.transcript,
          category: chosen.category,
          severity: chosen.severity,
          safetyState: chosen.safetyState,
          explanation: chosen.explanation,
        });
      }, 700);
    }, 600);
  };

  // Live microphone test in walkthrough
  const handleLiveMicTest = () => {
    if (typeof window === 'undefined') return;
    const win = window as unknown as {
      SpeechRecognition?: any;
      webkitSpeechRecognition?: any;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      setLiveMicError('Speech recognition is not supported in this browser. Simulation mode active.');
      runVoiceSimulation(0);
      return;
    }

    try {
      setIsLiveMicActive(true);
      setLiveMicError(null);
      setSimulatedVoiceState({
        status: 'listening',
        transcript: 'Speak now (e.g. "I feel a bit tired after breakfast")...',
      });

      const recognition = new SpeechRec();
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        const text = event.results[0]?.[0]?.transcript || '';
        if (text) {
          setSimulatedVoiceState((prev) => ({
            ...prev,
            transcript: text,
            status: 'evaluating',
          }));
        }
      };

      recognition.onend = () => {
        setIsLiveMicActive(false);
        setSimulatedVoiceState((prev) => ({
          ...prev,
          status: 'completed',
          category: 'Pain',
          severity: 'mild',
          safetyState: 'NORMAL',
          explanation: 'Spoken entry captured successfully via browser Speech Recognition.',
        }));
      };

      recognition.onerror = (e: any) => {
        setIsLiveMicActive(false);
        setLiveMicError(`Mic notice: ${e.error || 'Permission denied or timed out.'}`);
      };

      recognition.start();
    } catch {
      setIsLiveMicActive(false);
      setLiveMicError('Unable to access microphone.');
    }
  };

  if (!isOnboardingOpen) {
    return null;
  }

  return (
    <div
      id="voice-onboarding-modal-overlay"
      className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-onboarding-title"
    >
      <div
        id="voice-onboarding-card"
        className={`bg-white rounded-3xl max-w-3xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] transition-all animate-scale-in ${
          isElder ? 'text-slate-950' : 'text-slate-900'
        }`}
      >
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-4 sm:p-5 shrink-0 border-b border-emerald-800/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Title & Badge */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-700/80 text-white flex items-center justify-center shrink-0 shadow-sm border border-emerald-500/30">
                <Headphones className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 id="voice-onboarding-title" className="text-base sm:text-lg font-black tracking-tight">
                    Voice-Guided Walkthrough
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-extrabold border border-emerald-500/40">
                    {currentStepData.badge}
                  </span>
                </div>
                <p className="text-xs text-emerald-200/90 font-medium">
                  Listen or read along · Interactive demonstration
                </p>
              </div>
            </div>

            {/* Close & Skip Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={completeOnboarding}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                Skip Tour
              </button>
              <button
                type="button"
                onClick={closeOnboarding}
                aria-label="Close walkthrough"
                className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Voice Audio Player Control Ribbon */}
          <div className="mt-3 pt-3 border-t border-emerald-800/60 flex flex-wrap items-center justify-between gap-2.5 bg-emerald-950/60 p-2.5 rounded-2xl">
            {/* Audio Play/Pause & Equalizer */}
            <div className="flex items-center gap-2.5">
              <button
                id="voice-tour-play-pause-btn"
                type="button"
                onClick={togglePlayPause}
                aria-label={isPlaying ? 'Pause voice narration' : 'Play voice narration'}
                className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  isPlaying
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 ring-2 ring-amber-300/40'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isPlaying ? 'Pause Voice' : 'Listen with Voice'}</span>
              </button>

              <button
                id="voice-tour-replay-btn"
                type="button"
                onClick={speakCurrentStep}
                title="Replay narration from beginning"
                className="p-2 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors border border-emerald-700/40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Replay</span>
              </button>

              {/* Animated Waveform Equalizer */}
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-900/50 border border-emerald-800/60 text-xs">
                <span className="text-[10px] uppercase font-bold text-emerald-300/90 mr-1 hidden sm:inline">
                  {isPlaying ? 'Speaking' : 'Audio Guide'}
                </span>
                <div className="flex items-end gap-1 h-4">
                  <span
                    className={`w-1 bg-emerald-400 rounded-full transition-all duration-300 ${
                      isPlaying ? 'h-4 animate-bounce' : 'h-1.5'
                    }`}
                  />
                  <span
                    className={`w-1 bg-teal-300 rounded-full transition-all duration-300 delay-75 ${
                      isPlaying ? 'h-3 animate-pulse' : 'h-2'
                    }`}
                  />
                  <span
                    className={`w-1 bg-emerald-400 rounded-full transition-all duration-300 delay-150 ${
                      isPlaying ? 'h-5 animate-bounce' : 'h-1'
                    }`}
                  />
                  <span
                    className={`w-1 bg-teal-300 rounded-full transition-all duration-300 delay-100 ${
                      isPlaying ? 'h-3 animate-pulse' : 'h-2'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Narration Controls (Speed & Mute) */}
            <div className="flex items-center gap-2 text-xs">
              {/* Speed toggle */}
              <div className="flex items-center gap-1 bg-emerald-900/80 p-1 rounded-xl border border-emerald-700/50">
                <span className="text-[10px] text-emerald-300/80 pl-1 font-semibold">Speed:</span>
                {[
                  { label: '0.85x', value: 0.85, hint: 'Elder / Relaxed' },
                  { label: '1.0x', value: 1.0, hint: 'Normal' },
                  { label: '1.15x', value: 1.15, hint: 'Brisk' },
                ].map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => {
                      setPlaybackRate(s.value);
                      if (isPlaying) {
                        speakCurrentStep();
                      }
                    }}
                    title={s.hint}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                      playbackRate === s.value
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-emerald-300 hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Mute button */}
              <button
                type="button"
                onClick={() => {
                  if (isMuted) {
                    setIsMuted(false);
                    speakCurrentStep();
                  } else {
                    setIsMuted(true);
                    stopSpeech();
                  }
                }}
                className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                  isMuted
                    ? 'bg-rose-900/60 border-rose-700 text-rose-200'
                    : 'bg-emerald-900/80 border-emerald-700/50 text-emerald-200 hover:text-white'
                }`}
                title={isMuted ? 'Unmute voice guide' : 'Mute voice guide'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Live Narration Subtitle Caption Bar */}
        <div className="bg-slate-900 px-4 py-2.5 text-xs text-slate-200 border-b border-slate-800 flex items-start gap-2.5">
          <div className="w-5 h-5 rounded-md bg-emerald-800 text-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
            <Volume2 className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-wider font-bold text-emerald-400">
              Spoken Transcript (Live Closed Captions):
            </p>
            <p className="text-xs text-slate-100 font-medium leading-relaxed italic mt-0.5">
              "{currentStepData.narrationText}"
            </p>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Step Heading */}
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
              {currentStepData.title}
            </h2>
            <p className="text-sm text-slate-600 font-medium">
              {currentStepData.subtitle}
            </p>
          </div>

          {/* ============================================================ */}
          {/* STEP 1: WELCOME & VOICE-FIRST PHILOSOPHY */}
          {/* ============================================================ */}
          {onboardingStep === 0 && (
            <div className="space-y-5 animate-fade-in">
              {/* Dual Core Pillars */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pillar 1: Voice First */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/80 border-2 border-emerald-200 shadow-xs space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                    <Mic className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-emerald-950">
                      1. Voice-First Symptom Logging
                    </h4>
                    <p className="text-xs text-emerald-900/80 mt-1 leading-relaxed">
                      No tiny keyboards. Tap once to speak your symptoms in English or Hindi. SATHI transcribes speech and detects cardio-respiratory red flags in seconds.
                    </p>
                  </div>
                  <div className="pt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Colloquial words · Safety triage · Caregiver alerts</span>
                  </div>
                </div>

                {/* Pillar 2: OCR Scanner */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-50 to-sky-50/80 border-2 border-teal-200 shadow-xs space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-teal-950">
                      2. OCR Receipt &amp; Rx Scanner
                    </h4>
                    <p className="text-xs text-teal-900/80 mt-1 leading-relaxed">
                      Snap crumpled pharmacy bills or doctor slips. SATHI normalizes contrast and applies 3x3 edge sharpening so Gemini OCR accurately extracts doses and timings.
                    </p>
                  </div>
                  <div className="pt-1 flex items-center gap-1.5 text-xs font-bold text-teal-800">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    <span>Faded thermal slip rescue · 1-tap add to schedule</span>
                  </div>
                </div>
              </div>

              {/* 3 Key Takeaways */}
              <div className="space-y-2.5 pt-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Core Architectural Advantages
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {currentStepData.keyPoints.map((pt, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="p-2 rounded-lg bg-white border border-slate-200 w-fit shadow-2xs">
                        {pt.icon}
                      </div>
                      <h5 className="text-xs font-bold text-slate-900">{pt.title}</h5>
                      <p className="text-[11px] text-slate-600 leading-normal">{pt.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 2: VOICE-FIRST SYMPTOM LOGGING & CLINICAL TRIAGE */}
          {/* ============================================================ */}
          {onboardingStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              {/* How Voice Pipeline Operates */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-700" />
                  <span>The Voice-to-Triage Clinical Pipeline</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-emerald-200 shadow-2xs">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center mx-auto mb-1 text-[11px]">
                      1
                    </span>
                    <span className="font-bold text-slate-900 block">Tap Mic</span>
                    <span className="text-[10px] text-slate-500">Start browser speech rec</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-emerald-200 shadow-2xs">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center mx-auto mb-1 text-[11px]">
                      2
                    </span>
                    <span className="font-bold text-slate-900 block">Natural Speech</span>
                    <span className="text-[10px] text-slate-500">English, Hindi, slang</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-emerald-200 shadow-2xs">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center mx-auto mb-1 text-[11px]">
                      3
                    </span>
                    <span className="font-bold text-slate-900 block">Classification</span>
                    <span className="text-[10px] text-slate-500">Pain, Heart, Digestive</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-emerald-200 shadow-2xs">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center mx-auto mb-1 text-[11px]">
                      4
                    </span>
                    <span className="font-bold text-slate-900 block">Safety Check</span>
                    <span className="text-[10px] text-slate-500">Alerts caregiver if urgent</span>
                  </div>
                </div>
              </div>

              {/* Interactive Voice Sandbox */}
              <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-4 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-bold text-white">
                      Try Hands-On Voice Simulator:
                    </h4>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Tap a phrase or speak with your mic
                  </span>
                </div>

                {/* Sample Prompt Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => runVoiceSimulation(0)}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-colors cursor-pointer flex flex-col justify-between gap-1"
                  >
                    <span className="text-[10px] font-bold text-emerald-400">Routine Post-Op:</span>
                    <span className="text-xs text-slate-200 font-medium">"Slight sternal incision soreness when getting out of bed."</span>
                    <span className="text-[10px] text-slate-400 mt-1 font-mono">Status: NORMAL</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => runVoiceSimulation(1)}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/80 border border-rose-900/60 text-left transition-colors cursor-pointer flex flex-col justify-between gap-1"
                  >
                    <span className="text-[10px] font-bold text-rose-400">🚨 Red Flag Alert:</span>
                    <span className="text-xs text-slate-200 font-medium">"Sudden tight squeezing chest pain with shortness of breath."</span>
                    <span className="text-[10px] text-rose-300 mt-1 font-mono">Status: ESCALATE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => runVoiceSimulation(2)}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-colors cursor-pointer flex flex-col justify-between gap-1"
                  >
                    <span className="text-[10px] font-bold text-sky-400">Medication Check:</span>
                    <span className="text-xs text-slate-200 font-medium">"Took morning metoprolol with breakfast. Feeling well."</span>
                    <span className="text-[10px] text-slate-400 mt-1 font-mono">Status: LOGGED</span>
                  </button>
                </div>

                {/* Live Mic Test Button */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleLiveMicTest}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                      isLiveMicActive
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {isLiveMicActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span>{isLiveMicActive ? 'Listening to your microphone...' : 'Test Your Live Microphone'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      closeOnboarding();
                      openVoiceLogger('symptom');
                    }}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Launch Full Voice Journal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {liveMicError && (
                  <p className="text-xs text-amber-300 bg-amber-950/60 p-2 rounded-lg border border-amber-800/60">
                    {liveMicError}
                  </p>
                )}

                {/* Simulation Output Card */}
                {simulatedVoiceState.status !== 'idle' && (
                  <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 space-y-2.5 animate-fade-in text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Simulated Audio:</span>
                        <span className="text-emerald-400 font-mono font-bold">
                          {simulatedVoiceState.status === 'listening' ? 'Listening...' : 'Transcribed'}
                        </span>
                      </div>
                      {simulatedVoiceState.safetyState && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-black text-[10px] ${
                            simulatedVoiceState.safetyState === 'ESCALATE'
                              ? 'bg-rose-600 text-white'
                              : simulatedVoiceState.safetyState === 'MONITOR'
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-emerald-500 text-slate-950'
                          }`}
                        >
                          {simulatedVoiceState.safetyState === 'ESCALATE'
                            ? '🔴 ESCALATE TO CAREGIVER'
                            : '🟢 NORMAL POST-OP'}
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-white bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                      "{simulatedVoiceState.transcript}"
                    </p>

                    {simulatedVoiceState.explanation && (
                      <p className="text-xs text-slate-300">
                        <strong>Clinical Assessment:</strong> {simulatedVoiceState.explanation}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 3: OCR RECEIPT & PRESCRIPTION SCANNING */}
          {/* ============================================================ */}
          {onboardingStep === 2 && (
            <div className="space-y-5 animate-fade-in">
              {/* Problem vs SATHI Solution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>The Real-World Paper Problem</span>
                  </div>
                  <ul className="space-y-1.5 text-rose-900/80 list-disc list-inside">
                    <li>Thermal pharmacy cash memos fade quickly into gray ink</li>
                    <li>Doctor discharge letters have handwritten cursive and shorthand (e.g. 1-0-1, OD, HS)</li>
                    <li>Phone camera photos suffer from uneven shadows and glare</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <Wand2 className="w-4 h-4 text-emerald-600" />
                    <span>SATHI's Pre-processing Engine</span>
                  </div>
                  <ul className="space-y-1.5 text-emerald-900/80 list-disc list-inside">
                    <li>Percentile contrast stretching normalizes background lighting</li>
                    <li>3x3 Laplacian edge convolution sharpens faint ink strokes</li>
                    <li>Gemini Multimodal OCR receives crisp, high-contrast text</li>
                  </ul>
                </div>
              </div>

              {/* Interactive OCR Before / After Demonstrator */}
              <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-4 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-teal-400" />
                      <span>Interactive Pre-processing &amp; Extraction Demo</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Toggle to inspect what Gemini sees after image pre-processing
                    </p>
                  </div>

                  {/* A/B Switch */}
                  <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl text-xs border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setOcrDemoMode('preprocessed')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        ocrDemoMode === 'preprocessed'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Cleaned &amp; 3x3 Sharpened
                    </button>
                    <button
                      type="button"
                      onClick={() => setOcrDemoMode('original')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        ocrDemoMode === 'original'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Faded Raw Receipt
                    </button>
                  </div>
                </div>

                {/* Visual Document Simulated Canvas */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-emerald-400 font-bold">
                      {ocrDemoMode === 'preprocessed'
                        ? '✓ Auto-Levels Dynamic Contrast (+38%) · 3x3 Edge Sharpen (+24%)'
                        : '⚠ Raw Document (Faint Thermal Print · Shadowed)'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                      APOLLO PHARMACY · RX #98421
                    </span>
                  </div>

                  {/* Document Simulated Card */}
                  <div
                    className={`p-4 rounded-xl transition-all duration-300 border ${
                      ocrDemoMode === 'preprocessed'
                        ? 'bg-white text-slate-950 border-emerald-400 shadow-md'
                        : 'bg-slate-200/40 text-slate-500 border-slate-400 blur-[0.4px] contrast-75'
                    }`}
                  >
                    <div className="border-b border-slate-300 pb-2 mb-2 flex justify-between items-center text-xs">
                      <span className="font-extrabold tracking-tight">DR. SUNITA MEHTA, MD (CARDIOLOGY)</span>
                      <span className="text-[10px] font-mono">DATE: 12-SEP-2026</span>
                    </div>

                    <div className="space-y-2 font-mono text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold">1. ATORVASTATIN 40MG (1-0-0)</span>
                        <span className="text-[11px] font-semibold">1 Tab · Bedtime · 30 Days</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold">2. METOPROLOL TARTRATE 25MG (1-0-1)</span>
                        <span className="text-[11px] font-semibold">1 Tab · Post Meals · BD</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold">3. ECOSPRIN 75MG (0-1-0)</span>
                        <span className="text-[11px] font-semibold">1 Tab · Post Lunch · OD</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-300 text-[10px] text-slate-600 italic">
                      Caution: Monitor for sternal discomfort or dizziness. Re-evaluate post-op in 2 weeks.
                    </div>
                  </div>

                  {/* Extracted Schedule Pill Output */}
                  <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-emerald-400">
                        Extracted by Gemini Multimodal OCR:
                      </span>
                      <p className="text-emerald-100 font-semibold mt-0.5">
                        3 Medicines Identified · 100% Timing Recognition · Cautionary Note Parsed
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        closeOnboarding();
                        if (onOpenOcrScanner) {
                          onOpenOcrScanner();
                        } else if (onNavigateToTab) {
                          onNavigateToTab('medicines');
                        }
                      }}
                      className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-xs"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Open Live OCR Scanner</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 4: READY TO BEGIN */}
          {/* ============================================================ */}
          {onboardingStep === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-900 text-white space-y-3 shadow-md">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-bold text-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Personalized for {profile.name}</span>
                </div>
                <h3 className="text-xl font-black">
                  Your Healthcare Space Is Configured
                </h3>
                <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                  Whether you are in Elder Mode with 1-tap buttons, Adult Mode with full recovery schedules, or Caregiver Mode with alert prioritization—SATHI is always voice-accessible.
                </p>
              </div>

              {/* Ready Checklist */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Quick Recovery Shortcuts
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {currentStepData.keyPoints.map((pt, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 w-fit">
                        {pt.icon}
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 mt-1">{pt.title}</h5>
                      <p className="text-[11px] text-slate-600">{pt.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation Ribbon */}
        <div className="bg-slate-50 p-4 sm:p-5 border-t border-slate-200 shrink-0 flex items-center justify-between gap-3">
          {/* Step Progress Dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  stopSpeech();
                  setOnboardingStep(idx);
                }}
                aria-label={`Go to step ${idx + 1}`}
                className={`transition-all rounded-full cursor-pointer ${
                  onboardingStep === idx
                    ? 'w-8 h-2.5 bg-emerald-700'
                    : 'w-2.5 h-2.5 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {onboardingStep > 0 && (
              <button
                id="voice-tour-prev-btn"
                type="button"
                onClick={handlePrev}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5 min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}

            <button
              id="voice-tour-next-btn"
              type="button"
              onClick={handleNext}
              className={`px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm text-white transition-all cursor-pointer flex items-center gap-2 shadow-md active:scale-98 min-h-[44px] ${
                onboardingStep === steps.length - 1
                  ? 'bg-emerald-700 hover:bg-emerald-800 ring-2 ring-emerald-300'
                  : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              <span>{onboardingStep === steps.length - 1 ? 'Finish Tour & Start Recovery' : 'Next Step'}</span>
              {onboardingStep === steps.length - 1 ? (
                <Check className="w-4 h-4 stroke-[3]" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
