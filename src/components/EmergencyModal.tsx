import React from 'react';
import { Phone, AlertTriangle, Hospital, Heart, X, ShieldAlert, User, ShieldCheck } from 'lucide-react';
import { useAdaptive } from '../context/AdaptiveContext';

export const EmergencyModal: React.FC = () => {
  const { isEmergencyModalOpen, closeEmergencyModal, profile, triggerSOSAlert, medications } = useAdaptive();

  if (!isEmergencyModalOpen) return null;

  const handleTriggerSOS = () => {
    triggerSOSAlert('User requested immediate Emergency assistance from SOS Card.');
  };

  return (
    <div
      id="emergency-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-card-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
    >
      <div
        id="emergency-card-container"
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-rose-500 max-h-[90vh] flex flex-col"
      >
        {/* Urgent Header */}
        <div className="bg-gradient-to-r from-rose-600 to-red-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <ShieldAlert className="w-7 h-7 text-white animate-bounce" />
            </div>
            <div>
              <h2 id="emergency-card-title" className="text-xl font-bold tracking-tight">
                EMERGENCY MEDICAL CARD
              </h2>
              <p className="text-xs text-rose-100 font-medium">Official patient safety reference & rapid contacts</p>
            </div>
          </div>
          <button
            id="emergency-close-button"
            onClick={closeEmergencyModal}
            aria-label="Close emergency card"
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg cursor-pointer transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Card Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-900">
          {/* Quick SOS Trigger Button */}
          <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-center">
            <p className="text-xs text-rose-700 font-semibold uppercase tracking-wider mb-2">
              Immediate Caregiver Alert
            </p>
            <button
              id="send-sos-alert-button"
              type="button"
              onClick={handleTriggerSOS}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 text-base min-h-[48px]"
            >
              <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
              <span>TRIGGER CAREGIVER & MEDICAL SOS NOW</span>
            </button>
            <p className="text-[11px] text-slate-500 mt-2">
              Broadcasts immediate urgent notification to {profile.caregiverName}
            </p>
          </div>

          {/* Critical Patient Identity */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase">Patient</span>
              <p className="text-base font-bold text-slate-900">{profile.name}</p>
              <p className="text-xs text-slate-600">{profile.age} yrs · {profile.gender}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase">Blood Group</span>
              <p className="text-lg font-extrabold text-rose-700">{profile.bloodGroup}</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                <ShieldCheck className="w-3 h-3" /> Lab verified
              </span>
            </div>
          </div>

          {/* Active Diagnosis & Critical Allergies */}
          <div className="space-y-3">
            <div className="border-l-4 border-amber-500 pl-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Primary Diagnosis / Post-Op</span>
              <p className="text-sm font-semibold text-slate-800">{profile.diagnosis}</p>
              <p className="text-xs text-slate-500">Discharged: {profile.dischargeDate}</p>
            </div>

            <div className="border-l-4 border-rose-500 pl-3">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Known Severe Allergies</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {profile.allergies.map((allergy, i) => (
                  <span
                    key={i}
                    className="inline-block px-2.5 py-1 bg-rose-100 text-rose-800 font-bold text-xs rounded-md border border-rose-200"
                  >
                    ⚠ {allergy}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 1-Tap Emergency Direct Calls */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Emergency Rapid Contacts (Tap to Call)
            </h3>

            {/* Caregiver */}
            <a
              id="call-caregiver-link"
              href={`tel:${profile.caregiverPhone.replace(/\s+/g, '')}`}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer group min-h-[50px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{profile.caregiverName}</p>
                  <p className="text-xs text-slate-500">Primary Family Caregiver</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 group-hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg">
                <Phone className="w-3.5 h-3.5" /> Call
              </span>
            </a>

            {/* Treating Doctor */}
            <a
              id="call-doctor-link"
              href={`tel:${profile.doctorPhone.replace(/\s+/g, '')}`}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer group min-h-[50px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{profile.doctorName}</p>
                  <p className="text-xs text-slate-500">{profile.doctorSpecialty}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 group-hover:bg-sky-700 text-white text-xs font-semibold rounded-lg">
                <Phone className="w-3.5 h-3.5" /> Call
              </span>
            </a>

            {/* Hospital Ambulance */}
            <a
              id="call-hospital-link"
              href="tel:108"
              className="flex items-center justify-between p-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer group min-h-[50px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 font-bold">
                  <Hospital className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{profile.hospitalName}</p>
                  <p className="text-xs text-rose-700 font-medium">Emergency Ambulance (108 / 112)</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 group-hover:bg-rose-700 text-white text-xs font-semibold rounded-lg">
                <Phone className="w-3.5 h-3.5" /> 108
              </span>
            </a>
          </div>

          {/* Critical Current Medications */}
          <div className="pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Essential Active Medications
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {medications.map((m) => (
                <div key={m.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-900 block">{m.name} {m.dosage}</span>
                  <span className="text-slate-500 text-[11px]">{m.timing} · {m.purpose}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            id="emergency-done-button"
            type="button"
            onClick={closeEmergencyModal}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer min-h-[44px]"
          >
            Done / Close Card
          </button>
        </div>
      </div>
    </div>
  );
};
