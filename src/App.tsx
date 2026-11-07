import React, { useState, useEffect, useCallback } from 'react';
import { Settings, ShieldCheck, Clock, Layers, Scale, Gem, ExternalLink, RefreshCw } from 'lucide-react';
import { BloxFruitItem, SyncStatus, ValueChange, ItemCategory } from './types';
import { Header, AppMode } from './components/Header';
import { FruitCardGrid } from './components/FruitCardGrid';
import { TradingCalculator } from './components/TradingCalculator';
import { AlertBanner } from './components/AlertBanner';
import { ValueChangesModal } from './components/ValueChangesModal';
import { SettingsModal } from './components/SettingsModal';
import { formatDateTime, formatRelativeTime } from './utils/formatters';
import initialData from './data/initial_values.json';

// Helper for resilient fetching with automatic retry on transient network drops
async function fetchWithRetry(url: string, options?: RequestInit, retries = 3, delay = 800): Promise<Response> {
  let lastError: any = null;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status >= 500 && i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  throw lastError || new Error(`Network request failed for ${url}`);
}

export function App() {
  const [activeMode, setActiveMode] = useState<AppMode>('values');
  // Pre-seed with verified data so UI renders instantly without waiting
  const [items, setItems] = useState<BloxFruitItem[]>((initialData?.items as BloxFruitItem[]) || []);
  const [status, setStatus] = useState<SyncStatus | null>((initialData?.status as SyncStatus) || null);
  const [changes, setChanges] = useState<ValueChange[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [prefilledTradeItem, setPrefilledTradeItem] = useState<{
    item: BloxFruitItem;
    target: 'you' | 'them';
  } | null>(null);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isChangesModalOpen, setIsChangesModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Fetch items and sync status from backend
  const loadData = useCallback(async (isSilent = false) => {
    try {
      // 1. Fetch values
      const valRes = await fetchWithRetry('/api/values', undefined, isSilent ? 2 : 3);
      if (valRes.ok) {
        const valData = await valRes.json();
        if (Array.isArray(valData.items) && valData.items.length > 0) {
          setItems(valData.items);
        }
        if (valData.status) {
          setStatus(valData.status);
        }
        setErrorMessage(null);
      }

      // 2. Fetch changes
      try {
        const changesRes = await fetchWithRetry('/api/changes', undefined, 2);
        if (changesRes.ok) {
          const cData = await changesRes.json();
          if (Array.isArray(cData.changes)) {
            setChanges(cData.changes);
          }
        }
      } catch {
        // non-blocking
      }
    } catch (err: any) {
      console.warn('Background sync warning:', err.message);
      if (items.length === 0) {
        setErrorMessage(
          'Connecting to backend live values database... Click "Sync Settings -> Update Latest Values" if needed.'
        );
      }
    }
  }, [items.length]);

  useEffect(() => {
    loadData(false);
    // Background polling every 30 seconds
    const interval = setInterval(() => {
      loadData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Pre-warm browser image cache for rapid instant display
  useEffect(() => {
    if (items.length > 0) {
      const prefetchList = items.slice(0, 32);
      prefetchList.forEach((item) => {
        if (item.itemId) {
          const img = new Image();
          img.src = `/images/${item.itemId}.webp`;
        }
      });
    }
  }, [items]);

  // Handle manual sync refresh
  const handleRefresh = async () => {
    setIsSyncing(true);
    setErrorMessage(null);
    setSyncSuccessMessage(null);
    try {
      const res = await fetchWithRetry('/api/refresh', { method: 'POST' }, 2);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Synchronization failed.');
      }
      await loadData(true);
      setSyncSuccessMessage(`Successfully updated ${data.counts?.total || 93} items with latest values!`);
      setTimeout(() => setSyncSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Manual refresh failed:', err);
      setErrorMessage(`Manual refresh failed: ${err.message}. Previous cached values remain available.`);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Add item directly to calculator from values list
  const handleAddToCalculator = (item: BloxFruitItem, side: 'you' | 'them') => {
    setPrefilledTradeItem({ item, target: side });
    setActiveMode('calculator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fruitsCount = items.filter((i) => i.category === 'Fruits').length;
  const gamepassesCount = items.filter((i) => i.category === 'Gamepasses').length;
  const limitedsCount = items.filter((i) => i.category === 'Limiteds').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Header with Mode Switcher */}
      <Header
        currentMode={activeMode}
        onModeChange={setActiveMode}
        lastSync={status?.lastSuccessfulSync || null}
        isSyncing={isSyncing}
        onRefresh={handleRefresh}
        onOpenChanges={() => setIsChangesModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        hasChanges={changes.length > 0}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-3.5 sm:px-6 py-5 sm:py-7">
        {/* Alerts & Notifications */}
        {errorMessage && (
          <AlertBanner
            type="error"
            title="Synchronization Alert"
            message={errorMessage}
            onDismiss={() => setErrorMessage(null)}
          />
        )}

        {syncSuccessMessage && (
          <AlertBanner
            type="success"
            title="Values Updated"
            message={syncSuccessMessage}
            onDismiss={() => setSyncSuccessMessage(null)}
          />
        )}

        {/* Top Hero Option Banner (Option between Calculator or Values) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {activeMode === 'values' ? 'Blox Fruits Live Values' : 'Blox Fruits Trading Calculator'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {activeMode === 'values'
                  ? 'Real-time trading valuations, demand ratings, and market trends for all fruits & items.'
                  : 'Calculate fair trades, evaluate Win/Fair/Lose outcomes, and check in-game 40% Beli limits.'}
              </p>
            </div>

            {/* Mode Option Buttons */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl self-start sm:self-auto border border-slate-200/70">
              <button
                onClick={() => setActiveMode('values')}
                type="button"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeMode === 'values'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Gem className="w-3.5 h-3.5" />
                <span>Values List</span>
              </button>

              <button
                onClick={() => setActiveMode('calculator')}
                type="button"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeMode === 'calculator'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Trade Calculator</span>
              </button>
            </div>
          </div>

          {/* Status Metrics Bar */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-y-2 gap-x-4 text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span>Total: <strong className="text-slate-800 font-mono">{items.length}</strong></span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>Fruits: <strong className="text-slate-800 font-mono">{fruitsCount}</strong></span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>Gamepasses: <strong className="text-slate-800 font-mono">{gamepassesCount}</strong></span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>Limiteds: <strong className="text-slate-800 font-mono">{limitedsCount}</strong></span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Last Synced: </span>
              <strong className="text-slate-700 font-medium">
                {status?.lastSuccessfulSync ? formatRelativeTime(status.lastSuccessfulSync) : 'Live'}
              </strong>
            </div>
          </div>
        </div>

        {/* View Content: Either Values Feed (One by One) or Trading Calculator */}
        {activeMode === 'values' ? (
          <FruitCardGrid
            items={items}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            onAddToCalculator={handleAddToCalculator}
          />
        ) : (
          <TradingCalculator
            items={items}
            prefilledItem={prefilledTradeItem}
            onClearPrefilled={() => setPrefilledTradeItem(null)}
            onOfferFullWarning={(side) => {
              setErrorMessage(
                `${side === 'you' ? 'Your' : 'Their'} trade offer is full (Max 4 items allowed per trade). Remove an item to add another.`
              );
              setTimeout(() => setErrorMessage(null), 4000);
            }}
          />
        )}
      </main>

      {/* Value Changes Modal */}
      <ValueChangesModal
        isOpen={isChangesModalOpen}
        onClose={() => setIsChangesModalOpen(false)}
        changes={changes}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        status={status}
        isSyncing={isSyncing}
        onUpdateLatestValues={handleRefresh}
      />

      {/* Minimal Footer */}
      <footer className="border-t border-slate-200/90 bg-white py-6 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            Blox Fruits Values &amp; Trading Calculator · Real-time market valuations &amp; W/F/L calculations
          </p>
          <div className="flex items-center gap-3">
            <a
              href="https://bloxfruitsvalues.com/values"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1"
            >
              <span>Source Database</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
