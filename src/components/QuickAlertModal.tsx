import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  MessageSquare,
  Send,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Copy,
  Check,
  User,
  Users,
  Plus,
  X,
  Volume2,
  ChevronDown,
  ChevronUp,
  Heart,
  Hospital,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAdaptive } from '../context/AdaptiveContext';
import { DesignatedEmergencyContact } from '../types';

export const QuickAlertModal: React.FC = () => {
  const {
    quickAlertData,
    closeQuickAlert,
    designatedContact,
    setDesignatedContact,
    availableEmergencyContacts,
    addCustomEmergencyContact,
    triggerQuickAlertSMS,
    triggerQuickAlertCall,
    triggerSOSAlert,
    profile,
    speakText,
  } = useAdaptive();

  const [isSwitchingContact, setIsSwitchingContact] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [customRel, setCustomRel] = useState('');

  const [smsStatus, setSmsStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [lastReceiptId, setLastReceiptId] = useState<string | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [showPayloadDetails, setShowPayloadDetails] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling'>('idle');

  // Auto-reset state when modal opens
  useEffect(() => {
    if (quickAlertData.isOpen) {
      setSmsStatus('idle');
      setCallStatus('idle');
      setLastReceiptId(null);
      setCopiedPayload(false);
      setIsSwitchingContact(false);
      setIsAddingContact(false);
    }
  }, [quickAlertData.isOpen]);

  if (!quickAlertData.isOpen) return null;

  const isElder = profile.ageBand === 'elder';

  const handleSendSMS = async () => {
    setSmsStatus('sending');
    try {
      const result = await triggerQuickAlertSMS(quickAlertData.symptom, designatedContact);
      setLastReceiptId(result.receiptId || `SMS-${Date.now()}`);
      setSmsStatus('sent');
      // Trigger native messaging app
      if (typeof window !== 'undefined') {
        window.location.href = result.smsUri;
      }
    } catch (e) {
      console.error('Failed to trigger Quick Alert SMS:', e);
      setSmsStatus('idle');
    }
  };

  const handleMakeCall = () => {
    setCallStatus('calling');
    triggerQuickAlertCall(designatedContact);
  };

  const handleCopySMSPayload = () => {
    const symptom = quickAlertData.symptom || 'Severe acute symptom flare-up';
    const payload = `EMERGENCY SOS [SATHI Recovery Alert]
Patient: ${profile.name} (${profile.age}y, ${profile.gender})
Blood: ${profile.bloodGroup}
SEVERE SYMPTOM: ${symptom}
Diagnosis: ${profile.diagnosis}
Hospital: ${profile.hospitalName}
Known Allergies: ${profile.allergies.join(', ') || 'None'}
Action Needed: Immediate check or clinical review. Call patient now!`;

    navigator.clipboard.writeText(payload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2500);
  };

  const handleReadout = () => {
    const text = `Quick Emergency Alert for ${profile.name}. Severe symptom reported: ${
      quickAlertData.symptom || 'Chest or respiratory distress'
    }. Designated emergency contact is ${designatedContact.name}, phone number ${designatedContact.phone}. Blood group ${
      profile.bloodGroup
    }.`;
    speakText(text);
  };

  const handleSaveCustomContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customPhone.trim()) return;

    addCustomEmergencyContact({
      name: customName.trim(),
      phone: customPhone.trim(),
      relationship: customRel.trim() || 'Emergency Contact',
      role: 'custom',
    });

    setCustomName('');
    setCustomPhone('');
    setCustomRel('');
    setIsAddingContact(false);
    setIsSwitchingContact(false);
  };

  return (
    <div
      id="quick-alert-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-alert-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        id="quick-alert-modal-container"
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-rose-500 max-h-[92vh] flex flex-col animate-scale-in text-slate-900"
      >
        {/* Pulsing Emergency Header */}
        <div className="bg-gradient-to-r from-rose-700 via-red-600 to-rose-800 px-5 sm:px-6 py-4 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs text-white shadow-inner animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-white/25 text-white text-[10px] font-black uppercase tracking-wider">
                  QUICK ALERT · 1-TAP SOS
                </span>
                {quickAlertData.timestamp && (
                  <span className="text-[11px] text-rose-100 flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3" /> {quickAlertData.timestamp}
                  </span>
                )}
              </div>
              <h2 id="quick-alert-modal-title" className="text-lg sm:text-xl font-black tracking-tight">
                Emergency Alert Trigger
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleReadout}
              title="Speak Alert Summary"
              className="p-2 text-white/90 hover:text-white hover:bg-white/20 rounded-xl cursor-pointer transition-colors"
            >
              <Volume2 className="w-5 h-5" />
            </button>
            <button
              id="quick-alert-close-btn"
              type="button"
              onClick={closeQuickAlert}
              aria-label="Close Quick Alert"
              className="p-2 text-white/90 hover:text-white hover:bg-white/20 rounded-xl cursor-pointer transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-slate-900">
          {/* Reported Symptom Notification Banner */}
          <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 animate-bounce" />
                Severe Symptom Reported
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-black uppercase">
                {quickAlertData.severity.toUpperCase()} PRIORITY
              </span>
            </div>

            <p className="text-base sm:text-lg font-black text-slate-900 leading-snug">
              "{quickAlertData.symptom || 'Severe acute symptom reported'}"
            </p>

            <p className="text-xs text-rose-800 font-medium">
              SATHI detected a safety escalation requiring immediate attention. Tap below to send an emergency SMS or call your designated contact.
            </p>
          </div>

          {/* Designated Emergency Contact Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-600" />
                Designated Emergency Contact
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsSwitchingContact(!isSwitchingContact);
                  setIsAddingContact(false);
                }}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer flex items-center gap-1 underline underline-offset-2"
              >
                <span>{isSwitchingContact ? 'Close Switcher' : 'Change Contact'}</span>
                {isSwitchingContact ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Active Contact Display */}
            <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-base shrink-0">
                  {designatedContact.role === 'doctor' ? (
                    <Heart className="w-5 h-5 text-sky-700" />
                  ) : designatedContact.role === 'ambulance' ? (
                    <Hospital className="w-5 h-5 text-rose-700" />
                  ) : (
                    <User className="w-5 h-5 text-emerald-700" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm sm:text-base font-bold text-slate-900">
                      {designatedContact.name}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-black uppercase">
                      Active Target
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    {designatedContact.relationship} · <span className="font-bold text-slate-900">{designatedContact.phone}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Switcher & Custom Contact Form */}
            {isSwitchingContact && (
              <div className="pt-2 border-t border-slate-200 space-y-2 animate-fade-in">
                <p className="text-[11px] font-bold text-slate-500 uppercase">
                  Select Who to Alert:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableEmergencyContacts.map((c) => {
                    const isSelected = c.id === designatedContact.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setDesignatedContact(c);
                          setIsSwitchingContact(false);
                        }}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500 font-bold'
                            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate text-slate-900">{c.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{c.phone} · {c.relationship}</p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {!isAddingContact ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingContact(true)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-colors mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Emergency Phone Number</span>
                  </button>
                ) : (
                  <form onSubmit={handleSaveCustomContact} className="p-3 bg-white rounded-xl border border-slate-300 space-y-2 mt-2">
                    <p className="text-xs font-bold text-slate-800">Add New Designated Contact</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Full Name (e.g. Neighbor Vikram)"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        required
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-900 focus:ring-1 focus:ring-emerald-500 outline-hidden"
                      />
                      <input
                        type="tel"
                        placeholder="Phone (e.g. +91 98111 22334)"
                        value={customPhone}
                        onChange={(e) => setCustomPhone(e.target.value)}
                        required
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-900 focus:ring-1 focus:ring-emerald-500 outline-hidden"
                      />
                      <input
                        type="text"
                        placeholder="Relationship (e.g. Friend / Nurse)"
                        value={customRel}
                        onChange={(e) => setCustomRel(e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-900 focus:ring-1 focus:ring-emerald-500 outline-hidden"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingContact(false)}
                        className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg cursor-pointer"
                      >
                        Save & Designate
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Quick Alert Primary Action Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Action 1: 1-Tap SOS SMS */}
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-emerald-700" />
                    Option 1: SOS SMS
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-black">
                    Pre-filled Clinical
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-1">
                  Send Emergency SOS SMS
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Pre-formats patient diagnosis, blood group ({profile.bloodGroup}), allergies, and severe symptom into an instant SMS.
                </p>
              </div>

              <button
                id="quick-alert-send-sms-btn"
                type="button"
                onClick={handleSendSMS}
                disabled={smsStatus === 'sending'}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.99] ${
                  smsStatus === 'sent'
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                } min-h-[48px]`}
              >
                <Send className={`w-4 h-4 ${smsStatus === 'sending' ? 'animate-spin' : ''}`} />
                <span>
                  {smsStatus === 'sending'
                    ? 'Preparing SMS...'
                    : smsStatus === 'sent'
                    ? 'Re-Open SMS in Messages'
                    : `Send SOS SMS to ${designatedContact.name.split(' ')[0]}`}
                </span>
              </button>

              {smsStatus === 'sent' && (
                <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1 animate-fade-in">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>SMS Launched & Dispatch Logged</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Receipt ID: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800">{lastReceiptId}</code>
                  </p>
                </div>
              )}
            </div>

            {/* Action 2: 1-Tap SOS Call */}
            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-rose-700" />
                    Option 2: Direct Call
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[10px] font-black">
                    Immediate Dialer
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-1">
                  Call Designated Contact Now
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Immediately opens device dialer with <span className="font-bold text-slate-900">{designatedContact.phone}</span>.
                </p>
              </div>

              <button
                id="quick-alert-direct-call-btn"
                type="button"
                onClick={handleMakeCall}
                className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-700 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.99] min-h-[48px]"
              >
                <PhoneCall className="w-4 h-4 animate-pulse" />
                <span>Call {designatedContact.name} ({designatedContact.phone})</span>
              </button>

              <p className="text-[11px] text-rose-700 font-medium text-center">
                DPDP audit log updated with timestamp upon dialing
              </p>
            </div>
          </div>

          {/* Quick Payload Inspection & Copy Option */}
          <div className="p-3.5 bg-slate-100 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                SMS Message Content Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySMSPayload}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPayload ? 'Copied to Clipboard' : 'Copy Text'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPayloadDetails(!showPayloadDetails)}
                  className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  {showPayloadDetails ? 'Hide' : 'View'}
                </button>
              </div>
            </div>

            {showPayloadDetails && (
              <pre className="text-[11px] bg-white p-3 rounded-xl border border-slate-300 text-slate-800 whitespace-pre-wrap font-mono leading-relaxed max-h-36 overflow-y-auto">
{`EMERGENCY SOS [SATHI Recovery Alert]
Patient: ${profile.name} (${profile.age}y, ${profile.gender})
Blood: ${profile.bloodGroup}
SEVERE SYMPTOM: ${quickAlertData.symptom || 'Severe acute symptom flare-up'}
Diagnosis: ${profile.diagnosis}
Hospital: ${profile.hospitalName}
Known Allergies: ${profile.allergies.join(', ') || 'None'}
Action Needed: Immediate check or clinical review. Call patient now!`}
              </pre>
            )}
          </div>

          {/* Emergency Ambulance 108 / Multi-Channel Fallback */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-200">
            <a
              id="quick-alert-ambulance-link"
              href="tel:108"
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors min-h-[44px]"
            >
              <Hospital className="w-4 h-4 text-rose-400" />
              <span>Dial National Ambulance (108 / 112)</span>
            </a>

            <button
              type="button"
              onClick={() => triggerSOSAlert(`Quick Alert Triggered for: ${quickAlertData.symptom}`)}
              className="w-full sm:w-auto px-4 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors min-h-[44px]"
            >
              <Users className="w-4 h-4 text-rose-700" />
              <span>Broadcast SOS to Entire Care Circle</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            SATHI Emergency Safety Engine · Certified DPDP Audit Log
          </span>
          <button
            id="quick-alert-dismiss-btn"
            type="button"
            onClick={closeQuickAlert}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors min-h-[40px]"
          >
            Close Alert
          </button>
        </div>
      </div>
    </div>
  );
};
