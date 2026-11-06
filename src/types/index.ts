export type ItemCategory = 'Fruits' | 'Gamepasses' | 'Limiteds';

export interface AwakeningPrice {
  c?: string;
  f?: string;
  v?: string;
  x?: string;
  z?: string;
}

export interface BloxFruitItem {
  id: string;
  itemId: string;
  name: string;
  category: ItemCategory;
  rarity: string;
  image: string;
  images: string[];
  physicalValue: number | null;
  physicalValueFormatted: string;
  permanentValue: number | null;
  permanentValueFormatted: string;
  physicalDemand: number | null; // e.g. 9 (/10)
  permanentDemand: number | null; // e.g. 9 (/10)
  physicalTrend: string; // e.g. "Stable", "Overpaid", "Underpaid", "Rising"
  permanentTrend: string;
  beliPrice: number | null;
  beliPriceFormatted: string;
  robuxPrice: number | null;
  fruitType: string; // "Beast", "Natural", "Elemental", or ""
  tradeable: boolean;
  bestUsedFor: string;
  awakeningPrice?: AwakeningPrice;
  updatedAt: string;
  position: number;
  // Change tracking
  previousPhysicalValue?: number | null;
  previousPermanentValue?: number | null;
  previousDemand?: number | null;
  previousTrend?: string;
  lastChangedAt?: string;
}

export interface ValueChange {
  id: string;
  itemId: string;
  name: string;
  category: ItemCategory;
  field: string;
  oldValue: string | number | null;
  newValue: string | number | null;
  timestamp: string;
}

export interface SyncStatus {
  lastSyncAttempt: string | null;
  lastSuccessfulSync: string | null;
  status: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage?: string;
  sourceUrl: string;
  syncIntervalMinutes: number;
  itemCounts: {
    total: number;
    fruits: number;
    gamepasses: number;
    limiteds: number;
  };
  missingCategories?: string[];
  isStale: boolean;
}
