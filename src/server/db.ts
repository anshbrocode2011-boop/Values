import fs from 'fs';
import path from 'path';
import { BloxFruitItem, ItemCategory, SyncStatus, ValueChange } from '../types';
import { scrapeAllBloxFruitsValues, ScrapingResult } from './scraper';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'bloxfruits_store.json');
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface DatabaseSchema {
  items: BloxFruitItem[];
  status: SyncStatus;
  changes: ValueChange[];
}

class BloxFruitsDatabase {
  private items: BloxFruitItem[] = [];
  private status: SyncStatus = {
    lastSyncAttempt: null,
    lastSuccessfulSync: null,
    status: 'idle',
    sourceUrl: 'https://bloxfruitsvalues.com/values',
    syncIntervalMinutes: 5,
    itemCounts: {
      total: 0,
      fruits: 0,
      gamepasses: 0,
      limiteds: 0,
    },
    isStale: false,
  };
  private changes: ValueChange[] = [];
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;

  constructor() {
    this.ensureDirectory();
    this.loadFromDisk();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DB_DIR)) {
      try {
        fs.mkdirSync(DB_DIR, { recursive: true });
      } catch (err: any) {
        console.error('[DB] Failed to create data directory:', err.message);
      }
    }
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const data: DatabaseSchema = JSON.parse(raw);
        if (data && Array.isArray(data.items)) {
          this.items = data.items;
          this.changes = Array.isArray(data.changes) ? data.changes : [];
          if (data.status) {
            this.status = {
              ...data.status,
              status: 'idle', // Reset active status on reboot
            };
          }
          console.log(`[DB] Successfully restored ${this.items.length} items from persistent disk.`);
        }
      }
    } catch (err: any) {
      console.warn(`[DB] Could not load stored database file: ${err.message}`);
    }
  }

  private saveToDisk() {
    try {
      this.ensureDirectory();
      const payload: DatabaseSchema = {
        items: this.items,
        status: this.status,
        changes: this.changes.slice(0, 150), // Keep latest 150 changes
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf8');
    } catch (err: any) {
      console.error(`[DB] Failed to persist data to disk: ${err.message}`);
    }
  }

  public getItems(category?: ItemCategory): BloxFruitItem[] {
    if (!category) return [...this.items];
    return this.items.filter((item) => item.category === category);
  }

  public getStatus(): SyncStatus {
    // Check if data is stale (older than 15 minutes without successful sync)
    const isStale =
      !this.status.lastSuccessfulSync ||
      Date.now() - new Date(this.status.lastSuccessfulSync).getTime() > 15 * 60 * 1000;

    return {
      ...this.status,
      isStale,
      itemCounts: {
        total: this.items.length,
        fruits: this.items.filter((i) => i.category === 'Fruits').length,
        gamepasses: this.items.filter((i) => i.category === 'Gamepasses').length,
        limiteds: this.items.filter((i) => i.category === 'Limiteds').length,
      },
    };
  }

  public getChanges(): ValueChange[] {
    return [...this.changes];
  }

  /**
   * Performs data synchronization, detecting changes and updating persistent store.
   */
  public async syncNow(): Promise<{ success: boolean; message: string; counts: any }> {
    if (this.isSyncing) {
      return {
        success: false,
        message: 'Synchronization already in progress.',
        counts: this.status.itemCounts,
      };
    }

    this.isSyncing = true;
    this.status.status = 'syncing';
    this.status.lastSyncAttempt = new Date().toISOString();

    try {
      console.log('[DB] Starting synchronization from https://bloxfruitsvalues.com...');
      const result: ScrapingResult = await scrapeAllBloxFruitsValues();

      if (result.all.length === 0) {
        throw new Error('Scraper returned 0 items. Possible blocking or site downtime.');
      }

      // Track item changes compared to existing dataset
      const existingMap = new Map<string, BloxFruitItem>();
      for (const item of this.items) {
        existingMap.set(`${item.category}-${item.name.toLowerCase()}`, item);
      }

      const nowIso = new Date().toISOString();
      const newChanges: ValueChange[] = [];

      const updatedItems: BloxFruitItem[] = result.all.map((freshItem) => {
        const key = `${freshItem.category}-${freshItem.name.toLowerCase()}`;
        const prev = existingMap.get(key);

        if (prev) {
          freshItem.previousPhysicalValue = prev.physicalValue;
          freshItem.previousPermanentValue = prev.permanentValue;
          freshItem.previousDemand = prev.physicalDemand;
          freshItem.previousTrend = prev.physicalTrend;

          // Check physical value change
          if (
            freshItem.physicalValue !== null &&
            prev.physicalValue !== null &&
            freshItem.physicalValue !== prev.physicalValue
          ) {
            newChanges.push({
              id: `${freshItem.id}-val-${Date.now()}`,
              itemId: freshItem.itemId,
              name: freshItem.name,
              category: freshItem.category,
              field: 'Physical Value',
              oldValue: prev.physicalValueFormatted,
              newValue: freshItem.physicalValueFormatted,
              timestamp: nowIso,
            });
            freshItem.lastChangedAt = nowIso;
          }

          // Check permanent value change
          if (
            freshItem.permanentValue !== null &&
            prev.permanentValue !== null &&
            freshItem.permanentValue !== prev.permanentValue
          ) {
            newChanges.push({
              id: `${freshItem.id}-perm-${Date.now()}`,
              itemId: freshItem.itemId,
              name: freshItem.name,
              category: freshItem.category,
              field: 'Permanent Value',
              oldValue: prev.permanentValueFormatted,
              newValue: freshItem.permanentValueFormatted,
              timestamp: nowIso,
            });
            freshItem.lastChangedAt = nowIso;
          }

          // Check trend change
          if (freshItem.physicalTrend && prev.physicalTrend && freshItem.physicalTrend !== prev.physicalTrend) {
            newChanges.push({
              id: `${freshItem.id}-trend-${Date.now()}`,
              itemId: freshItem.itemId,
              name: freshItem.name,
              category: freshItem.category,
              field: 'Trend',
              oldValue: prev.physicalTrend,
              newValue: freshItem.physicalTrend,
              timestamp: nowIso,
            });
            freshItem.lastChangedAt = nowIso;
          }
        }

        return freshItem;
      });

      this.items = updatedItems;
      if (newChanges.length > 0) {
        this.changes = [...newChanges, ...this.changes].slice(0, 150);
      }

      this.status.lastSuccessfulSync = nowIso;
      this.status.status = 'success';
      this.status.missingCategories = result.missingCategories;
      this.status.errorMessage = undefined;
      this.status.itemCounts = {
        total: this.items.length,
        fruits: this.items.filter((i) => i.category === 'Fruits').length,
        gamepasses: this.items.filter((i) => i.category === 'Gamepasses').length,
        limiteds: this.items.filter((i) => i.category === 'Limiteds').length,
      };

      this.saveToDisk();

      console.log(
        `[DB] Sync complete! Total: ${this.items.length} (Fruits: ${this.status.itemCounts.fruits}, Gamepasses: ${this.status.itemCounts.gamepasses}, Limiteds: ${this.status.itemCounts.limiteds}). Changes detected: ${newChanges.length}`
      );

      return {
        success: true,
        message: `Synchronized ${this.items.length} items from source.`,
        counts: this.status.itemCounts,
      };
    } catch (err: any) {
      console.error(`[DB] Synchronization failed: ${err.message}`);
      this.status.status = 'error';
      this.status.errorMessage = err.message || 'Scraping failed';
      // Preserve previous items as per requirements:
      // "Preserve the previous successful dataset if scraping fails."
      return {
        success: false,
        message: `Sync failed: ${err.message}. Previous cached dataset preserved.`,
        counts: this.status.itemCounts,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  public startAutoSync() {
    // Initial run immediately
    this.syncNow().catch((err) => console.error('[DB] Initial sync error:', err.message));

    // Recurring run every 5 minutes
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => {
      console.log('[DB] Running scheduled 5-minute sync...');
      this.syncNow().catch((err) => console.error('[DB] Scheduled sync error:', err.message));
    }, SYNC_INTERVAL_MS);
  }
}

export const db = new BloxFruitsDatabase();
