import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useAdaptive } from '../../context/AdaptiveContext';

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  start: () => void;
  stop?: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  label?: string;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  className = '',
  label = 'Speak to Sathi',
}) => {
  const { profile, language } = useAdaptive();
  const [isListening, setIsListening] = useState(false);
  const [hasSupport, setHasSupport] = useState(true);

  const isElder = profile.ageBand === 'elder';

  const getSpeechRec = (): SpeechRecognitionConstructor | null => {
    if (typeof window === 'undefined') return null;
    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return win.SpeechRecognition || win.webkitSpeechRecognition || null;
  };

  useEffect(() => {
    if (!getSpeechRec()) {
      setHasSupport(false);
    }
  }, []);

  const toggleListening = () => {
    const SpeechRec = getSpeechRec();

    if (!SpeechRec) {
      // Browser fallback simulation if speech recognition is not supported or blocked
      const sampleQueries = [
        'What medicines do I need to take right now?',
        'I am feeling a little dizzy after walking',
        'When is my next doctor visit with Dr. Mehta?',
        'I missed my evening medicine yesterday',
      ];
      const randomQuery = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
      onTranscript(randomQuery);
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      const langMap: Record<string, string> = {
        en: 'en-IN',
        hi: 'hi-IN',
        ta: 'ta-IN',
        es: 'es-ES',
      };
      recognition.lang = langMap[language] || 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event) => {
        const text = event.results[0]?.[0]?.transcript;
        if (text) {
          onTranscript(text);
        }
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  return (
    <button
      id="voice-input-button"
      type="button"
      onClick={toggleListening}
      aria-label={isListening ? 'Stop listening' : label}
      className={`inline-flex items-center justify-center gap-2 rounded-xl transition-all cursor-pointer font-medium select-none shadow-sm ${
        isListening
          ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200'
          : isElder
          ? 'bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-3 text-lg font-semibold min-h-[52px]'
          : 'bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-sm min-h-[44px]'
      } ${className}`}
    >
      {isListening ? (
        <>
          <MicOff className={isElder ? 'w-6 h-6' : 'w-4 h-4'} />
          <span>Listening... speak now</span>
        </>
      ) : (
        <>
          <Mic className={isElder ? 'w-6 h-6' : 'w-4 h-4'} />
          <span>{label}</span>
        </>
      )}
      {!hasSupport && (
        <span className="sr-only">(Voice recognition fallback active)</span>
      )}
    </button>
  );
};

interface VoiceReadButtonProps {
  text: string;
  className?: string;
  label?: string;
}

export const VoiceReadButton: React.FC<VoiceReadButtonProps> = ({
  text,
  className = '',
  label = 'Read aloud',
}) => {
  const { speakText, stopSpeaking, isSpeaking, profile } = useAdaptive();
  const isElder = profile.ageBand === 'elder';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speakText(text);
    }
  };

  return (
    <button
      id={`voice-read-${text.slice(0, 10).replace(/\s+/g, '-').toLowerCase()}`}
      type="button"
      onClick={handleClick}
      aria-label={isSpeaking ? 'Stop reading' : label}
      title={isSpeaking ? 'Stop speech' : label}
      className={`inline-flex items-center gap-1.5 rounded-lg transition-colors cursor-pointer text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 min-h-[44px] px-2.5 py-1.5 ${className}`}
    >
      {isSpeaking ? (
        <>
          <VolumeX className={isElder ? 'w-5 h-5 text-rose-600' : 'w-4 h-4 text-rose-600'} />
          <span className={`font-medium text-rose-600 ${isElder ? 'text-base' : 'text-xs'}`}>Stop</span>
        </>
      ) : (
        <>
          <Volume2 className={isElder ? 'w-5 h-5 text-emerald-700' : 'w-4 h-4 text-slate-500'} />
          <span className={`font-medium ${isElder ? 'text-base text-emerald-900' : 'text-xs'}`}>{label}</span>
        </>
      )}
    </button>
  );
};
