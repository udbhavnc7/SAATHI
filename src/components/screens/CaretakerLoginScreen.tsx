import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Phone,
  User,
  PlusCircle,
  Sparkles,
} from 'lucide-react';
import { useAdaptive } from '../../context/AdaptiveContext';
import { CaretakerProfile } from '../../types';

interface CaretakerLoginScreenProps {
  onLoginSuccess: () => void;
  onBackToSplash: () => void;
}

export const CaretakerLoginScreen: React.FC<CaretakerLoginScreenProps> = ({
  onLoginSuccess,
  onBackToSplash,
}) => {
  const { caretakerSession, setCaretakerSession } = useAdaptive();

  const [name, setName] = useState(caretakerSession.name || 'Ananya Sharma');
  const [phone, setPhone] = useState(caretakerSession.phone || '+91 98201 44521');
  const [relationship, setRelationship] = useState(caretakerSession.relationship || 'Daughter & Primary Caregiver');
  const [initialPatientId, setInitialPatientId] = useState('PAT-8492');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter your name.');
      return;
    }

    const patientCodes = caretakerSession.linkedPatientCodes || [];
    const formattedCode = initialPatientId.trim().toUpperCase();
    const updatedCodes = formattedCode && !patientCodes.includes(formattedCode)
      ? [...patientCodes, formattedCode]
      : patientCodes.length > 0 ? patientCodes : ['PAT-8492'];

    const newProfile: CaretakerProfile = {
      id: `caregiver-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim() || '+91 98000 00000',
      relationship: relationship.trim() || 'Primary Caretaker',
      linkedPatientCodes: updatedCodes,
    };

    setCaretakerSession(newProfile);
    onLoginSuccess();
  };

  const handleQuickLogin = (quickProfile: CaretakerProfile, initialCode: string) => {
    const updatedCodes = quickProfile.linkedPatientCodes.includes(initialCode)
      ? quickProfile.linkedPatientCodes
      : [...quickProfile.linkedPatientCodes, initialCode];

    setCaretakerSession({
      ...quickProfile,
      linkedPatientCodes: updatedCodes,
    });
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-4 sm:p-8">
      {/* Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-2">
        <button
          type="button"
          onClick={onBackToSplash}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Role Selection</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-black border border-slate-800 p-0.5 flex items-center justify-center">
            <img src="/logo.png" alt="SAATHI Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-black text-sm tracking-tight text-white">SAATHI Caretaker</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="max-w-lg w-full mx-auto my-auto py-6 animate-fade-in">
        <div className="rounded-3xl p-6 sm:p-8 bg-slate-900/95 border border-purple-500/30 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-400 mx-auto flex items-center justify-center shadow-lg">
              <Users className="w-7 h-7" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Caretaker Sign In
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Access real-time triage updates, medication refill alerts, and monitor any number of patients.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* Quick Demo Credentials */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              1-Click Demo Profiles:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleQuickLogin(
                    {
                      id: 'caregiver-ananya',
                      name: 'Ananya Sharma',
                      phone: '+91 98201 44521',
                      relationship: 'Daughter & Primary Caregiver',
                      linkedPatientCodes: ['PAT-8492'],
                    },
                    'PAT-8492'
                  )
                }
                className="p-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-purple-500/30 text-left transition-all hover:border-purple-400 cursor-pointer"
              >
                <div className="font-bold text-xs text-white">Ananya Sharma</div>
                <div className="text-[10px] text-purple-300">Daughter · Ramesh (PAT-8492)</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleQuickLogin(
                    {
                      id: 'caregiver-rajesh',
                      name: 'Dr. Rajesh Mehta',
                      phone: '+91 98112 33441',
                      relationship: 'Attending Cardiologist',
                      linkedPatientCodes: ['PAT-8492', 'PAT-5519'],
                    },
                    'PAT-8492'
                  )
                }
                className="p-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-purple-500/30 text-left transition-all hover:border-purple-400 cursor-pointer"
              >
                <div className="font-bold text-xs text-white">Dr. Rajesh Mehta</div>
                <div className="text-[10px] text-purple-300">Doctor · Multi-Patient Monitor</div>
              </button>
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[11px] font-bold text-slate-500 uppercase">Or Custom Sign-in</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Caretaker Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ananya Sharma"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Mobile Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98201 44521"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Relationship</label>
                <input
                  type="text"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="e.g. Daughter / Nurse"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Initial Patient ID to Connect <span className="text-emerald-400 font-normal">(e.g. PAT-8492)</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-emerald-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={initialPatientId}
                  onChange={(e) => setInitialPatientId(e.target.value.toUpperCase())}
                  placeholder="PAT-8492"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-emerald-500/40 rounded-xl text-sm font-mono font-bold text-emerald-300 uppercase placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                You can add or unlink more patient IDs anytime from inside your dashboard.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-purple-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <UserCheck className="w-4 h-4" />
              <span>Enter Caretaker Console</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto text-center py-2 text-xs text-slate-500">
        SAATHI · Clinical Triage & Medication Companion · Real-Time Multi-Patient Alert Bridge
      </footer>
    </div>
  );
};
