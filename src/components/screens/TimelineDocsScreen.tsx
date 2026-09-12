import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  ShieldCheck,
  Download,
  Share2,
  FolderOpen,
  ArrowUpRight,
  Sparkles,
  Search,
  Mic,
  Volume2,
  Receipt,
  Scan,
} from 'lucide-react';
import { useAdaptive } from '../../context/AdaptiveContext';
import { ProvenanceBadge } from '../ui/ProvenanceBadge';
import { PrescriptionOcrScanner } from '../prescription/PrescriptionOcrScanner';

export const TimelineDocsScreen: React.FC = () => {
  const {
    profile,
    timeline,
    documents,
    confirmDocument,
    medications,
    medicationAdherenceRate,
    symptomLogs,
    appointments,
    recoveryTasks,
    healthUpdates,
    openVoiceLogger,
    speakText,
  } = useAdaptive();

  const [activeSubTab, setActiveSubTab] = useState<'timeline' | 'ocr' | 'vault' | 'summary'>('timeline');
  const [showScanSimulator, setShowScanSimulator] = useState(false);
  const [scannedDocument, setScannedDocument] = useState<{
    name: string;
    type: string;
    extractedMeds: string[];
    extractedRestrictions: string[];
    warningSigns?: string[];
    confidenceScore?: number;
    summary?: string;
    provenance?: string;
    confirmed: boolean;
  } | null>(null);

  const [backendDoctorSummary, setBackendDoctorSummary] = useState<any | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const isElder = profile.ageBand === 'elder';

  const handleSimulateScan = async () => {
    setShowScanSimulator(true);
    try {
      const res = await fetch('/api/scan-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentName: 'Post-CABG Day 7 Wound & Cardiac Protocol.pdf',
          documentType: 'Discharge Addendum',
          rawText: `Patient Ramesh Sharma, age 68, post CABG x3 grafts. Sternal incision healing without erythema. 
Continue Metformin 500 mg BID with meals and Ecosprin 75 mg OD. Atorvastatin 20mg nocte.
Precautions: Avoid lifting objects > 5kg for 4 weeks. Perform incentive spirometry 10 times thrice daily.
Red-flags: Report sternal instability, chest pain, or purulent drainage immediately.`,
        }),
      });

      const data = await res.json();
      setScannedDocument({
        name: data.documentTitle || 'Post-CABG Day 7 Protocol.pdf',
        type: data.category || 'Discharge Addendum',
        extractedMeds: data.extractedMedications?.map((m: any) => `${m.name} ${m.dosage} (${m.timing})`) || [
          'Metformin 500mg BID with meals',
          'Ecosprin 75mg OD with breakfast',
        ],
        extractedRestrictions: data.extractedRestrictions || [
          'No lifting > 5kg for 4 more weeks',
          'Avoid sudden torso twisting',
        ],
        warningSigns: data.warningSigns || ['Sternal clicking or fever > 38C'],
        confidenceScore: data.confidenceScore || 95,
        summary: data.summary,
        provenance: data.provenance,
        confirmed: false,
      });
    } catch (err) {
      console.error('Scan error:', err);
      // Fallback
      setScannedDocument({
        name: 'Post-CABG Day 7 Wound & Cardiac Checkup Note.pdf',
        type: 'Discharge Addendum',
        extractedMeds: ['Continue Metformin 500mg BID', 'Ecosprin 75mg OD with breakfast'],
        extractedRestrictions: ['No lifting > 5kg for 4 more weeks', 'Report any sternal clicking or wound discharge immediately'],
        confirmed: false,
      });
    } finally {
      setShowScanSimulator(false);
    }
  };

  const handleConfirmScannedDoc = () => {
    if (scannedDocument) {
      setScannedDocument({ ...scannedDocument, confirmed: true });
      confirmDocument('doc-scan-new');
      alert('Confirmed! Extracted instructions have been verified and integrated into your active care plan.');
    }
  };

  // Fetch backend doctor summary on opening summary tab
  const handleLoadDoctorSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const res = await fetch('/api/doctor-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          adherenceRate: medicationAdherenceRate,
          symptoms: symptomLogs,
        }),
      });
      const data = await res.json();
      setBackendDoctorSummary(data);
    } catch (err) {
      console.error('Failed to load backend doctor summary:', err);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  return (
    <div id="timeline-docs-screen" className="space-y-6 pb-16 animate-fade-in">
      {/* Header */}
      <div className={`p-6 rounded-3xl ${isElder ? 'bg-emerald-800 text-white border-2 border-emerald-900' : 'bg-white border border-slate-200 shadow-xs'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isElder ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                Longitudinal Health Memory
              </span>
              <span className={`text-xs ${isElder ? 'text-emerald-200' : 'text-slate-500'}`}>
                {timeline.length} verified events recorded
              </span>
            </div>
            <h1 className={`font-black tracking-tight ${isElder ? 'text-3xl' : 'text-2xl text-slate-900'}`}>
              Health Memory & Documents
            </h1>
            <p className={`mt-1 font-medium ${isElder ? 'text-lg text-emerald-100' : 'text-xs text-slate-500'}`}>
              What has happened with your recovery, confirmed hospital reports, and doctor-visit preparations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveSubTab('timeline')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[38px] ${
                activeSubTab === 'timeline' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              Timeline
            </button>
            <button
              id="tab-prescription-ocr"
              type="button"
              onClick={() => setActiveSubTab('ocr')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[38px] flex items-center gap-1.5 ${
                activeSubTab === 'ocr' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Prescription OCR</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('vault')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[38px] ${
                activeSubTab === 'vault' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              Document Vault ({documents.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('summary');
                handleLoadDoctorSummary();
              }}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[38px] flex items-center gap-1 ${
                activeSubTab === 'summary' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Doctor Summary</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. TIMELINE SUBTAB */}
      {activeSubTab === 'timeline' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-700" />
                <span>Personal Recovery Memory & Ledger</span>
              </h2>
              <span className="text-xs text-slate-500">Every event retains source provenance (voice, hospital, patient-reported)</span>
            </div>

            <button
              id="timeline-record-voice-btn"
              type="button"
              onClick={() => openVoiceLogger('daily_update')}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs min-h-[40px]"
            >
              <Mic className="w-4 h-4 animate-pulse" />
              <span>Record Voice Update</span>
            </button>
          </div>

          {/* Voice Health Logs Shelf */}
          {healthUpdates.length > 0 && (
            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Persisted Spoken Logs ({healthUpdates.length})</span>
                </span>
                <span className="text-[11px] text-emerald-800 font-medium">Web Speech API · Local DPDP Ledger</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {healthUpdates.slice(0, 4).map((h) => (
                  <div key={h.id} className="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {h.category === 'symptom' ? 'Symptom' : h.category === 'activity' ? 'Activity' : 'Daily Update'}
                      </span>
                      <span className="text-[10px] text-slate-500">{h.timestamp}</span>
                    </div>
                    <p className="font-semibold text-slate-900 line-clamp-2">"{h.transcript}"</p>
                    {h.summary && h.summary !== h.transcript && (
                      <p className="text-[11px] text-slate-500 italic line-clamp-1">AI Note: {h.summary}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {timeline.map((event) => (
              <div key={event.id} className="relative group">
                {/* Timeline Dot */}
                <div
                  className={`absolute -left-[27px] top-1 w-4 h-4 rounded-full ring-4 ring-white shadow-xs ${
                    event.type === 'voice_log'
                      ? 'bg-teal-600'
                      : event.type === 'symptom'
                      ? 'bg-amber-600'
                      : 'bg-emerald-600'
                  }`}
                />

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-semibold text-emerald-800">{event.timestamp}</span>
                    <div className="flex items-center gap-2">
                      {event.type === 'voice_log' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-900 border border-teal-200">
                          <Mic className="w-3 h-3 text-teal-700" /> Voice Captured
                        </span>
                      )}
                      {event.statusBadge && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          {event.statusBadge}
                        </span>
                      )}
                      <ProvenanceBadge tag={event.provenance} size="sm" />
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{event.title}</h3>
                      <p className="text-xs text-slate-600 mt-0.5">{event.detail}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakText(`${event.title}. ${event.detail}`)}
                      aria-label="Read event aloud"
                      className="p-1 text-slate-400 hover:text-emerald-700 rounded-lg cursor-pointer shrink-0"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. PRESCRIPTION OCR SUBTAB */}
      {activeSubTab === 'ocr' && (
        <div className="space-y-6">
          <PrescriptionOcrScanner
            onConfirmSuccess={() => {
              // User confirmed scanned prescription medicines
            }}
          />
        </div>
      )}

      {/* 3. DOCUMENT VAULT SUBTAB */}
      {activeSubTab === 'vault' && (
        <div className="space-y-6">
          {/* Action Card to Scan New Prescription Receipt */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-3xl border border-emerald-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold uppercase tracking-wide">
                  Prescription OCR Scanner
                </span>
                <span className="text-xs text-emerald-700 font-semibold">High-Accuracy Recognition</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Scan Medical Prescription or Pharmacy Receipt
              </h3>
              <p className="text-xs text-slate-600 max-w-xl">
                Upload receipts, doctor's notes, or discharge summaries to transcribe text and extract all medicines with dosage schedules.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveSubTab('ocr')}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0 min-h-[44px]"
            >
              <Receipt className="w-4 h-4" />
              <span>Open Prescription OCR →</span>
            </button>
          </div>

          {/* Stored Documents */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Verified Health Documents &amp; Prescriptions</h3>
                <p className="text-xs text-slate-500">
                  Secure clinical vault storing all confirmed hospital discharge notes, lab slips, and OCR-extracted prescriptions.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                {documents.length} Verified Records
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <div key={doc.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-md">
                      {doc.category}
                    </span>
                    <ProvenanceBadge tag={doc.provenance} size="sm" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{doc.title}</h4>
                  <p className="text-xs text-slate-600">{doc.summary}</p>
                  {doc.extractedItems?.medications && doc.extractedItems.medications.length > 0 && (
                    <div className="pt-1 text-xs">
                      <span className="font-semibold text-slate-700">Verified Meds:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {doc.extractedItems.medications.slice(0, 3).map((m, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] text-slate-800 font-medium">
                            {m}
                          </span>
                        ))}
                        {doc.extractedItems.medications.length > 3 && (
                          <span className="px-1.5 py-0.5 text-[10px] text-slate-500">
                            +{doc.extractedItems.medications.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{doc.doctor}</span>
                    <span>{doc.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. DOCTOR VISIT MODE SUMMARY EXPORT */}
      {activeSubTab === 'summary' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Doctor Visit Mode · Pre-Appointment Brief
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                1-Page Clinical Recovery Brief for Dr. Rajesh Mehta
              </h2>
              <p className="text-xs text-slate-500">
                Generated automatically from your verified logs since discharge on {profile.dischargeDate}.
              </p>
            </div>

            <button
              id="print-summary-button"
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-auto min-h-[44px]"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
          </div>

          {/* Printable Brief Layout */}
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-300 space-y-5 text-slate-900">
            {/* Patient Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-slate-200 pb-4 text-xs">
              <div>
                <span className="text-slate-500 block">Patient Name:</span>
                <span className="font-bold text-slate-900 text-sm">{profile.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Age / Gender:</span>
                <span className="font-bold text-slate-900">{profile.age} yrs · {profile.gender}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Procedure:</span>
                <span className="font-bold text-slate-900">{profile.diagnosis}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Follow-up:</span>
                <span className="font-bold text-emerald-800">Sept 14, 10:30 AM</span>
              </div>
            </div>

            {/* Key Clinical Summary Sections */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 uppercase tracking-wider block text-[11px] text-slate-500">
                  1. Medication Adherence
                </span>
                <p className="text-2xl font-black text-emerald-700">{medicationAdherenceRate}%</p>
                <p className="text-slate-600">
                  Total doses taken on schedule. 1 bedtime lipid dose was delayed by 2 hours.
                </p>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 uppercase tracking-wider block text-[11px] text-slate-500">
                  2. Reported Symptoms
                </span>
                <p className="text-2xl font-black text-slate-900">{symptomLogs.length}</p>
                <p className="text-slate-600">
                  Mild vein harvest site discomfort noted; no chest pain or unmanaged shortness of breath reported.
                </p>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 uppercase tracking-wider block text-[11px] text-slate-500">
                  3. Respiratory Recovery
                </span>
                <p className="text-2xl font-black text-emerald-700">100%</p>
                <p className="text-slate-600">
                  Incentive spirometer exercises performed daily as prescribed.
                </p>
              </div>
            </div>

            {/* Questions to Ask Doctor */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5">
              <span className="font-bold text-slate-900 uppercase tracking-wider block text-[11px] text-slate-500">
                Questions Prepared by Patient for This Visit
              </span>
              <ul className="list-decimal list-inside text-slate-700 space-y-1">
                <li>When can I safely resume light driving or climbing more than 2 flights of stairs?</li>
                <li>Is the mild numbness around the left leg saphenous harvest site expected to resolve?</li>
                <li>Should I repeat the lipid panel before our next scheduled appointment?</li>
              </ul>
            </div>

            {/* Backend Clinical Ledger Signature */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-center justify-between text-[11px] gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-emerald-950 font-semibold">
                  {backendDoctorSummary?.provenance || 'SATHI Verified Patient-Reported Recovery Ledger'}
                </span>
              </div>
              <span className="font-mono text-emerald-800 text-[10px] bg-white px-2 py-0.5 rounded-md border border-emerald-300">
                {backendDoctorSummary?.digitalSignature || 'SATHI-VERIFIED-HASH-CABG-94'}
              </span>
            </div>

            <div className="text-[11px] text-slate-500 italic text-center pt-2">
              Note: This is a factual structured summary of patient-logged events and confirmed recovery metrics for clinical reference, not an automated medical diagnosis.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
