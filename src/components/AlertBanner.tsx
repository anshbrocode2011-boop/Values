import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface AlertBannerProps {
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  details?: string[];
  onDismiss?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type,
  title,
  message,
  details,
  onDismiss,
}) => {
  const styles = {
    error: 'bg-red-50 border-red-200 text-red-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  };

  const icons = {
    error: <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
    info: <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
  };

  return (
    <div className={`p-4 rounded-xl border ${styles[type]} shadow-2xs mb-6 flex gap-3 text-sm`}>
      {icons[type]}
      <div className="flex-1">
        <h4 className="font-semibold text-sm leading-tight">{title}</h4>
        <p className="mt-1 text-xs sm:text-sm leading-relaxed opacity-90">{message}</p>
        {details && details.length > 0 && (
          <ul className="mt-2 list-disc list-inside text-xs space-y-0.5">
            {details.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          type="button"
          className="text-slate-400 hover:text-slate-600 p-1 self-start"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
