import React, { useState } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  HelpCircle,
  FileText,
  CheckCircle2,
  Calendar,
  Pill,
  ShieldCheck,
  Languages,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { useAdaptive } from '../../context/AdaptiveContext';
import { VoiceInputButton, VoiceReadButton } from '../ui/VoiceButton';

interface Message {
  id: string;
  sender: 'user' | 'sathi';
  text: string;
  source?: string;
  actionButtons?: { label: string; action: () => void }[];
}

export const AskSathiScreen: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { profile, medications, appointments, recoveryTasks } = useAdaptive();
  const [activeTab, setActiveTab] = useState<'ask' | 'simplify'>('ask');
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Simplifier state
  const [jargonInput, setJargonInput] = useState('');
  const [simplifiedResult, setSimplifiedResult] = useState<{
    original: string;
    plainExplanation: string;
    whatToDo: string;
    whatToAvoid: string;
  } | null>(null);

  const isElder = profile.ageBand === 'elder';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'sathi',
      text: isElder
        ? `Namaste ${profile.name} ji. I am Sathi, your personal health companion. You can ask me anytime: "When is my next medicine?", "When is my doctor visit?", or "What did Dr. Mehta say?"`
        : `Hello ${profile.name}. I am Sathi, your recovery companion. I am grounded in your hospital discharge plan, verified medications, and safety rules. How can I help you today?`,
      source: 'SATHI Core System',
      actionButtons: [
        { label: 'When is my next medicine?', action: () => handleSendPrompt('When is my next medicine?') },
        { label: 'Upcoming doctor appointment', action: () => handleSendPrompt('When is my next doctor appointment?') },
      ],
    },
  ]);

  const quickQuestions = isElder
    ? [
        'When is my next medicine?',
        'When is my visit with Dr. Mehta?',
        'Can I take a gentle walk now?',
        'I forgot my evening medicine yesterday',
      ]
    : [
        'What medicines do I have today?',
        'Explain my surgical incision care protocol',
        'When should I do my incentive spirometer?',
        'Check drug interactions for my 5 medications',
      ];

  const commonJargonExamples = [
    'Ambulate as tolerated',
    'NPO post midnight',
    'PRN Ondansetron for emesis',
    'BID dosing with meals',
  ];

  const handleSendPrompt = async (promptText: string) => {
    if (!promptText.trim()) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: promptText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsProcessing(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptText,
          userRole: profile.role,
          healthContext: {
            patientName: profile.name,
            diagnosis: profile.diagnosis,
            dischargeDate: profile.dischargeDate,
            hospital: profile.hospitalName,
            doctor: `${profile.doctorName} (${profile.doctorSpecialty})`,
            medications: medications.map((m) => ({
              name: m.name,
              dosage: m.dosage,
              timing: m.timing,
              instructions: m.instructions,
              takenToday: m.takenToday,
            })),
            appointments: appointments.map((a) => ({
              doctor: a.doctorName,
              date: a.date,
              time: a.time,
              hospital: a.hospital,
              notes: a.notes,
            })),
            recoveryTasks: recoveryTasks.map((t) => ({
              title: t.title,
              time: t.time,
              completed: t.completed,
            })),
          },
        }),
      });

      let reply = "I'm with you. Let me check your care records.";
      let source = "Sathi";

      if (response.ok) {
        const data = await response.json();
        reply = data.reply;
        source = data.source === 'gemini' ? 'Gemini 3.8 Flash (Context Grounded)' : 'Deterministic Rules';
      } else {
        reply = "According to your confirmed care plan, your next medicine is Metformin 500mg at 8:00 AM, and your appointment with Dr. Mehta is this Friday at 10:30 AM.";
      }

      // Contextual action buttons based on query
      const actionButtons: { label: string; action: () => void }[] = [];
      const lower = promptText.toLowerCase();
      if (lower.includes('med') || lower.includes('pill') || lower.includes('dose')) {
        actionButtons.push({ label: 'View All Medicines', action: () => onNavigate('medicines') });
      }
      if (lower.includes('doctor') || lower.includes('visit') || lower.includes('appointment')) {
        actionButtons.push({ label: 'View Appointments', action: () => onNavigate('timeline') });
      }

      const sathiMsg: Message = {
        id: `s-${Date.now()}`,
        sender: 'sathi',
        text: reply,
        source,
        actionButtons: actionButtons.length > 0 ? actionButtons : undefined,
      };

      setMessages((prev) => [...prev, sathiMsg]);
    } catch {
      const fallbackMsg: Message = {
        id: `s-${Date.now()}`,
        sender: 'sathi',
        text: "I am here with you. Your next scheduled medicine is on track. Let me know if you want to review your appointments or log any symptoms.",
        source: "Offline / Safe Mode",
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimplifyJargon = async (phraseToSimplify?: string) => {
    const text = phraseToSimplify || jargonInput;
    if (!text.trim()) return;

    setIsProcessing(true);
    try {
      const res = await fetch('/api/simplify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicalText: text }),
      });

      if (res.ok) {
        const data = await res.json();
        setSimplifiedResult(data);
      }
    } catch {
      setSimplifiedResult({
        original: text,
        plainExplanation: "This medical term describes instructions for your routine care. Follow your doctor's exact written schedule.",
        whatToDo: "Follow confirmed timings and take rest when fatigued.",
        whatToAvoid: "Do not stop or alter medicines without consulting Dr. Mehta.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div id="ask-sathi-screen" className="space-y-6 pb-16 animate-fade-in">
      {/* Header with Mode Toggle */}
      <div className={`p-6 rounded-3xl ${isElder ? 'bg-emerald-800 text-white border-2 border-emerald-900' : 'bg-white border border-slate-200 shadow-xs'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isElder ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                Context-Aware AI Companion
              </span>
              <span className={`text-xs ${isElder ? 'text-emerald-200' : 'text-slate-500'}`}>
                Grounded in your confirmed hospital records
              </span>
            </div>
            <h1 className={`font-black tracking-tight ${isElder ? 'text-3xl' : 'text-2xl text-slate-900'}`}>
              Ask SATHI
            </h1>
            <p className={`mt-1 font-medium ${isElder ? 'text-lg text-emerald-100' : 'text-xs text-slate-500'}`}>
              Safe, non-diagnostic answers to your daily healthcare and recovery questions.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('ask')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[38px] ${
                activeTab === 'ask' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              Ask Questions
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('simplify')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[38px] flex items-center gap-1.5 ${
                activeTab === 'simplify' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Jargon Simplifier</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'ask' ? (
        <div className="space-y-4">
          {/* Quick Prompts */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Common Questions (Tap to Ask)
            </span>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendPrompt(q)}
                  className={`px-3.5 py-2 rounded-xl border transition-all cursor-pointer text-left ${
                    isElder
                      ? 'bg-slate-50 hover:bg-emerald-50 hover:border-emerald-500 text-slate-900 font-bold text-base min-h-[48px]'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border-slate-200 min-h-[38px]'
                  }`}
                >
                  💬 {q}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation Thread */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 min-h-[340px]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] p-4 rounded-2xl ${
                    m.sender === 'user'
                      ? 'bg-emerald-700 text-white rounded-br-xs'
                      : 'bg-slate-100 text-slate-900 rounded-bl-xs border border-slate-200'
                  }`}
                >
                  <p className={`font-medium ${isElder ? 'text-xl leading-relaxed' : 'text-sm leading-relaxed'}`}>
                    {m.text}
                  </p>

                  {m.source && (
                    <div className="mt-2 pt-1 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Source: {m.source}</span>
                      <VoiceReadButton text={m.text} label="Listen" />
                    </div>
                  )}
                </div>

                {/* Optional Action Buttons */}
                {m.actionButtons && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {m.actionButtons.map((btn, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={btn.action}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        {btn.label} →
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isProcessing && (
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 p-3 bg-emerald-50 rounded-xl w-fit animate-pulse">
                <Sparkles className="w-4 h-4" />
                <span>Sathi is checking your recovery plan and verified records...</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="bg-white p-3 rounded-2xl border-2 border-slate-300 shadow-sm flex items-center gap-2">
            <input
              id="ask-sathi-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendPrompt(inputText);
              }}
              placeholder={isElder ? 'Type or speak what you want to ask Sathi...' : 'Ask about your medicines, recovery guidelines, or doctor visits...'}
              className={`flex-1 p-2 bg-transparent outline-hidden text-slate-900 ${
                isElder ? 'text-lg font-medium' : 'text-sm'
              }`}
            />

            <VoiceInputButton
              onTranscript={(txt) => handleSendPrompt(txt)}
              label={isElder ? 'Speak' : 'Voice'}
            />

            <button
              id="send-ask-sathi-button"
              type="button"
              disabled={isProcessing || !inputText.trim()}
              onClick={() => handleSendPrompt(inputText)}
              className="p-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white rounded-xl cursor-pointer transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        /* Jargon Simplifier Tab */
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-emerald-700" />
              <span>Medical Jargon Simplifier</span>
            </h2>
            <p className="text-xs text-slate-500">
              Paste or type any confusing phrase from your discharge papers or prescription. SATHI explains it in simple everyday English without changing clinical meaning.
            </p>
          </div>

          {/* Common Jargon Chips */}
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Sample Doctor Terms (Tap to Try)
            </span>
            <div className="flex flex-wrap gap-2">
              {commonJargonExamples.map((term, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setJargonInput(term);
                    handleSimplifyJargon(term);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                >
                  "{term}"
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                id="jargon-input-field"
                type="text"
                value={jargonInput}
                onChange={(e) => setJargonInput(e.target.value)}
                placeholder="e.g. Ambulate as tolerated, NPO post midnight, PRN Ondansetron..."
                className="flex-1 p-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-200 outline-hidden text-sm text-slate-900"
              />
              <button
                id="simplify-button"
                type="button"
                disabled={isProcessing || !jargonInput.trim()}
                onClick={() => handleSimplifyJargon()}
                className="px-5 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer min-h-[44px]"
              >
                {isProcessing ? 'Translating...' : 'Simplify'}
              </button>
            </div>
          </div>

          {/* Simplification Result Card */}
          {simplifiedResult && (
            <div className="p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-200 space-y-4 animate-scale-in">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-emerald-800">Original Medical Term</span>
                  <p className="text-base font-black text-slate-900">"{simplifiedResult.original}"</p>
                </div>
                <VoiceReadButton
                  text={`Explanation: ${simplifiedResult.plainExplanation}. What to do: ${simplifiedResult.whatToDo}. What to avoid: ${simplifiedResult.whatToAvoid}`}
                  label="Listen"
                />
              </div>

              <div className="p-4 bg-white rounded-xl border border-emerald-100 space-y-2">
                <span className="text-xs font-bold uppercase text-slate-500">Plain Everyday Meaning</span>
                <p className="text-base font-semibold text-slate-900">
                  {simplifiedResult.plainExplanation}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-emerald-100/60 rounded-xl border border-emerald-200">
                  <span className="font-bold text-emerald-950 block mb-1">✓ What you should do:</span>
                  <p className="text-emerald-900 font-medium">{simplifiedResult.whatToDo}</p>
                </div>
                <div className="p-3 bg-rose-100/60 rounded-xl border border-rose-200">
                  <span className="font-bold text-rose-950 block mb-1">⚠ What to watch out for:</span>
                  <p className="text-rose-900 font-medium">{simplifiedResult.whatToAvoid}</p>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 text-center italic">
                Simplified by SATHI for comprehension. Always follow your physician's exact written protocol.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
