import React, { useState } from 'react';
import { X, Settings, RefreshCw, CheckCircle2, Clock, Database, Globe, AlertCircle } from 'lucide-react';
import { SyncStatus } from '../types';
import { formatDateTime, formatRelativeTime } from '../utils/formatters';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SyncStatus | null;
  isSyncing: boolean;
  onUpdateLatestValues: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  status,
  isSyncing,
  onUpdateLatestValues,
}) => {
  const [updateFeedback, setUpdateFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdate = async () => {
    setUpdateFeedback(null);
    try {
      await onUpdateLatestValues();
      setUpdateFeedback('Latest values updated successfully!');
      setTimeout(() => setUpdateFeedback(null), 4000);
    } catch {
      setUpdateFeedback('Failed to update values. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Settings className="w-4 h-4 text-slate-700" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Database &amp; Sync Settings
              </h3>
              <p className="text-xs text-slate-500">
                Manage data synchronization and source updates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5">
          {/* Main Action Section: Update Latest Values */}
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-semibold text-slate-900 text-sm">
                  Manual Value Synchronization
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Fetch the newest trading valuations, demand ratings, and trends directly from the source database.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={handleUpdate}
                disabled={isSyncing}
                type="button"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Updating Values from Source...' : 'Update Latest Values'}</span>
              </button>
            </div>

            {updateFeedback && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{updateFeedback}</span>
              </div>
            )}
          </div>

          {/* Sync Information Details */}
          <div className="space-y-3 text-xs">
            <h5 className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
              Connection &amp; Status Info
            </h5>

            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-slate-50/50 overflow-hidden">
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>Last Successful Sync:</span>
                </div>
                <span className="font-mono font-medium text-slate-900">
                  {status?.lastSuccessfulSync ? formatDateTime(status.lastSuccessfulSync) : 'Never'}
                </span>
              </div>

              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <RefreshCw className="w-4 h-4 text-slate-400" />
                  <span>Auto-Sync Frequency:</span>
                </div>
                <span className="font-medium text-slate-900">
                  Every 5 minutes (automatic)
                </span>
              </div>

              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <Database className="w-4 h-4 text-slate-400" />
                  <span>Tracked Items:</span>
                </div>
                <span className="font-mono font-medium text-slate-900">
                  {status?.itemCounts.total || 0} items ({status?.itemCounts.fruits || 0} fruits, {status?.itemCounts.gamepasses || 0} passes, {status?.itemCounts.limiteds || 0} limiteds)
                </span>
              </div>

              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span>Source URL:</span>
                </div>
                <a
                  href="https://bloxfruitsvalues.com/values"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-mono"
                >
                  bloxfruitsvalues.com/values
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
