import React, { useState } from 'react';
import {
  Users,
  X,
  ShieldCheck,
  Lock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  Phone
} from 'lucide-react';
import { useAdaptive } from '../context/AdaptiveContext';
import { CareCircleMember } from '../types';

interface CareCircleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CareCircleModal: React.FC<CareCircleModalProps> = ({ isOpen, onClose }) => {
  const { profile, careCircle, toggleCareCirclePermission } = useAdaptive();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('Family Member');
  const [invitePhone, setInvitePhone] = useState('');

  if (!isOpen) return null;

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !invitePhone) return;
    alert(`Invitation sent to ${inviteName} (${invitePhone}) with revocable emergency consent.`);
    setInviteName('');
    setInvitePhone('');
    setShowInviteForm(false);
  };

  return (
    <div
      id="care-circle-modal"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Users className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                  Granular Access & DPDP Consent
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Care Circle & Trusted Access
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Care Circle Modal"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer min-h-[36px]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-600">
          You control exactly what each authorized family member, nurse, or doctor can see. No all-or-nothing sharing toggles; every permission is granular and instantly revocable.
        </p>

        {/* Member Cards */}
        <div className="space-y-4">
          {careCircle.map((member) => (
            <div
              key={member.id}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{member.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {member.relationship}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" /> {member.phone} · Consent granted {member.consentGrantedAt}
                  </p>
                </div>

                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200/80 text-slate-700 self-start sm:self-auto">
                  {member.accessLevel === 'full'
                    ? 'Full Clinical Access'
                    : member.accessLevel === 'summary_only'
                    ? 'Summary Only'
                    : 'Emergency SOS Only'}
                </span>
              </div>

              {/* Granular Permission Toggles */}
              <div className="pt-2 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => toggleCareCirclePermission(member.id, 'medications')}
                  className={`p-2 rounded-xl border flex items-center gap-1.5 cursor-pointer text-left transition-colors min-h-[42px] ${
                    member.permissions.medications
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-500'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${member.permissions.medications ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                  <span>Meds Adherence</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleCareCirclePermission(member.id, 'symptoms')}
                  className={`p-2 rounded-xl border flex items-center gap-1.5 cursor-pointer text-left transition-colors min-h-[42px] ${
                    member.permissions.symptoms
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-500'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${member.permissions.symptoms ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                  <span>Symptom Triage</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleCareCirclePermission(member.id, 'documents')}
                  className={`p-2 rounded-xl border flex items-center gap-1.5 cursor-pointer text-left transition-colors min-h-[42px] ${
                    member.permissions.documents
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-500'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${member.permissions.documents ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                  <span>Hospital Docs</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleCareCirclePermission(member.id, 'emergencyAlerts')}
                  className={`p-2 rounded-xl border flex items-center gap-1.5 cursor-pointer text-left transition-colors min-h-[42px] ${
                    member.permissions.emergencyAlerts
                      ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-500'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${member.permissions.emergencyAlerts ? 'bg-rose-600' : 'bg-slate-300'}`} />
                  <span>SOS Broadcast</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Invite New Care Circle Member */}
        {showInviteForm ? (
          <form onSubmit={handleSendInvite} className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-300 space-y-3">
            <h4 className="text-xs font-bold text-slate-900">Authorize New Trusted Member</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <input
                type="text"
                required
                placeholder="Full Name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="p-2 bg-white rounded-xl border border-slate-300 min-h-[40px]"
              />
              <input
                type="text"
                placeholder="Relationship (e.g. Son)"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="p-2 bg-white rounded-xl border border-slate-300 min-h-[40px]"
              />
              <input
                type="tel"
                required
                placeholder="Phone Number"
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
                className="p-2 bg-white rounded-xl border border-slate-300 min-h-[40px]"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs cursor-pointer min-h-[38px]"
              >
                Send Consent Authorization
              </button>
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer min-h-[38px]"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowInviteForm(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 text-slate-600 hover:text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors min-h-[44px]"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Another Care Circle Member</span>
          </button>
        )}

        <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-600 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            Compliant with DPDP Act 2023: Health data is encrypted and never shared with insurers, advertisers, or third parties without explicit consent.
          </span>
        </div>
      </div>
    </div>
  );
};
