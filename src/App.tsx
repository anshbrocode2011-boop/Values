import React, { useState, useEffect, useCallback } from 'react';
import { Settings, ShieldCheck, Clock, Layers } from 'lucide-react';
import { BloxFruitItem, SyncStatus, ValueChange, ItemCategory } from './types';
import { Header } from './components/Header';
import { HeroShowcase } from './components/HeroShowcase';
import { CategoryIndicators } from './components/CategoryIndicators';
import { ItemsTable } from './components/ItemsTable';
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
      // If server returned 5xx, wait and retry
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
  // Pre-seed with verified data so UI renders instantly without waiting
  const [items, setItems] = useState<BloxFruitItem[]>((initialData?.items as BloxFruitItem[]) || []);
  const [status, setStatus] = useState<SyncStatus | null>((initialData?.status as SyncStatus) || null);
  const [changes, setChanges] = useState<ValueChange[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [tableSearch, setTableSearch] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isChangesModalOpen, setIsChangesModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Fetch items and sync status from backend with resilient retry
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
      // Only set visible error banner if we have NO items loaded at all
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

  // Handle manual sync refresh / update latest values
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

  // Scroll to and filter item in database table
  const handleSelectItemFromHero = (item: BloxFruitItem) => {
    setSelectedCategory('all');
    setTableSearch(item.name);
    const el = document.getElementById('database-table');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fruitsCount = items.filter((i) => i.category === 'Fruits').length;
  const gamepassesCount = items.filter((i) => i.category === 'Gamepasses').length;
  const limitedsCount = items.filter((i) => i.category === 'Limiteds').length;

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        lastSync={status?.lastSuccessfulSync || null}
        isSyncing={isSyncing}
        onRefresh={handleRefresh}
        onOpenChanges={() => setIsChangesModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        hasChanges={changes.length > 0}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {/* Error / Warning Alert */}
        {errorMessage && (
          <AlertBanner
            type="error"
            title="Synchronization Alert"
            message={errorMessage}
            onDismiss={() => setErrorMessage(null)}
          />
        )}

        {/* Sync Success Feedback */}
        {syncSuccessMessage && (
          <AlertBanner
            type="success"
            title="Values Updated"
            message={syncSuccessMessage}
            onDismiss={() => setSyncSuccessMessage(null)}
          />
        )}

        {/* Stale Data Warning */}
        {status?.isStale && (
          <AlertBanner
            type="warning"
            title="Data May Be Stale"
            message={`Last successful sync was ${formatRelativeTime(
              status.lastSuccessfulSync
            )}. Use "Settings -> Update Latest Values" to trigger an immediate update.`}
          />
        )}

        {/* Missing Categories Alert */}
        {status?.missingCategories && status.missingCategories.length > 0 && (
          <AlertBanner
            type="warning"
            title="Incomplete Categories Detected"
            message={`The source website did not respond for the following categories: ${status.missingCategories.join(
              ', '
            )}. Available verified items are displayed below.`}
          />
        )}

        {/* Top Header Info Bar */}
        <div className="py-2 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Complete Values Report
              </h1>
              <p className="mt-1 text-sm text-slate-600 max-w-xl leading-relaxed">
                Live Blox Fruits trading values database and real-time market valuations.
              </p>
            </div>

            {/* Sync Metadata & Settings Trigger */}
            <div className="text-xs text-slate-500 sm:text-right font-normal space-y-1 mt-2 sm:mt-0">
              <div className="flex items-center gap-1 sm:justify-end">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Last Synced: </span>
                <span className="font-semibold text-slate-800">
                  {status?.lastSuccessfulSync ? formatRelativeTime(status.lastSuccessfulSync) : 'Synchronizing...'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {status?.lastSuccessfulSync ? formatDateTime(status.lastSuccessfulSync) : 'Auto-updates every 5 mins'}
              </p>
            </div>
          </div>

          {/* Key Metric Bar */}
          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-500 mt-3">
            <div className="flex items-center gap-1.5 font-medium text-slate-800">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Total items detected:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {items.length}
              </span>
            </div>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>Fruits: <strong className="text-slate-800 font-mono">{fruitsCount}</strong></span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>Gamepasses: <strong className="text-slate-800 font-mono">{gamepassesCount}</strong></span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>Limiteds: <strong className="text-slate-800 font-mono">{limitedsCount}</strong></span>
          </div>
        </div>

        {/* Interactive Blox Fruits Hero Showcase */}
        <HeroShowcase
          items={items}
          onSelectItem={handleSelectItemFromHero}
        />

        {/* Three Category Indicators */}
        <CategoryIndicators
          fruitsCount={fruitsCount}
          gamepassesCount={gamepassesCount}
          limitedsCount={limitedsCount}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {/* Quick Sync & Settings Status Bar */}
        <div className="my-5 p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Real-time values synchronized directly from{' '}
              <a
                href="https://bloxfruitsvalues.com/values"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:underline"
              >
                bloxfruitsvalues.com
              </a>
            </span>
          </div>

          <button
            onClick={() => setIsSettingsModalOpen(true)}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium transition-colors shadow-2xs cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Sync Settings</span>
          </button>
        </div>

        {/* Interactive Items Table Explorer */}
        <ItemsTable
          items={items}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          externalSearch={tableSearch}
          onClearExternalSearch={() => setTableSearch('')}
        />
      </main>

      {/* Value Changes Modal */}
      <ValueChangesModal
        isOpen={isChangesModalOpen}
        onClose={() => setIsChangesModalOpen(false)}
        changes={changes}
      />

      {/* Settings Modal (Containing "Update Latest Values" button) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        status={status}
        isSyncing={isSyncing}
        onUpdateLatestValues={handleRefresh}
      />

      {/* Minimal Footer */}
      <footer className="border-t border-slate-200/80 bg-slate-50/50 py-6 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            Blox Fruits Values Report · Real-time market valuations
          </p>
          <a
            href="https://bloxfruitsvalues.com/values"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline font-medium"
          >
            Source: bloxfruitsvalues.com/values
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
