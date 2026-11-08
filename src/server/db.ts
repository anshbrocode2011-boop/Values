import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { BloxFruitItem, ItemCategory, SyncStatus, ValueChange } from '../types';
import { scrapeAllBloxFruitsValues, ScrapingResult } from './scraper';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'bloxfruits_store.json');
export const IMAGES_DIR = path.join(DB_DIR, 'images');
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
    if (!fs.existsSync(IMAGES_DIR)) {
      try {
        fs.mkdirSync(IMAGES_DIR, { recursive: true });
      } catch (err: any) {
        console.error('[DB] Failed to create images cache directory:', err.message);
      }
    }
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const data: DatabaseSchema = JSON.parse(raw);
        if (data && Array.isArray(data.items) && data.items.length > 0) {
          this.items = data.items;
          this.changes = Array.isArray(data.changes) ? data.changes : [];
          if (data.status) {
            this.status = {
              ...data.status,
              status: 'idle',
            };
          }
          console.log(`[DB] Successfully restored ${this.items.length} items from persistent disk.`);
          return;
        }
      }

      // Fallback: If DB_FILE does not exist or was empty, restore from pre-seeded verified initial data
      const seedCandidates = [
        path.resolve(process.cwd(), 'src/data/initial_values.json'),
        path.resolve(__dirname, '../../src/data/initial_values.json'),
        path.resolve(__dirname, '../data/initial_values.json'),
        path.resolve(__dirname, 'initial_values.json'),
      ];

      for (const candidate of seedCandidates) {
        if (fs.existsSync(candidate)) {
          const raw = fs.readFileSync(candidate, 'utf8');
          const data = JSON.parse(raw);
          if (data && Array.isArray(data.items) && data.items.length > 0) {
            this.items = data.items;
            if (data.status) {
              this.status = { ...data.status, status: 'idle' };
            }
            console.log(`[DB] Pre-seeded ${this.items.length} items from bundled initial data.`);
            this.saveToDisk();
            return;
          }
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
        changes: this.changes.slice(0, 150),
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf8');

      // Also update src/data/initial_values.json so initial state remains fresh
      const initialPath = path.resolve(process.cwd(), 'src/data/initial_values.json');
      if (fs.existsSync(path.dirname(initialPath))) {
        fs.writeFileSync(
          initialPath,
          JSON.stringify({ items: this.items, status: this.status }, null, 2),
          'utf8'
        );
      }
    } catch (err: any) {
      console.error(`[DB] Failed to persist data to disk: ${err.message}`);
    }
  }

  /**
   * Downloads and locally syncs all real item images to data/images/
   */
  public async syncImagesLocally(itemsToSync: BloxFruitItem[]): Promise<number> {
    this.ensureDirectory();
    const publicImgDir = path.resolve(process.cwd(), 'public', 'images');
    if (!fs.existsSync(publicImgDir)) {
      try {
        fs.mkdirSync(publicImgDir, { recursive: true });
      } catch {}
    }

    let downloaded = 0;

    // Concurrently process in batches of 6
    const batchSize = 6;
    for (let i = 0; i < itemsToSync.length; i += batchSize) {
      const batch = itemsToSync.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (item) => {
          const itemId = item.itemId;
          if (!itemId) return;
          const destFile = path.join(IMAGES_DIR, `${itemId}.webp`);
          const publicFile = path.join(publicImgDir, `${itemId}.webp`);

          if (fs.existsSync(destFile) && fs.existsSync(publicFile)) return; // Already cached in both

          try {
            const remoteUrl = `https://bloxfruitsvalues.com/api/bloxfruits/item-image/${itemId}`;
            const res = await axios.get(remoteUrl, {
              responseType: 'arraybuffer',
              timeout: 6000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
              },
            });
            if (res.status === 200 && res.data && res.data.length > 0) {
              fs.writeFileSync(destFile, res.data);
              try {
                fs.writeFileSync(publicFile, res.data);
              } catch {}
              downloaded++;
            }
          } catch {
            // Silently continue if single image fails
          }
        })
      );
    }

    if (downloaded > 0) {
      console.log(`[DB] Synced and cached ${downloaded} real item images locally into data/images/`);
    }
    return downloaded;
  }

  public getItems(category?: ItemCategory): BloxFruitItem[] {
    if (!category) return [...this.items];
    return this.items.filter((item) => item.category === category);
  }

  public getStatus(): SyncStatus {
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
   * Performs data and image synchronization.
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

      // Trigger background sync of all real images
      this.syncImagesLocally(this.items).catch((err) =>
        console.warn('[DB] Image sync warning:', err.message)
      );

      console.log(
        `[DB] Sync complete! Total items: ${this.items.length}. Changes detected: ${newChanges.length}`
      );

      return {
        success: true,
        message: `Synchronized ${this.items.length} items and real images from source.`,
        counts: this.status.itemCounts,
      };
    } catch (err: any) {
      console.error(`[DB] Synchronization failed: ${err.message}`);
      this.status.status = 'error';
      this.status.errorMessage = err.message || 'Scraping failed';
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
    this.syncNow().catch((err) => console.error('[DB] Initial sync error:', err.message));

    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => {
      console.log('[DB] Running scheduled 5-minute sync...');
      this.syncNow().catch((err) => console.error('[DB] Scheduled sync error:', err.message));
    }, SYNC_INTERVAL_MS);
  }
}

export const db = new BloxFruitsDatabase();
