import { useState, useRef } from 'react';
import type { ReportSubmission, ProcessedReport, CategoryId, SubTypeId } from '@/types';
import { processReport } from '@/data/aiEngine';
import { CATEGORIES, getCategory } from '@/data/categories';
import { getIcon } from '@/lib/iconMap';
import {
  X,
  Mic,
  ImagePlus,
  Type,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Sparkles,
} from 'lucide-react';

interface ReportModalProps {
  cityCenter: { lat: number; lng: number };
  onClose: () => void;
  onSubmit: (submission: ReportSubmission, processed: ProcessedReport) => void;
}

type Tab = 'text' | 'voice' | 'photo';

export default function ReportModal({
  cityCenter,
  onClose,
  onSubmit,
}: ReportModalProps) {
  const [tab, setTab] = useState<Tab>('text');
  const [text, setText] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessedReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = tab === 'text' ? text.trim().length > 10 : tab === 'photo' ? !!photoUrl : text.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit && tab !== 'voice') return;
    setProcessing(true);

    // Simulate AI processing
    setTimeout(() => {
      const reportText = text.trim() || (tab === 'photo' ? 'Reported hazard from photo upload. Appears to be a safety or cleanliness issue.' : 'Voice note transcribed: unsafe area with poor lighting at night.');
      const processed = processReport(reportText);
      setResult(processed);
      setProcessing(false);
    }, 1600);
  };

  const handleConfirm = () => {
    if (!result) return;
    const submission: ReportSubmission = {
      type: tab,
      text: text.trim() || 'Voice/photo report',
      photoDataUrl: photoUrl,
      lat: cityCenter.lat + (Math.random() - 0.5) * 0.03,
      lng: cityCenter.lng + (Math.random() - 0.5) * 0.03,
    };
    onSubmit(submission, result);
    // Reset
    handleClose();
  };

  const handleClose = () => {
    setText('');
    setPhotoUrl(undefined);
    setResult(null);
    setProcessing(false);
    setIsRecording(false);
    onClose();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(reader.result as string);
      // Auto-fill text if empty
      if (!text.trim()) {
        setText('Reported issue from uploaded photo. Possible safety or cleanliness hazard.');
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      if (!text.trim()) {
        setText('Voice note transcribed: There is a poorly lit street near the park entrance. I felt unsafe walking here at night. Please add better lighting.');
      }
    } else {
      setIsRecording(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-black dark:to-slate-900">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-cyan-400" />
            <h2 className="text-lg font-bold text-white">
              Report Incident / Share Insight
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {result ? (
          /* AI Result */
          <AIResultView result={result} onConfirm={handleConfirm} onCancel={() => setResult(null)} />
        ) : (
          <>
            {/* Tab selector */}
            <div className="flex gap-1 p-3 bg-slate-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-700">
              <TabButton active={tab === 'text'} onClick={() => setTab('text')} icon={<Type size={16} />} label="Text" />
              <TabButton active={tab === 'voice'} onClick={() => setTab('voice')} icon={<Mic size={16} />} label="Voice Note" />
              <TabButton active={tab === 'photo'} onClick={() => setTab('photo')} icon={<ImagePlus size={16} />} label="Photo" />
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {tab === 'voice' && (
                <div className="flex flex-col items-center justify-center py-6 space-y-4">
                  <button
                    onClick={toggleRecording}
                    className={`flex items-center justify-center w-20 h-20 rounded-full transition-all ${
                      isRecording
                        ? 'bg-red-500 shadow-lg shadow-red-500/30 animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-700 shadow-lg'
                    }`}
                  >
                    <Mic size={32} className="text-white" />
                  </button>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {isRecording
                      ? 'Recording... Tap to stop'
                      : 'Tap to simulate recording a voice note'}
                  </p>
                  {text && !isRecording && (
                    <div className="w-full bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                      <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase mb-1">Transcribed</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{text}</p>
                    </div>
                  )}
                </div>
              )}

              {tab === 'photo' && (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  {photoUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                      <img src={photoUrl} alt="Upload preview" className="w-full h-48 object-cover" />
                      <button
                        onClick={() => {
                          setPhotoUrl(undefined);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center w-full h-48 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-cyan-400 hover:bg-cyan-50/50 dark:hover:bg-slate-800 transition-colors space-y-2"
                    >
                      <ImagePlus size={32} className="text-gray-400 dark:text-slate-500" />
                      <span className="text-sm text-gray-500 dark:text-slate-400">
                        Click to upload a photo
                      </span>
                    </button>
                  )}
                </div>
              )}

              {tab === 'text' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Describe what you witnessed
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={5}
                    placeholder="e.g., 'The street behind the park is very dark at night. Broken streetlights and I saw some suspicious activity near the underpass.'"
                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm rounded-xl border border-gray-200 dark:border-slate-700 px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                    {text.length} characters — be as detailed as possible for better AI analysis
                  </p>
                </div>
              )}

              {tab === 'photo' && photoUrl && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Additional description (optional)
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={2}
                    placeholder="Add context about what's in the photo..."
                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm rounded-xl border border-gray-200 dark:border-slate-700 px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              )}

              {/* Location indicator */}
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 bg-blue-50 dark:bg-blue-950 rounded-lg px-3 py-2">
                <MapPin size={14} className="text-blue-500 dark:text-blue-400" />
                Location will be set near city center. Pin drops automatically.
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <p className="text-xs text-gray-400 dark:text-slate-500">
                AI will analyze urgency & category
              </p>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || processing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-slate-900 font-bold text-sm transition-colors shadow-lg shadow-cyan-500/20"
              >
                {processing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    AI Processing...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Analyze with AI
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${
        active
          ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm'
          : 'text-gray-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function AIResultView({
  result,
  onConfirm,
  onCancel,
}: {
  result: ProcessedReport;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cat = getCategory(result.category)!;
  const sub = cat.subtypes.find((s) => s.id === result.subtype)!;
  const Icon = getIcon(sub.icon);

  const urgencyColors: Record<string, string> = {
    critical: 'bg-red-600',
    high: 'bg-red-500',
    medium: 'bg-amber-500',
    low: 'bg-blue-500',
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
        <Sparkles size={14} />
        AI Analysis Complete
      </div>

      <div
        className="rounded-xl p-4 border-2 space-y-3 dark:bg-slate-800/50"
        style={{ borderColor: cat.color + '40' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex items-center justify-center w-12 h-12 rounded-full text-white"
            style={{ background: cat.color }}
          >
            <Icon size={22} />
          </span>
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400">Category</p>
            <p className="font-bold text-slate-800 dark:text-slate-200">{cat.label}</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">{sub.label}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-slate-300">Urgency Level:</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold text-white ${urgencyColors[result.urgency]}`}
          >
            {result.urgency.toUpperCase()}
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase mb-1">
            Extracted Description
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">{result.description}</p>
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-slate-400 bg-cyan-50 dark:bg-cyan-950 rounded-lg p-3">
        <CheckCircle2 size={16} className="text-cyan-500 dark:text-cyan-400 shrink-0 mt-0.5" />
        <span>
          A new marker will be added to the map at the reported location. The
          incident is categorized and urgency-flagged automatically.
        </span>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
        >
          Edit Report
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-sm transition-colors shadow-lg shadow-cyan-500/20"
        >
          Add to Map
        </button>
      </div>
    </div>
  );
}
