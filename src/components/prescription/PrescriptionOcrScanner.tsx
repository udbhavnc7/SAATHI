import React, { useState, useRef } from 'react';
import {
  Upload,
  Camera,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Pill,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save,
  RotateCcw,
  RotateCw,
  Eye,
  Info,
  Plus,
  Trash2,
  Building2,
  Calendar,
  DollarSign,
  Receipt,
  Check,
  Contrast,
  ZoomIn,
  X,
  AlertCircle,
  SlidersHorizontal,
  Wand2,
  Layers,
  Sparkle,
  Bell,
  Volume2,
} from 'lucide-react';
import { useAdaptive } from '../../context/AdaptiveContext';
import { ProvenanceBadge } from '../ui/ProvenanceBadge';
import { VoiceReadButton } from '../ui/VoiceButton';
import { SAMPLE_PRESCRIPTION_RECEIPTS, SampleReceipt } from './sampleReceipts';
import { ScannedMedicationItem, ScannedPrescriptionResult } from '../../types';
import { parseMedicationTimingToSlots } from '../../services/medicationScheduler';
import {
  cleanContrastAndSharpen,
  PreprocessMetrics,
  PreprocessOptions,
} from '../../utils/imagePreprocessing';

interface PrescriptionOcrScannerProps {
  onConfirmSuccess?: () => void;
  compactMode?: boolean;
}

export const PrescriptionOcrScanner: React.FC<PrescriptionOcrScannerProps> = ({
  onConfirmSuccess,
  compactMode = false,
}) => {
  const { profile, medications, addScannedMedications, speakText } = useAdaptive();
  const isElder = profile.ageBand === 'elder';

  // Scanner States
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [rawTextContext, setRawTextContext] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgressStep, setScanProgressStep] = useState<string>('');
  const [scanErrorMessage, setScanErrorMessage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<ScannedPrescriptionResult | null>(null);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [showRawOcrDrawer, setShowRawOcrDrawer] = useState<boolean>(false);
  const [editableRawOcrDraft, setEditableRawOcrDraft] = useState<string>('');
  const [isReanalyzingText, setIsReanalyzingText] = useState<boolean>(false);
  const [showTextPaste, setShowTextPaste] = useState<boolean>(false);
  const [showZoomModal, setShowZoomModal] = useState<boolean>(false);
  const [showAddMedModal, setShowAddMedModal] = useState<boolean>(false);
  const [editingMedIndex, setEditingMedIndex] = useState<number | null>(null);
  const [editMedForm, setEditMedForm] = useState<ScannedMedicationItem | null>(null);
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);

  // Advanced Image Pre-processing & Sharpening States
  const [preprocessingMetrics, setPreprocessingMetrics] = useState<PreprocessMetrics | null>(null);
  const [isPreprocessing, setIsPreprocessing] = useState<boolean>(false);
  const [selectedPreset, setSelectedPreset] = useState<'clinical_auto' | 'faint_thermal' | 'handwriting_sharpen' | 'shadow_removal'>('clinical_auto');
  const [customContrastBoost, setCustomContrastBoost] = useState<number>(1.35);
  const [customSharpenStrength, setCustomSharpenStrength] = useState<number>(0.85);
  const [previewDisplayMode, setPreviewDisplayMode] = useState<'preprocessed' | 'original'>('preprocessed');
  const [showPreprocessSettings, setShowPreprocessSettings] = useState<boolean>(false);

  // New manual medication form state
  const [newMedForm, setNewMedForm] = useState<Partial<ScannedMedicationItem>>({
    name: '',
    genericName: '',
    dosage: '1 Tablet',
    timing: '1-0-1 after food',
    period: 'morning',
    instructions: 'Take with water after meals',
    duration: '30 days',
    quantity: '30 Tablets',
    purpose: 'Prescribed treatment',
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  /**
   * Pre-processing Step: Cleans image contrast (histogram stretching, auto-levels,
   * background shadow removal) and applies 3x3 convolution edge sharpening before
   * transmitting to the Gemini Multimodal OCR endpoint.
   */
  const processImageWithOcrEnhancements = async (
    source: string | File,
    options?: PreprocessOptions
  ): Promise<{ processedUrl: string; originalUrl: string; metrics: PreprocessMetrics }> => {
    setIsPreprocessing(true);
    try {
      let rawDataUrl: string;
      if (source instanceof File) {
        rawDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(source);
        });
      } else {
        rawDataUrl = source;
      }

      const activePreset = options?.preset || selectedPreset;
      const result = await cleanContrastAndSharpen(rawDataUrl, {
        preset: activePreset,
        contrastBoost: options?.contrastBoost !== undefined ? options.contrastBoost : customContrastBoost,
        sharpenStrength: options?.sharpenStrength !== undefined ? options.sharpenStrength : customSharpenStrength,
        ...options,
      });

      setOriginalImage(result.originalDataUrl);
      setSelectedImage(result.processedDataUrl);
      setPreprocessingMetrics(result.metrics);

      return {
        processedUrl: result.processedDataUrl,
        originalUrl: result.originalDataUrl,
        metrics: result.metrics,
      };
    } finally {
      setIsPreprocessing(false);
    }
  };

  // Handle file upload with contrast cleaning and sharpening
  const handleFileSelect = async (file: File) => {
    setSelectedFileName(file.name);
    setActiveSampleId(null);
    setIsConfirmed(false);
    setOcrResult(null);
    setScanErrorMessage(null);

    // If it's a PDF, read as data URL
    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setSelectedImage(null);
        setOriginalImage(null);
        performOcrScan({
          documentName: file.name,
          documentType: 'Prescription PDF Document',
          imageBase64: dataUrl,
        });
      };
      reader.readAsDataURL(file);
      return;
    }

    const { processedUrl, metrics } = await processImageWithOcrEnhancements(file);

    // Auto-trigger OCR scanning with cleaned and sharpened image
    performOcrScan({
      documentName: file.name,
      documentType: 'Prescription Receipt',
      imageBase64: processedUrl,
      preprocessing: metrics,
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Rotate image 90 degrees clockwise and re-clean contrast and re-sharpen
  const handleRotateImage = () => {
    const baseSource = originalImage || selectedImage;
    if (!baseSource) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      const rotatedUrl = canvas.toDataURL('image/jpeg', 0.92);

      const { processedUrl, metrics } = await processImageWithOcrEnhancements(rotatedUrl);

      // Re-trigger OCR on rotated and sharpened image
      performOcrScan({
        documentName: selectedFileName || 'Rotated Prescription',
        documentType: 'Prescription Receipt',
        imageBase64: processedUrl,
        rawText: rawTextContext,
        preprocessing: metrics,
      });
    };
    img.src = baseSource;
  };

  // Enhance image contrast & sharpening filter preset or fine-tuned values
  const handleEnhanceContrast = async (preset?: 'clinical_auto' | 'faint_thermal' | 'handwriting_sharpen' | 'shadow_removal') => {
    const targetPreset = preset || (selectedPreset === 'faint_thermal' ? 'handwriting_sharpen' : 'faint_thermal');
    setSelectedPreset(targetPreset);

    const baseSource = originalImage || selectedImage;
    if (!baseSource) return;

    const { processedUrl, metrics } = await processImageWithOcrEnhancements(baseSource, {
      preset: targetPreset,
      contrastBoost: targetPreset === 'faint_thermal' ? 1.85 : customContrastBoost,
      sharpenStrength: targetPreset === 'handwriting_sharpen' ? 1.35 : customSharpenStrength,
    });

    // Re-trigger OCR on enhanced image
    performOcrScan({
      documentName: selectedFileName || 'Contrast-Cleaned Prescription',
      documentType: 'Prescription Receipt',
      imageBase64: processedUrl,
      rawText: rawTextContext,
      preprocessing: metrics,
    });
  };

  // Handle sample prescription selection
  const handleSelectSample = async (sample: SampleReceipt) => {
    setActiveSampleId(sample.id);
    setSelectedFileName(sample.name);
    setRawTextContext(sample.rawText);
    setIsConfirmed(false);
    setOcrResult(null);
    setScanErrorMessage(null);

    // Apply contrast cleaning & sharpening to receipt before sending to OCR
    const { processedUrl, metrics } = await processImageWithOcrEnhancements(sample.imageThumbnail, {
      preset: 'clinical_auto',
    });

    performOcrScan({
      documentName: sample.name,
      documentType: sample.documentType,
      imageBase64: processedUrl,
      rawText: sample.rawText,
      preprocessing: metrics,
    });
  };

  // Perform OCR API Call
  const performOcrScan = async (payload: {
    documentName: string;
    documentType: string;
    imageBase64?: string;
    rawText?: string;
    preprocessing?: PreprocessMetrics | null;
  }) => {
    setIsScanning(true);
    setScanErrorMessage(null);
    setScanProgressStep('Pre-processing: cleaning image contrast & applying 3x3 convolution edge sharpening...');

    try {
      const progressTimer1 = setTimeout(() => {
        setScanProgressStep('Transmitting contrast-cleaned receipt to Gemini Multimodal OCR...');
      }, 500);

      const progressTimer2 = setTimeout(() => {
        setScanProgressStep('Extracting medication names, strengths, and dosage codes (1-0-1)...');
      }, 1200);

      const progressTimer3 = setTimeout(() => {
        setScanProgressStep('Cross-referencing drug interaction safety against active recovery regimen...');
      }, 1900);

      const res = await fetch('/api/scan-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentName: payload.documentName,
          documentType: payload.documentType,
          imageBase64: payload.imageBase64,
          rawText: payload.rawText || rawTextContext,
          preprocessing: payload.preprocessing || preprocessingMetrics,
        }),
      });

      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);
      clearTimeout(progressTimer3);

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data: ScannedPrescriptionResult = await res.json();

      // Ensure every medication has a unique id, selected flag, and parsed dosage schedule
      const processedMeds = (data.extractedMedications || []).map((m, idx) => ({
        ...m,
        id: `ocr-med-${idx}`,
        selected: true,
        parsedSchedule: parseMedicationTimingToSlots(m.name, m.timing, m.instructions, m.period),
      }));

      setOcrResult({
        ...data,
        extractedMedications: processedMeds,
      });
      setEditableRawOcrDraft(data.rawOcrText || '');

      // Voice read summary for accessibility
      if (profile.accessibility.voicePrimary && data.summary) {
        speakText(`Receipt scanned. Found ${processedMeds.length} medicines. ${data.summary}`);
      }
    } catch (err: any) {
      console.error('OCR scan failed:', err);
      setScanErrorMessage(
        'Unable to complete OCR scan on this document automatically. You can rotate or enhance the image, paste the prescription text, or add medicines directly using the manual entry button below.'
      );
    } finally {
      setIsScanning(false);
      setScanProgressStep('');
    }
  };

  // Re-analyze edited raw text
  const handleReAnalyzeEditedText = async () => {
    if (!editableRawOcrDraft.trim()) return;
    setIsReanalyzingText(true);
    try {
      const res = await fetch('/api/scan-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentName: selectedFileName || 'Edited Prescription Text',
          documentType: 'Prescription Text',
          rawText: editableRawOcrDraft,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: ScannedPrescriptionResult = await res.json();
      const processedMeds = (data.extractedMedications || []).map((m, idx) => ({
        ...m,
        id: `ocr-med-reparsed-${idx}-${Date.now()}`,
        selected: true,
        parsedSchedule: parseMedicationTimingToSlots(m.name, m.timing, m.instructions, m.period),
      }));

      setOcrResult((prev) =>
        prev
          ? {
              ...prev,
              extractedMedications: processedMeds,
              summary: data.summary || prev.summary,
              rawOcrText: editableRawOcrDraft,
            }
          : {
              ...data,
              extractedMedications: processedMeds,
              rawOcrText: editableRawOcrDraft,
            }
      );
    } catch (err) {
      console.error('Re-analysis failed:', err);
    } finally {
      setIsReanalyzingText(false);
    }
  };

  // Add a manually created medicine into the current result
  const handleAddManualMed = () => {
    if (!newMedForm.name?.trim()) return;
    const newMed: ScannedMedicationItem = {
      id: `manual-med-${Date.now()}`,
      name: newMedForm.name.trim(),
      genericName: newMedForm.genericName?.trim() || newMedForm.name.trim(),
      dosage: newMedForm.dosage?.trim() || '1 Tablet',
      timing: newMedForm.timing?.trim() || '1-0-1 after food',
      period: newMedForm.period || 'morning',
      instructions: newMedForm.instructions?.trim() || 'Take with water as directed',
      duration: newMedForm.duration?.trim() || '30 days',
      quantity: newMedForm.quantity?.trim() || '30 Tablets',
      purpose: newMedForm.purpose?.trim() || 'Prescribed treatment',
      confidence: 100,
      selected: true,
      parsedSchedule: parseMedicationTimingToSlots(
        newMedForm.name.trim(),
        newMedForm.timing?.trim() || '1-0-1 after food',
        newMedForm.instructions?.trim() || 'Take with water as directed',
        newMedForm.period || 'morning'
      ),
    };

    if (ocrResult) {
      setOcrResult({
        ...ocrResult,
        extractedMedications: [...ocrResult.extractedMedications, newMed],
      });
    } else {
      setOcrResult({
        documentTitle: selectedFileName || 'Prescription Document',
        category: 'Prescription',
        doctorOrHospital: 'Manually Entered',
        pharmacyName: 'Direct Verification',
        date: new Date().toLocaleDateString(),
        rxNumber: 'MANUAL-RX',
        totalAmount: '',
        extractedMedications: [newMed],
        extractedRestrictions: [],
        warningSigns: [],
        summary: 'Manually added medications verified by patient.',
        rawOcrText: newMed.name,
        confidenceScore: 100,
        confirmedByPatient: false,
        provenance: 'Patient-entered verified medicine',
      });
    }

    setNewMedForm({
      name: '',
      genericName: '',
      dosage: '1 Tablet',
      timing: '1-0-1 after food',
      period: 'morning',
      instructions: 'Take with water after meals',
      duration: '30 days',
      quantity: '30 Tablets',
      purpose: 'Prescribed treatment',
    });
    setShowAddMedModal(false);
  };

  // Toggle selection of individual medication
  const toggleMedSelection = (index: number) => {
    if (!ocrResult) return;
    const updated = [...ocrResult.extractedMedications];
    updated[index] = {
      ...updated[index],
      selected: !updated[index].selected,
    };
    setOcrResult({
      ...ocrResult,
      extractedMedications: updated,
    });
  };

  // Start editing a medication line
  const handleStartEdit = (index: number) => {
    if (!ocrResult) return;
    setEditingMedIndex(index);
    setEditMedForm({ ...ocrResult.extractedMedications[index] });
  };

  // Save edited medication line
  const handleSaveEdit = () => {
    if (!ocrResult || editingMedIndex === null || !editMedForm) return;
    const updated = [...ocrResult.extractedMedications];
    updated[editingMedIndex] = { ...editMedForm };
    setOcrResult({
      ...ocrResult,
      extractedMedications: updated,
    });
    setEditingMedIndex(null);
    setEditMedForm(null);
  };

  // Remove a medication
  const handleRemoveMed = (index: number) => {
    if (!ocrResult) return;
    const updated = ocrResult.extractedMedications.filter((_, i) => i !== index);
    setOcrResult({
      ...ocrResult,
      extractedMedications: updated,
    });
  };

  // Check safety against current medications
  const checkInteractionStatus = (candidateName: string) => {
    const candidateLower = candidateName.toLowerCase();
    const existingNames = medications.map((m) => m.name.toLowerCase());

    // Duplicate check
    const isDuplicate = existingNames.some(
      (n) => n.includes(candidateLower) || candidateLower.includes(n)
    );
    if (isDuplicate) {
      return {
        status: 'warning',
        text: 'Already in active schedule (Dose verification advised)',
      };
    }

    // Known dangerous combinations
    if (
      (candidateLower.includes('ibuprofen') ||
        candidateLower.includes('naproxen') ||
        candidateLower.includes('diclofenac')) &&
      existingNames.some((n) => n.includes('aspirin') || n.includes('ecosprin'))
    ) {
      return {
        status: 'danger',
        text: '⚠️ High Risk: NSAID interacts with Aspirin (Bleeding Hazard)',
      };
    }

    return {
      status: 'safe',
      text: '✓ Safe & compatible with current medications',
    };
  };

  // Confirm and integrate into care plan
  const handleConfirmAll = () => {
    if (!ocrResult) return;

    const selected = ocrResult.extractedMedications.filter((m) => m.selected);
    if (selected.length === 0) {
      alert('Please select at least one medication to add to your schedule.');
      return;
    }

    addScannedMedications(selected, ocrResult.documentTitle || selectedFileName || 'Prescription Receipt');
    setIsConfirmed(true);

    if (onConfirmSuccess) {
      onConfirmSuccess();
    }
  };

  const selectedCount = ocrResult?.extractedMedications.filter((m) => m.selected).length || 0;

  return (
    <div
      id="prescription-ocr-scanner"
      className={`rounded-3xl transition-all ${
        isElder
          ? 'bg-slate-50 border-2 border-emerald-900/30 p-6'
          : 'bg-white border border-slate-200 shadow-sm p-6'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" />
              High-Accuracy Prescription OCR Engine
            </span>
            <ProvenanceBadge tag="ai_extracted" size="sm" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Scan &amp; List Prescription Medicines
          </h2>
          <p className="text-xs text-slate-600 max-w-2xl">
            Upload any paper prescription slip, doctor’s addendum, or pharmacy tax invoice. SATHI's
            multimodal OCR transcribes the document and lists out all prescribed medicines with dosages,
            timings, and interaction safety checks.
          </p>
        </div>

        {ocrResult && (
          <button
            type="button"
            onClick={() => {
              setOcrResult(null);
              setSelectedImage(null);
              setIsConfirmed(false);
              setActiveSampleId(null);
              setScanErrorMessage(null);
            }}
            className="self-start sm:self-center px-3.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer flex items-center gap-1.5 min-h-[40px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Scan Another Receipt</span>
          </button>
        )}
      </div>

      {/* Error Banner if OCR failed */}
      {scanErrorMessage && (
        <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <p className="font-semibold">{scanErrorMessage}</p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {selectedImage && (
                <>
                  <button
                    type="button"
                    onClick={handleRotateImage}
                    className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 rounded-lg font-bold text-amber-900 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Rotate 90° &amp; Retry</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleEnhanceContrast}
                    className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 rounded-lg font-bold text-amber-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Contrast className="w-3.5 h-3.5" />
                    <span>Enhance Contrast &amp; Retry</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setShowAddMedModal(true)}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Medicine Manually</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. UPLOAD & SAMPLE RECEIPT PICKER SECTION (When no result or active) */}
      {!ocrResult && !isScanning && (
        <div className="mt-6 space-y-6">
          {/* Drag & Drop Box */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl p-8 text-center bg-emerald-50/30 transition-colors cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
              <Upload className="w-7 h-7" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mt-3">
              Upload Prescription Receipt or Doctor's Slip
            </h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
              Drag &amp; drop your image file here, or click to browse. Automatically optimizes and enhances images for maximum accuracy.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 min-h-[44px]"
              >
                <Upload className="w-4 h-4" />
                <span>Browse Files</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cameraInputRef.current?.click();
                }}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 min-h-[44px]"
              >
                <Camera className="w-4 h-4 text-emerald-700" />
                <span>Take Photo via Camera</span>
              </button>
            </div>
          </div>

          {/* Quick One-Tap Sample Receipts Gallery */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Or Test with Sample Prescription Receipts
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Click any receipt to test OCR extraction instantly
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SAMPLE_PRESCRIPTION_RECEIPTS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleSelectSample(sample)}
                  className={`text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    activeSampleId === sample.id
                      ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50 shadow-xs'
                  }`}
                >
                  <div className="space-y-2 w-full">
                    <div className="flex items-start justify-between gap-1">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {sample.documentType}
                      </span>
                      <span className="text-[11px] font-bold text-slate-700">{sample.totalAmount}</span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 leading-snug">{sample.name}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{sample.hospital}</p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-emerald-700 font-bold">
                    <span>{sample.rxNumber}</span>
                    <span className="inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Scan Sample →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Paste Raw Text Alternative */}
          <div className="border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setShowTextPaste(!showTextPaste)}
              className="text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Or paste raw prescription / doctor's note text directly</span>
              {showTextPaste ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showTextPaste && (
              <div className="mt-3 space-y-3 animate-fade-in">
                <textarea
                  rows={4}
                  value={rawTextContext}
                  onChange={(e) => setRawTextContext(e.target.value)}
                  placeholder="Paste prescription lines here... e.g. Metformin 500mg 1-0-1 with meals, Ecosprin 75mg 1-0-0 after breakfast..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  disabled={!rawTextContext.trim()}
                  onClick={() =>
                    performOcrScan({
                      documentName: 'Pasted Prescription Note',
                      documentType: 'Text Prescription',
                      rawText: rawTextContext,
                    })
                  }
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Process Text Extraction
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. ACTIVE SCANNING STATE */}
      {isScanning && (
        <div className="mt-6 p-8 rounded-2xl bg-emerald-50/40 border border-emerald-200 text-center space-y-4 animate-fade-in">
          <div className="relative w-24 h-24 mx-auto">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt="Receipt Preview"
                className="w-full h-full object-cover rounded-xl border border-emerald-300 shadow-sm opacity-60"
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                <Receipt className="w-10 h-10" />
              </div>
            )}
            {/* Animated Laser Scanning Line */}
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_8px_#10b981] animate-bounce" />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900">
              Reading Prescription Receipt via High-Accuracy OCR...
            </h3>
            <p className="text-xs text-emerald-800 font-semibold mt-1">
              {scanProgressStep || 'Extracting medicines and clinical dosage schedules...'}
            </p>
            <p className="text-[11px] text-slate-500 mt-2 max-w-sm mx-auto">
              Scanning pharmacy header, patient details, trade formulations, and taking instructions.
            </p>
          </div>
        </div>
      )}

      {/* 3. OCR RESULTS DISPLAY: MEDICINES LIST & ACTIONS */}
      {ocrResult && !isScanning && (
        <div className="mt-6 space-y-6 animate-fade-in">
          {/* Pre-processing Enhancement Suite Card */}
          {selectedImage && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white border border-emerald-800/80 shadow-md space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-700/80 text-emerald-200 flex items-center justify-center shrink-0 shadow-xs">
                    <Wand2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-100">
                        Image Pre-processing Suite (Active)
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                        Contrast Cleaned &amp; 3x3 Sharpened
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-300/80">
                      {preprocessingMetrics ? (
                        <>
                          Dynamic Contrast: <strong>+{preprocessingMetrics.contrastGainPercent}%</strong> · Edge Sharpness: <strong>+{preprocessingMetrics.sharpnessGainPercent}%</strong> · Cleaned in {preprocessingMetrics.processingTimeMs}ms
                        </>
                      ) : (
                        'Adaptive auto-levels & Laplacian kernel applied before Gemini OCR'
                      )}
                    </p>
                  </div>
                </div>

                {/* A/B View Toggle */}
                <div className="flex items-center gap-1 bg-emerald-900/80 p-1 rounded-xl border border-emerald-700/50 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPreviewDisplayMode('preprocessed')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      previewDisplayMode === 'preprocessed'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-emerald-300 hover:text-white'
                    }`}
                  >
                    Cleaned &amp; Sharpened (OCR Input)
                  </button>
                  {originalImage && (
                    <button
                      type="button"
                      onClick={() => setPreviewDisplayMode('original')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        previewDisplayMode === 'original'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-emerald-300 hover:text-white'
                      }`}
                    >
                      Original Raw
                    </button>
                  )}
                </div>
              </div>

              {/* Presets & Fine-tuning Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-800/60 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-emerald-300/90 font-medium mr-1">Preset:</span>
                  <button
                    type="button"
                    onClick={() => handleEnhanceContrast('clinical_auto')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      selectedPreset === 'clinical_auto'
                        ? 'bg-white text-emerald-950 font-bold shadow-xs'
                        : 'bg-emerald-900/60 text-emerald-200 hover:bg-emerald-800'
                    }`}
                  >
                    Clinical Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEnhanceContrast('faint_thermal')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      selectedPreset === 'faint_thermal'
                        ? 'bg-white text-emerald-950 font-bold shadow-xs'
                        : 'bg-emerald-900/60 text-emerald-200 hover:bg-emerald-800'
                    }`}
                  >
                    Faded Thermal Slip
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEnhanceContrast('handwriting_sharpen')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      selectedPreset === 'handwriting_sharpen'
                        ? 'bg-white text-emerald-950 font-bold shadow-xs'
                        : 'bg-emerald-900/60 text-emerald-200 hover:bg-emerald-800'
                    }`}
                  >
                    Doctor Handwriting Sharpen
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEnhanceContrast('shadow_removal')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      selectedPreset === 'shadow_removal'
                        ? 'bg-white text-emerald-950 font-bold shadow-xs'
                        : 'bg-emerald-900/60 text-emerald-200 hover:bg-emerald-800'
                    }`}
                  >
                    Shadow Removal
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPreprocessSettings(!showPreprocessSettings)}
                  className="text-[11px] text-emerald-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>{showPreprocessSettings ? 'Hide Sliders' : 'Fine-tune Sliders'}</span>
                </button>
              </div>

              {/* Collapsible Sliders */}
              {showPreprocessSettings && (
                <div className="p-3 rounded-xl bg-emerald-900/70 border border-emerald-800/80 space-y-2.5 animate-fade-in text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[11px] text-emerald-200 mb-1">
                        <span>Contrast Dynamic Stretch</span>
                        <span className="font-mono font-bold text-white">{customContrastBoost.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="1.0"
                        max="2.5"
                        step="0.05"
                        value={customContrastBoost}
                        onChange={(e) => setCustomContrastBoost(parseFloat(e.target.value))}
                        className="w-full accent-emerald-400 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-emerald-200 mb-1">
                        <span>Sharpening Kernel Strength</span>
                        <span className="font-mono font-bold text-white">{customSharpenStrength.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="2.0"
                        step="0.05"
                        value={customSharpenStrength}
                        onChange={(e) => setCustomSharpenStrength(parseFloat(e.target.value))}
                        className="w-full accent-emerald-400 cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleEnhanceContrast()}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Re-Clean &amp; Re-Scan with Gemini</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Document Meta Header Card with Image Inspection & Enhancement Toolbar */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {selectedImage ? (
                <div
                  className="relative group w-16 h-16 rounded-xl border border-slate-300 overflow-hidden shrink-0 bg-white shadow-xs cursor-pointer"
                  onClick={() => setShowZoomModal(true)}
                  title="Click to inspect receipt document"
                >
                  <img
                    src={previewDisplayMode === 'original' && originalImage ? originalImage : selectedImage}
                    alt="Receipt thumbnail"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                    <ZoomIn className="w-4 h-4" />
                  </div>
                  <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/75 text-[8px] font-mono text-emerald-300 font-bold leading-tight">
                    {previewDisplayMode === 'original' ? 'RAW' : 'CLEAN'}
                  </span>
                </div>
              ) : (
                <div className="w-14 h-14 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Receipt className="w-7 h-7" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    {ocrResult.documentTitle}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {ocrResult.confidenceScore}% OCR Match
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
                  {ocrResult.doctorOrHospital && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {ocrResult.doctorOrHospital}
                    </span>
                  )}
                  {ocrResult.rxNumber && (
                    <span className="flex items-center gap-1">
                      <Receipt className="w-3.5 h-3.5 text-slate-400" />
                      {ocrResult.rxNumber}
                    </span>
                  )}
                  {ocrResult.totalAmount && (
                    <span className="flex items-center gap-1 font-bold text-emerald-700">
                      <DollarSign className="w-3.5 h-3.5" />
                      Total: {ocrResult.totalAmount}
                    </span>
                  )}
                </div>

                {/* Enhancement Controls Toolbar */}
                {selectedImage && (
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowZoomModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      title="Inspect original receipt document"
                    >
                      <ZoomIn className="w-3 h-3 text-slate-500" />
                      <span>Zoom Receipt</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRotateImage}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      title="Rotate image 90 degrees clockwise"
                    >
                      <RotateCw className="w-3 h-3 text-slate-500" />
                      <span>Rotate 90°</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEnhanceContrast('faint_thermal')}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      title="Sharpen faint handwriting or thermal ink"
                    >
                      <Contrast className="w-3 h-3 text-slate-500" />
                      <span>Faint Thermal Boost</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Confirmation status pill */}
            <div className="self-start md:self-center">
              {isConfirmed ? (
                <span className="px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Integrated &amp; Active in Schedule</span>
                </span>
              ) : (
                <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  <span>Pending Patient Verification</span>
                </span>
              )}
            </div>
          </div>

          {/* Plain Language Summary */}
          {ocrResult.summary && (
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-slate-800 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold text-emerald-950 block mb-0.5">Summary of Prescribed Regimen:</span>
                <p>{ocrResult.summary}</p>
              </div>
              <VoiceReadButton text={ocrResult.summary} label="Read Summary" />
            </div>
          )}

          {/* ========================================================================= */}
          {/* THE CORE SECTION: EXTRACTED MEDICINES LIST */}
          {/* ========================================================================= */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-emerald-700" />
                <h4 className="text-base font-bold text-slate-900">
                  Prescription Medicines Extracted ({ocrResult.extractedMedications.length} Found)
                </h4>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-600">
                  <strong>{selectedCount}</strong> of {ocrResult.extractedMedications.length} selected
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddMedModal(true)}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Medicine</span>
                </button>
              </div>
            </div>

            {/* Zero medicines detected state */}
            {ocrResult.extractedMedications.length === 0 && (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
                <h5 className="text-sm font-bold text-slate-800">
                  No legible medications were resolved from this image
                </h5>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Doctor's handwriting or receipt ink may be faint or captured at an angle. Use the tools below to rotate, enhance contrast, paste the text directly, or add medicines manually.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleRotateImage}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Rotate 90°</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleEnhanceContrast}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Contrast className="w-3.5 h-3.5" />
                    <span>Sharpen Contrast</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddMedModal(true)}
                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Medicine Manually</span>
                  </button>
                </div>
              </div>
            )}

            {/* List of Medicines Cards */}
            <div className="space-y-3">
              {ocrResult.extractedMedications.map((med, idx) => {
                const safety = checkInteractionStatus(med.name);
                const isEditing = editingMedIndex === idx;

                return (
                  <div
                    key={med.id || idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      med.selected
                        ? 'border-slate-300 bg-white shadow-xs'
                        : 'border-slate-200 bg-slate-50 opacity-60'
                    }`}
                  >
                    {isEditing ? (
                      /* Inline Edit Form */
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-800">
                            Editing Medication #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Changes</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Trade / Brand Name
                            </label>
                            <input
                              type="text"
                              value={editMedForm?.name || ''}
                              onChange={(e) =>
                                setEditMedForm((prev) => (prev ? { ...prev, name: e.target.value } : null))
                              }
                              className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Generic Formulation
                            </label>
                            <input
                              type="text"
                              value={editMedForm?.genericName || ''}
                              onChange={(e) =>
                                setEditMedForm((prev) => (prev ? { ...prev, genericName: e.target.value } : null))
                              }
                              className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Dosage / Strength
                            </label>
                            <input
                              type="text"
                              value={editMedForm?.dosage || ''}
                              onChange={(e) =>
                                setEditMedForm((prev) => (prev ? { ...prev, dosage: e.target.value } : null))
                              }
                              className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Timing (e.g. 1-0-1)
                            </label>
                            <input
                              type="text"
                              value={editMedForm?.timing || ''}
                              onChange={(e) =>
                                setEditMedForm((prev) => (prev ? { ...prev, timing: e.target.value } : null))
                              }
                              className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Taking Instructions
                            </label>
                            <input
                              type="text"
                              value={editMedForm?.instructions || ''}
                              onChange={(e) =>
                                setEditMedForm((prev) => (prev ? { ...prev, instructions: e.target.value } : null))
                              }
                              className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Clinical Purpose
                            </label>
                            <input
                              type="text"
                              value={editMedForm?.purpose || ''}
                              onChange={(e) =>
                                setEditMedForm((prev) => (prev ? { ...prev, purpose: e.target.value } : null))
                              }
                              className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Display Card */
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {/* Selection Checkbox */}
                          <button
                            type="button"
                            onClick={() => toggleMedSelection(idx)}
                            className={`mt-1 w-5 h-5 rounded-md flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                              med.selected
                                ? 'bg-emerald-700 text-white'
                                : 'border-2 border-slate-400 bg-white'
                            }`}
                          >
                            {med.selected && <Check className="w-3.5 h-3.5" />}
                          </button>

                          <div className="space-y-1.5">
                            {/* Medicine Title & Generic */}
                            <div className="flex flex-wrap items-center gap-2">
                              <h5 className="text-sm font-bold text-slate-900">{med.name}</h5>
                              {med.genericName && (
                                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                  {med.genericName}
                                </span>
                              )}
                              {med.confidence && (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  {med.confidence}% confidence
                                </span>
                              )}
                            </div>

                            {/* Tags row: Dosage, Timing, Duration, Quantity */}
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-100/70 text-emerald-900 font-bold flex items-center gap-1">
                                <Pill className="w-3 h-3 text-emerald-700" />
                                {med.dosage}
                              </span>

                              <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 font-bold flex items-center gap-1 border border-blue-200">
                                <Clock className="w-3 h-3 text-blue-600" />
                                {med.timing}
                              </span>

                              {med.duration && (
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                                  {med.duration}
                                </span>
                              )}

                              {med.quantity && (
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                                  Qty: {med.quantity}
                                </span>
                              )}
                            </div>

                            {/* Taking Instructions & Purpose */}
                            <div className="text-xs text-slate-700 space-y-0.5 pt-1">
                              {med.instructions && (
                                <p className="text-slate-700">
                                  <span className="font-semibold text-slate-900">Instructions:</span>{' '}
                                  {med.instructions}
                                </p>
                              )}
                              {med.purpose && (
                                <p className="text-slate-600">
                                  <span className="font-semibold text-slate-900">Clinical Purpose:</span>{' '}
                                  {med.purpose}
                                </p>
                              )}
                            </div>

                            {/* Drug Interaction Safety Status */}
                            <div className="pt-1.5">
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                  safety.status === 'safe'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : safety.status === 'warning'
                                    ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                                }`}
                              >
                                {safety.status === 'safe' ? (
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                )}
                                {safety.text}
                              </span>
                            </div>

                            {/* Scheduled Dosage Alert Slots Preview */}
                            {(() => {
                              const dosageSlots =
                                med.parsedSchedule && med.parsedSchedule.length > 0
                                  ? med.parsedSchedule
                                  : parseMedicationTimingToSlots(med.name, med.timing, med.instructions, med.period);

                              return (
                                <div className="pt-2">
                                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                                    <div className="flex flex-wrap items-center justify-between gap-1">
                                      <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                                        <Bell className="w-3 h-3 text-emerald-700" />
                                        <span>
                                          Scheduled Dosage Alerts ({dosageSlots.length} daily reminder{dosageSlots.length !== 1 ? 's' : ''}):
                                        </span>
                                      </span>
                                      <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Volume2 className="w-2.5 h-2.5" />
                                        Chime &amp; Push Alert
                                      </span>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                      {dosageSlots.map((slot, sIdx) => (
                                        <span
                                          key={sIdx}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs"
                                        >
                                          <Clock className="w-3 h-3 text-emerald-600" />
                                          <span className="font-bold text-slate-900">{slot.time}</span>
                                          <span className="text-[10px] text-slate-500 font-normal">· {slot.label}</span>
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Actions for this medication line */}
                        <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 self-end md:self-start">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(idx)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit dosage or instructions"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMed(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove from list"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Precautions & Warning Signs from Receipt */}
          {(ocrResult.extractedRestrictions?.length > 0 || ocrResult.warningSigns?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {ocrResult.extractedRestrictions?.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    Precautions &amp; Physical Restrictions:
                  </span>
                  <ul className="list-disc list-inside text-slate-700 space-y-1 pl-1">
                    {ocrResult.extractedRestrictions.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {ocrResult.warningSigns?.length > 0 && (
                <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200 space-y-1.5">
                  <span className="font-bold text-rose-950 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-700" />
                    Doctor Red-Flag Warning Signs:
                  </span>
                  <ul className="list-disc list-inside text-rose-900 space-y-1 pl-1">
                    {ocrResult.warningSigns.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Raw OCR Transcription Drawer (Patient Transparency & Real-time Text Re-analyzer) */}
          <div className="border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={() => setShowRawOcrDrawer(!showRawOcrDrawer)}
              className="text-xs font-bold text-slate-700 hover:text-emerald-800 flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-700" />
              <span>
                {showRawOcrDrawer
                  ? 'Hide Verbatim OCR Receipt Transcription & Editor'
                  : 'View & Edit Verbatim OCR Receipt Lines (Transcription)'}
              </span>
              {showRawOcrDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showRawOcrDrawer && (
              <div className="mt-3 p-4 rounded-xl bg-slate-900 text-slate-200 text-[11px] font-mono border border-slate-800 animate-fade-in space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-sans text-xs">
                    Need to correct a line or doctor abbreviation? Edit below and click Re-Analyze:
                  </span>
                  <button
                    type="button"
                    onClick={handleReAnalyzeEditedText}
                    disabled={isReanalyzingText}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-sans font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isReanalyzingText ? 'Re-Analyzing...' : 'Re-Analyze Edited Text'}</span>
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={editableRawOcrDraft}
                  onChange={(e) => setEditableRawOcrDraft(e.target.value)}
                  className="w-full p-3 bg-slate-950 rounded-lg text-emerald-400 font-mono text-xs border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>

          {/* 4. CONFIRMATION & INTEGRATION BUTTON */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              <span className="font-bold text-slate-800 block">
                Clinical Guardrail Protection:
              </span>
              <span>Information is only integrated into your active schedule after you click confirm.</span>
            </div>

            <div className="flex items-center gap-3">
              {isConfirmed ? (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-100 px-4 py-2.5 rounded-xl">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{selectedCount} Medicines &amp; Dosage Alerts Scheduled!</span>
                </div>
              ) : (
                <button
                  id="confirm-scanned-prescription-button"
                  type="button"
                  onClick={handleConfirmAll}
                  disabled={selectedCount === 0}
                  className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2 min-h-[44px]"
                >
                  <Bell className="w-4 h-4" />
                  <span>
                    Confirm &amp; Schedule Alerts for {selectedCount} Medicine{selectedCount !== 1 ? 's' : ''}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Medicine Modal */}
      {showAddMedModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">Add Medicine Manually</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMedModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Medicine Name (Brand) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Augmentin 625, Dolo 650"
                    value={newMedForm.name || ''}
                    onChange={(e) => setNewMedForm({ ...newMedForm, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Active Formulation / Generic
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Amoxicillin + Clavulanate"
                    value={newMedForm.genericName || ''}
                    onChange={(e) => setNewMedForm({ ...newMedForm, genericName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dosage / Strength</label>
                  <input
                    type="text"
                    placeholder="e.g. 500mg, 1 Tab"
                    value={newMedForm.dosage || ''}
                    onChange={(e) => setNewMedForm({ ...newMedForm, dosage: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Schedule / Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 1-0-1, OD, SOS"
                    value={newMedForm.timing || ''}
                    onChange={(e) => setNewMedForm({ ...newMedForm, timing: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Period</label>
                  <select
                    value={newMedForm.period || 'morning'}
                    onChange={(e) => setNewMedForm({ ...newMedForm, period: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                    <option value="night">Night</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Take with water after breakfast"
                  value={newMedForm.instructions || ''}
                  onChange={(e) => setNewMedForm({ ...newMedForm, instructions: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Clinical Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Infection prophylaxis, pain relief"
                  value={newMedForm.purpose || ''}
                  onChange={(e) => setNewMedForm({ ...newMedForm, purpose: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAddMedModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddManualMed}
                disabled={!newMedForm.name?.trim()}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add to Scanned List</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Inspection Modal */}
      {showZoomModal && selectedImage && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-scale-up border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-700" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Prescription Document Inspection
                  </h4>
                  {preprocessingMetrics && (
                    <p className="text-[10px] text-emerald-700 font-semibold">
                      Contrast Stretch: +{preprocessingMetrics.contrastGainPercent}% · 3x3 Edge Sharpen: +{preprocessingMetrics.sharpnessGainPercent}% · {selectedPreset}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* A/B Switch in Modal */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPreviewDisplayMode('preprocessed')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      previewDisplayMode === 'preprocessed'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Cleaned &amp; Sharpened (OCR)
                  </button>
                  {originalImage && (
                    <button
                      type="button"
                      onClick={() => setPreviewDisplayMode('original')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        previewDisplayMode === 'original'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Original Raw
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleRotateImage}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                  title="Rotate 90 degrees"
                >
                  <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Rotate</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleEnhanceContrast('faint_thermal')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                  title="Thermal ink contrast boost"
                >
                  <Contrast className="w-3.5 h-3.5 text-slate-500" />
                  <span>Thermal Boost</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowZoomModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mt-3 flex-1 overflow-auto rounded-2xl bg-slate-900/5 border border-slate-200 p-3 flex items-center justify-center relative">
              <img
                src={previewDisplayMode === 'original' && originalImage ? originalImage : selectedImage}
                alt="Enlarged Prescription Receipt"
                className="max-h-[68vh] max-w-full object-contain rounded-xl shadow-md"
              />
              <div className="absolute top-4 left-4 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-xs text-white text-[11px] font-mono flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${previewDisplayMode === 'original' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <span>{previewDisplayMode === 'original' ? 'Original Unprocessed Capture' : 'Cleaned Contrast & 3x3 Edge Sharpened'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
