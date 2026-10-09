import React from 'react';
import { Cloud, CheckCircle2, AlertCircle, Loader2, X, RefreshCw } from 'lucide-react';
import { UploadProgressEvent, UploadStatus } from '../../services/r2UploadService';

interface R2UploadProgressBarProps {
  fileName: string;
  fileType?: 'image' | 'pdf' | 'video' | 'generic';
  progress: UploadProgressEvent | null;
  status: UploadStatus;
  errorMessage?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  bucketName?: string;
}

export const R2UploadProgressBar: React.FC<R2UploadProgressBarProps> = ({
  fileName,
  fileType = 'generic',
  progress,
  status,
  errorMessage,
  onCancel,
  onRetry,
  bucketName = 'aniixa-chemicals-storage',
}) => {
  const percent = progress?.percent ?? (status === 'completed' ? 100 : 0);

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return `Wird zu Cloudflare R2 übertragen (${bucketName})...`;
      case 'verifying':
        return 'Prüfsumme & R2-Speicherung wird verifiziert...';
      case 'completed':
        return `Erfolgreich in Cloudflare R2 gespeichert (${bucketName})`;
      case 'error':
        return errorMessage || 'Upload zu Cloudflare R2 fehlgeschlagen';
      default:
        return 'Wartet auf Übertragung...';
    }
  };

  const getBadgeColor = () => {
    switch (status) {
      case 'completed':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80';
      case 'error':
        return 'text-rose-400 bg-rose-950/60 border-rose-800/80';
      case 'verifying':
        return 'text-cyan-400 bg-cyan-950/60 border-cyan-800/80';
      default:
        return 'text-emerald-400 bg-emerald-950/50 border-emerald-800/60';
    }
  };

  return (
    <div className="w-full bg-slate-950/90 rounded-xl p-3 border border-slate-800/80 shadow-md space-y-2.5 animate-in fade-in duration-200">
      {/* Top Header: File Info & Percentage */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
            {status === 'completed' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : status === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <Cloud className="w-4 h-4 text-emerald-400 animate-pulse" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-white truncate max-w-[220px] sm:max-w-[340px]" title={fileName}>
              {fileName}
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <span>{getStatusText()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Percentage badge */}
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${getBadgeColor()}`}>
            {status === 'verifying' ? (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>R2 Check</span>
              </span>
            ) : (
              `${percent}%`
            )}
          </span>

          {/* Action Button: Cancel or Retry */}
          {status === 'uploading' && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-md transition-colors"
              title="Upload abbrechen"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {status === 'error' && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 rounded-md transition-colors"
              title="Erneut versuchen"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Animated Glowing Progress Bar Track */}
      <div className="relative w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
        <div
          className={`h-full transition-all duration-300 ease-out relative ${
            status === 'error'
              ? 'bg-rose-500'
              : status === 'completed'
              ? 'bg-emerald-500'
              : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400'
          }`}
          style={{ width: `${Math.max(3, percent)}%` }}
        >
          {/* Shimmer / animated stripe effect when uploading */}
          {(status === 'uploading' || status === 'verifying') && (
            <div className="absolute inset-0 bg-white/20 animate-pulse w-full h-full" />
          )}
        </div>
      </div>

      {/* Transfer Stats Footer (Speed, Size, ETA) */}
      {progress && status === 'uploading' && (
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
          <span>{progress.sizeFormatted}</span>
          <div className="flex items-center gap-2">
            {progress.speedFormatted && (
              <span className="text-emerald-400/90">{progress.speedFormatted}</span>
            )}
            {progress.etaSeconds !== undefined && progress.etaSeconds > 0 && (
              <span className="text-slate-500">· ca. {progress.etaSeconds}s verbleibend</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
