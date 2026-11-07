import React from 'react';
import { Settings, RefreshCw, History, ExternalLink, Scale, Sparkles, Gem } from 'lucide-react';

export type AppMode = 'values' | 'calculator';

interface HeaderProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  lastSync: string | null;
  isSyncing: boolean;
  onRefresh: () => void;
  onOpenChanges: () => void;
  onOpenSettings: () => void;
  hasChanges: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onModeChange,
  lastSync,
  isSyncing,
  onRefresh,
  onOpenChanges,
  onOpenSettings,
  hasChanges,
}) => {
  return (
    <header className="border-b border-slate-200/90 bg-white sticky top-0 z-30 shadow-2xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Logo and Subtitle */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-sm">
            BF
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 tracking-tight text-sm sm:text-base">
                Blox Fruits
              </span>
              <span className="text-[10px] text-emerald-600 font-bold hidden sm:inline-flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Values
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-normal leading-none hidden sm:block">
              Market Values &amp; Trade Calc
            </p>
          </div>
        </div>

        {/* Center Mode Switcher: Values List vs Trading Calculator */}
        <div className="flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 shadow-2xs">
          <button
            onClick={() => onModeChange('values')}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentMode === 'values'
                ? 'bg-white text-blue-700 shadow-2xs ring-1 ring-slate-200/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Gem className="w-3.5 h-3.5 text-blue-600" />
            <span>Values</span>
          </button>

          <button
            onClick={() => onModeChange('calculator')}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentMode === 'calculator'
                ? 'bg-white text-blue-700 shadow-2xs ring-1 ring-slate-200/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-blue-600" />
            <span>Calculator</span>
          </button>
        </div>

        {/* Action Controls & Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0">
          <button
            onClick={onOpenChanges}
            type="button"
            className="hidden md:flex items-center gap-1.5 py-1.5 px-2.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors cursor-pointer"
            title="View recent value adjustments"
          >
            <History className="w-3.5 h-3.5" />
            <span>Changes</span>
            {hasChanges && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
          </button>

          <button
            onClick={onRefresh}
            disabled={isSyncing}
            type="button"
            className="flex items-center gap-1 py-1.5 px-2.5 sm:px-3 text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-lg font-medium transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            title="Sync latest values from source"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>

          <button
            onClick={onOpenSettings}
            type="button"
            className="p-1.5 sm:px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer flex items-center gap-1"
            title="Open Settings"
          >
            <Settings className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
