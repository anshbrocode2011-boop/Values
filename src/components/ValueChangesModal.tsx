import React from 'react';
import { X, TrendingUp, ArrowRight, Clock } from 'lucide-react';
import { ValueChange } from '../types';
import { formatDateTime } from '../utils/formatters';

interface ValueChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  changes: ValueChange[];
}

export const ValueChangesModal: React.FC<ValueChangesModalProps> = ({
  isOpen,
  onClose,
  changes,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-slate-900 text-base">
                Recent Value Adjustments
              </h3>
              <p className="text-xs text-slate-500">
                Tracked movements from Blox Fruits live market data
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

        {/* Content list */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {changes.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No value changes recorded yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Values are automatically compared against previous synchronization snapshots every 5 minutes.
              </p>
            </div>
          ) : (
            changes.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4 text-xs sm:text-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{c.name}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500 text-xs">{c.category}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-blue-600 font-medium text-xs">{c.field}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {formatDateTime(c.timestamp)}
                  </p>
                </div>

                <div className="flex items-center gap-2 font-mono font-medium text-xs shrink-0">
                  <span className="text-slate-400 line-through">
                    {String(c.oldValue || 'None')}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-900 font-bold bg-white px-2 py-1 rounded border border-slate-200">
                    {String(c.newValue || 'None')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-right">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
