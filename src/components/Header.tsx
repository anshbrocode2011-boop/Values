import React from 'react';
import { Settings, RefreshCw, History, ExternalLink } from 'lucide-react';

interface HeaderProps {
  lastSync: string | null;
  isSyncing: boolean;
  onRefresh: () => void;
  onOpenChanges: () => void;
  onOpenSettings: () => void;
  hasChanges: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  lastSync,
  isSyncing,
  onRefresh,
  onOpenChanges,
  onOpenSettings,
  hasChanges,
}) => {
  return (
    <header className="border-b border-slate-200/80 bg-white sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo and Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
            BF
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                Blox Fruits Values
              </span>
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 hidden sm:inline-flex">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal">
              Live Value Database
            </p>
          </div>
        </div>

        {/* Action Controls & External Link */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          <a
            href="https://bloxfruitsvalues.com/values"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors py-1.5 px-2.5 rounded-md hover:bg-slate-100"
            title="Open official source"
          >
            <span>Source</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onOpenChanges}
            type="button"
            className="flex items-center gap-1.5 py-1.5 px-2.5 sm:px-3 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md font-medium transition-colors cursor-pointer"
            title="View recent value adjustments"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Recent Changes</span>
            {hasChanges && (
              <span className="w-2 h-2 rounded-full bg-blue-600" />
            )}
          </button>

          {/* Quick Sync Button */}
          <button
            onClick={onRefresh}
            disabled={isSyncing}
            type="button"
            className="flex items-center gap-1.5 py-1.5 px-3 text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-md font-medium transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            title="Refresh values from source"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            type="button"
            className="flex items-center gap-1.5 py-1.5 px-2.5 sm:px-3 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md font-medium transition-colors cursor-pointer"
            title="Open Database & Sync Settings"
          >
            <Settings className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
