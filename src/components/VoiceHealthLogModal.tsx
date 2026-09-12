import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Activity,
  HeartPulse,
  Volume2,
  Sparkles,
  Clock,
  Send,
  ShieldCheck,
  FileText,
  RotateCcw,
  ShieldAlert,
  PhoneCall,
  MessageSquare,
} from 'lucide-react';
import { useAdaptive } from '../context/AdaptiveContext';
import { HealthUpdateLog } from '../types';

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: {
    resultIndex: number;
    results: {
      length: number;
      [index: number]: {
        isFinal?: boolean;
        [index: number]: { transcript: string };
      };
    };
  }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

export const VoiceHealthLogModal: React.FC = () => {
  const {
    isVoiceLoggerOpen,
    closeVoiceLogger,
    voiceLoggerDefaultCategory,
    recordVoiceHealthLog,
    healthUpdates,
    profile,
    language,
    speakText,
    designatedContact,
    openQuickAlert,
    triggerQuickAlertSMS,
    triggerQuickAlertCall,
  } = useAdaptive();

  const isElder = profile.ageBand === 'elder';

  const [category, setCategory] = useState<'daily_update' | 'symptom'>('daily_update');
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe'>('mild');
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [hasSupport, setHasSupport] = useState(true);
  const [permissionState, setPermissionState] = useState<'idle' | 'listening' | 'error'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSuccessLog, setSavedSuccessLog] = useState<HealthUpdateLog | null>(null);
  const [quickAlertFeedback, setQuickAlertFeedback] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Initialize category when opening modal
  useEffect(() => {
    if (isVoiceLoggerOpen) {
      setCategory(voiceLoggerDefaultCategory);
      setTranscript('');
      setInterimText('');
      setSavedSuccessLog(null);
    }
  }, [isVoiceLoggerOpen, voiceLoggerDefaultCategory]);

  // Check browser speech recognition constructor
  const getSpeechRec = (): SpeechRecognitionConstructor | null => {
    if (typeof window === 'undefined') return null;
    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return win.SpeechRecognition || win.webkitSpeechRecognition || null;
  };

  useEffect(() => {
    const SpeechRec = getSpeechRec();
    if (!SpeechRec) {
      setHasSupport(false);
    }
  }, []);

  // Map app language to BCP 47 speech recognition locale
  const getSpeechLangCode = () => {
    switch (language) {
      case 'hi':
        return 'hi-IN';
      case 'ta':
        return 'ta-IN';
      case 'es':
        return 'es-ES';
      default:
        return 'en-IN';
    }
  };

  const startListening = () => {
    const SpeechRec = getSpeechRec();
    if (!SpeechRec) {
      // Browser fallback simulation
      setPermissionState('error');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const rec = new SpeechRec();
      rec.lang = getSpeechLangCode();
      rec.continuous = true;
      rec.interimResults = true;

      rec.onstart = () => {
        setIsListening(true);
        setPermissionState('listening');
      };

      rec.onresult = (event) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalStr += res[0].transcript + ' ';
          } else {
            interimStr += res[0].transcript;
          }
        }

        if (finalStr) {
          setTranscript((prev) => (prev ? `${prev.trim()} ${finalStr.trim()}` : finalStr.trim()));
          setInterimText('');
        } else {
          setInterimText(interimStr);
        }
      };

      rec.onerror = (err) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
        setPermissionState('idle');
      };

      rec.onend = () => {
        setIsListening(false);
        setPermissionState('idle');
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setPermissionState('idle');
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Quick preset voice phrases for instant testing or fallback
  const samplePhrases = [
    {
      cat: 'daily_update' as const,
      label: 'Walked 15 min corridor',
      text: 'Completed 15 minutes of gentle walking in the hallway without dizziness. Drank warm water after.',
    },
    {
      cat: 'daily_update' as const,
      label: 'Morning BP 120/80',
      text: 'Blood pressure measured at 122 over 78 mmHg. Resting pulse was 72 bpm.',
    },
    {
      cat: 'symptom' as const,
      label: 'Mild vein site soreness',
      text: 'Feeling mild soreness and heaviness around the leg harvest site after afternoon nap.',
    },
    {
      cat: 'symptom' as const,
      label: 'Dizziness upon standing',
      text: 'Experienced sudden lightheadedness when getting out of bed this morning.',
    },
  ];

  const handleApplyPreset = (phrase: typeof samplePhrases[0]) => {
    setCategory(phrase.cat);
    setTranscript(phrase.text);
    if (phrase.cat === 'symptom') {
      setSeverity(phrase.text.toLowerCase().includes('dizziness') ? 'moderate' : 'mild');
    }
  };

  const handleSaveLog = async () => {
    const fullText = (transcript + ' ' + interimText).trim();
    if (!fullText) return;

    setIsSubmitting(true);
    try {
      const saved = await recordVoiceHealthLog(
        fullText,
        category,
        category === 'symptom' ? severity : undefined
      );

      setSavedSuccessLog(saved);
      setTranscript('');
      setInterimText('');

      // Voice readback confirmation for elders or voice-primary users
      if (isElder || profile.accessibility.voicePrimary) {
        const spokenConfirmation =
          saved.category === 'symptom'
            ? `Your symptom has been securely recorded on your recovery ledger. Safety state is ${saved.safetyState || 'normal'}.`
            : `Your daily health update has been saved to your timeline.`;
        speakText(spokenConfirmation);
      }
    } catch (err) {
      console.error('Failed to record voice health log:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVoiceLoggerOpen) return null;

  return (
    <div
      id="voice-health-logger-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-logger-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in"
    >
      <div
        className={`w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] ${
          isElder ? 'border-2 border-emerald-900 ring-4 ring-emerald-100' : ''
        }`}
      >
        {/* Modal Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between ${
            isElder ? 'bg-emerald-800 text-white' : 'bg-slate-900 text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white">
              <Mic className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 id="voice-logger-title" className="text-base sm:text-lg font-bold">
                Voice Health Journal
              </h2>
              <p className="text-xs text-white/80">
                Web Speech API · Spoken updates persist as verified text logs
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopListening();
              closeVoiceLogger();
            }}
            aria-label="Close voice journal"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Category Toggle: Daily Update vs Symptom */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Select What You Are Documenting:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setCategory('daily_update')}
                className={`p-3 rounded-2xl border transition-all text-left flex items-start gap-2.5 cursor-pointer min-h-[48px] ${
                  category === 'daily_update'
                    ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-200 text-emerald-950 font-bold'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Activity className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold">Daily Health Update</div>
                  <div className="text-[11px] text-slate-500 font-normal">
                    Walking, vitals, meals, sleep, recovery notes
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCategory('symptom')}
                className={`p-3 rounded-2xl border transition-all text-left flex items-start gap-2.5 cursor-pointer min-h-[48px] ${
                  category === 'symptom'
                    ? 'bg-amber-50 border-amber-600 ring-2 ring-amber-200 text-amber-950 font-bold'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <HeartPulse className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold">Symptom / Discomfort</div>
                  <div className="text-[11px] text-slate-500 font-normal">
                    Pain, dizziness, breathlessness (triggers safety triage)
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* If Symptom: Severity selector */}
          {category === 'symptom' && (
            <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">Perceived Severity:</span>
                <span className="text-[10px] text-amber-700 font-medium">Deterministic clinical floor</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['mild', 'moderate', 'severe'] as const).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverity(sev)}
                    className={`py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer min-h-[38px] ${
                      severity === sev
                        ? sev === 'severe'
                          ? 'bg-rose-700 text-white shadow-xs'
                          : sev === 'moderate'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Speech Recording Stage */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-3xl border border-slate-200 relative overflow-hidden">
            {/* Animated Sound Wave Rings when active */}
            {isListening && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                <div className="w-36 h-36 rounded-full bg-emerald-500 animate-ping" />
                <div className="w-52 h-52 rounded-full bg-emerald-400 animate-pulse delay-75 absolute" />
              </div>
            )}

            {/* Mic Toggle Button */}
            <button
              id="voice-modal-mic-toggle"
              type="button"
              onClick={toggleListening}
              aria-label={isListening ? 'Stop recording voice' : 'Start speaking voice update'}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all cursor-pointer select-none ${
                isListening
                  ? 'bg-rose-600 hover:bg-rose-700 text-white ring-8 ring-rose-200 scale-105'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white hover:scale-105 ring-4 ring-emerald-100'
              }`}
            >
              {isListening ? (
                <MicOff className="w-9 h-9" />
              ) : (
                <Mic className="w-9 h-9" />
              )}
            </button>

            <div className="mt-4 text-center z-10">
              <span className={`text-sm font-extrabold ${isListening ? 'text-rose-700 animate-pulse' : 'text-slate-800'}`}>
                {isListening ? 'Listening in real-time... speak clearly' : 'Tap Microphone to Speak'}
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Using Web Speech Recognition · {language.toUpperCase()} ({getSpeechLangCode()})
              </p>
            </div>

            {/* Real-time wave bars */}
            {isListening && (
              <div className="flex items-center gap-1.5 mt-3 h-5">
                <span className="w-1 bg-emerald-600 rounded-full animate-bounce h-3" />
                <span className="w-1 bg-emerald-600 rounded-full animate-bounce h-5 delay-100" />
                <span className="w-1 bg-emerald-600 rounded-full animate-bounce h-2 delay-200" />
                <span className="w-1 bg-emerald-600 rounded-full animate-bounce h-4 delay-150" />
                <span className="w-1 bg-emerald-600 rounded-full animate-bounce h-3 delay-75" />
              </div>
            )}
          </div>

          {/* Spoken Text Review & Edit Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="voice-transcript-input" className="text-xs font-bold text-slate-700">
                Spoken Transcript (Review & Edit if needed):
              </label>
              {(transcript || interimText) && (
                <button
                  type="button"
                  onClick={() => {
                    setTranscript('');
                    setInterimText('');
                  }}
                  className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            <div className="relative">
              <textarea
                id="voice-transcript-input"
                rows={3}
                value={transcript + (interimText ? (transcript ? ' ' : '') + interimText : '')}
                onChange={(e) => {
                  setTranscript(e.target.value);
                  setInterimText('');
                }}
                placeholder={
                  isListening
                    ? 'Listening... your words will appear here as you speak...'
                    : 'Tap microphone above or select a sample below to document your update...'
                }
                className="w-full p-3.5 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm font-medium text-slate-900 bg-white placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Quick Presets / Test Samples */}
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Quick Test Phrases (or fallback if microphone blocked in iframe):
            </span>
            <div className="flex flex-wrap gap-2">
              {samplePhrases.map((phrase, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(phrase)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-emerald-900 transition-colors cursor-pointer"
                >
                  {phrase.cat === 'symptom' ? '⚠️' : '📝'} {phrase.label}
                </button>
              ))}
            </div>
          </div>

          {/* Success Banner if just saved */}
          {savedSuccessLog && (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-300 animate-scale-in space-y-2">
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Voice Update Persisted to Health Ledger!</span>
              </div>
              <p className="text-xs text-emerald-900 font-medium">
                "{savedSuccessLog.summary || savedSuccessLog.transcript}"
              </p>
              <div className="flex items-center gap-2 text-[11px] text-emerald-800">
                <span className="font-bold bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                  {savedSuccessLog.timestamp}
                </span>
                {savedSuccessLog.safetyState && (
                  <span
                    className={`font-bold px-2 py-0.5 rounded-md ${
                      savedSuccessLog.safetyState === 'ESCALATE'
                        ? 'bg-rose-100 text-rose-800'
                        : savedSuccessLog.safetyState === 'MONITOR'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    Triage: {savedSuccessLog.safetyState}
                  </span>
                )}
                <span className="text-slate-500">· Stored in local ledger & timeline</span>
              </div>

              {/* Quick Alert Trigger for Severe Voice Symptoms */}
              {(savedSuccessLog.safetyState === 'ESCALATE' || savedSuccessLog.severity === 'severe') && (
                <div className="mt-3 p-3 bg-rose-100 border border-rose-300 rounded-xl space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-600 animate-pulse" />
                      Quick Alert: Severe Symptom Flagged
                    </span>
                    <span className="text-[11px] font-bold text-rose-800">
                      Contact: {designatedContact.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-900 font-medium">
                    Do you want to send an emergency SOS SMS or call your designated contact right now?
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await triggerQuickAlertSMS(
                          savedSuccessLog.transcript,
                          designatedContact
                        );
                        if (res.success) {
                          setQuickAlertFeedback(
                            `SOS SMS sent to ${designatedContact.name} (${designatedContact.phone})`
                          );
                          setTimeout(() => setQuickAlertFeedback(null), 5000);
                        }
                      }}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Send SOS SMS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerQuickAlertCall(designatedContact);
                        setQuickAlertFeedback(`Calling ${designatedContact.name}...`);
                        setTimeout(() => setQuickAlertFeedback(null), 4000);
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Direct Call</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        openQuickAlert(
                          savedSuccessLog.transcript,
                          'severe',
                          savedSuccessLog.category,
                          'voice'
                        )
                      }
                      className="ml-auto px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs rounded-lg cursor-pointer"
                    >
                      <span>Full Alert Dialog &rarr;</span>
                    </button>
                  </div>
                  {quickAlertFeedback && (
                    <p className="text-xs font-bold text-emerald-800 bg-emerald-50 p-1.5 rounded border border-emerald-200">
                      ✓ {quickAlertFeedback}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Recent Voice Logs History List */}
          <div className="pt-2 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-700" />
              <span>Persisted Voice Text Logs ({healthUpdates.length})</span>
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {healthUpdates.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-start justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.category === 'symptom'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {log.category === 'symptom' ? 'Symptom' : 'Update'}
                      </span>
                      <span className="text-[11px] text-slate-500">{log.timestamp}</span>
                      {log.safetyState && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            log.safetyState === 'ESCALATE'
                              ? 'bg-rose-200 text-rose-900'
                              : log.safetyState === 'MONITOR'
                              ? 'bg-amber-200 text-amber-900'
                              : 'bg-emerald-200 text-emerald-900'
                          }`}
                        >
                          {log.safetyState}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-800 font-medium">{log.summary || log.transcript}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => speakText(log.summary || log.transcript)}
                    aria-label="Read log aloud"
                    className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer shrink-0"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-5 py-4 border-t bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              stopListening();
              closeVoiceLogger();
            }}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-200 font-bold text-xs cursor-pointer min-h-[44px]"
          >
            Done / Close
          </button>

          <button
            id="voice-modal-submit-button"
            type="button"
            disabled={isSubmitting || (!transcript.trim() && !interimText.trim())}
            onClick={handleSaveLog}
            className={`px-5 py-2.5 rounded-xl font-bold text-white shadow-md flex items-center gap-2 transition-all cursor-pointer min-h-[44px] ${
              !transcript.trim() && !interimText.trim()
                ? 'bg-slate-400 opacity-60 cursor-not-allowed'
                : isElder
                ? 'bg-emerald-800 hover:bg-emerald-900 text-base'
                : 'bg-emerald-700 hover:bg-emerald-800 text-sm'
            }`}
          >
            {isSubmitting ? (
              <span>Saving to Ledger...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Save to Health Ledger</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
