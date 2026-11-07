import axios from 'axios';
import * as cheerio from 'cheerio';
import { BloxFruitItem, ItemCategory } from '../types';
import { formatValue } from '../utils/formatters';

const BASE_URL = 'https://bloxfruitsvalues.com';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 12000,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json, text/html, application/xhtml+xml, */*',
    'Accept-Language': 'en-US,en;q=0.9',
  },
});

interface RawSourceItem {
  id: string;
  itemId?: string;
  name: string;
  category: string;
  rarity?: string;
  value?: string;
  trend?: string;
  demand?: number;
  image?: string;
  updatedAt?: string;
  position?: number;
  metadata?: {
    hype?: number;
    tier?: string;
    type?: string;
    regTrend?: string;
    regValue?: number | null;
    beliPrice?: number | null;
    fruitType?: string;
    permTrend?: string;
    permValue?: number | null;
    regDemand?: number | null;
    permDemand?: number | null;
    robuxPrice?: number | null;
    tradeable?: boolean;
    bestUsedFor?: string;
    awakeningPrice?: {
      c?: string;
      f?: string;
      v?: string;
      x?: string;
      z?: string;
    };
  };
}

/**
 * Normalizes a raw source item into our standardized BloxFruitItem model.
 */
function normalizeItem(raw: RawSourceItem, fallbackCategory: ItemCategory): BloxFruitItem {
  const meta = raw.metadata || {};
  const itemId = raw.itemId || String(raw.position || '');

  // Extract and build robust image sources
  const candidateImages: string[] = [];

  // Local static and synced endpoints on our server
  if (itemId) {
    candidateImages.push(`/images/${itemId}.webp`);
    candidateImages.push(`/api/bloxfruits/item-image/${itemId}`);
    // Remote official source fallback
    candidateImages.push(`https://bloxfruitsvalues.com/api/bloxfruits/item-image/${itemId}`);
  }

  // Parse raw image string (might be comma-separated or relative or postimg)
  const rawImage = raw.image || '';
  const rawImages = rawImage
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const img of rawImages) {
    if (img.startsWith('http')) {
      if (!candidateImages.includes(img)) candidateImages.push(img);
    } else if (img.startsWith('/')) {
      const fullUrl = `https://bloxfruitsvalues.com${img}`;
      if (!candidateImages.includes(fullUrl)) candidateImages.push(fullUrl);
    }
  }

  const primaryImage = candidateImages.length > 0
    ? candidateImages[0]
    : (itemId ? `/api/bloxfruits/item-image/${itemId}` : '');

  // Category normalization
  let category: ItemCategory = fallbackCategory;
  const rawCat = (raw.category || '').toLowerCase();
  if (rawCat.includes('fruit')) category = 'Fruits';
  else if (rawCat.includes('gamepass')) category = 'Gamepasses';
  else if (rawCat.includes('limited')) category = 'Limiteds';

  const regVal = meta.regValue !== undefined ? meta.regValue : null;
  const permVal = meta.permValue !== undefined ? meta.permValue : null;
  const beliVal = meta.beliPrice !== undefined ? meta.beliPrice : null;

  return {
    id: raw.id || `${category.toLowerCase()}-${raw.name.toLowerCase().replace(/\s+/g, '-')}`,
    itemId,
    name: raw.name ? raw.name.trim() : 'Unknown Item',
    category,
    rarity: meta.tier || raw.rarity || 'Common',
    image: primaryImage,
    images: candidateImages,
    physicalValue: regVal,
    physicalValueFormatted: formatValue(regVal),
    permanentValue: permVal,
    permanentValueFormatted: formatValue(permVal),
    physicalDemand: meta.regDemand !== undefined && meta.regDemand !== null ? meta.regDemand : (raw.demand ?? null),
    permanentDemand: meta.permDemand !== undefined && meta.permDemand !== null ? meta.permDemand : null,
    physicalTrend: meta.regTrend || raw.trend || 'Stable',
    permanentTrend: meta.permTrend || 'Stable',
    beliPrice: beliVal,
    beliPriceFormatted: formatValue(beliVal, true),
    robuxPrice: meta.robuxPrice ?? null,
    fruitType: meta.fruitType || '',
    tradeable: meta.tradeable !== false,
    bestUsedFor: meta.bestUsedFor || '',
    awakeningPrice: meta.awakeningPrice,
    updatedAt: raw.updatedAt ? raw.updatedAt.replace(/^\$D/, '') : new Date().toISOString(),
    position: raw.position || 0,
  };
}

/**
 * Strategy 1: Fetch through Blox Fruits Values Public API
 */
async function fetchCategoryFromApi(category: 'fruits' | 'gamepasses' | 'limiteds'): Promise<BloxFruitItem[]> {
  const url = `/api/v1/items/bloxfruits/${category}?page=1&limit=100`;
  const response = await axiosInstance.get(url);

  if (response.data && Array.isArray(response.data.items)) {
    const targetCategory: ItemCategory =
      category === 'fruits' ? 'Fruits' : category === 'gamepasses' ? 'Gamepasses' : 'Limiteds';
    return response.data.items.map((item: RawSourceItem) => normalizeItem(item, targetCategory));
  }
  throw new Error(`Invalid response format from API for ${category}`);
}

/**
 * Strategy 2 (Fallback): Cheerio + Next.js RSC scraping
 */
async function scrapeCategoryWithCheerio(category: 'fruits' | 'gamepasses' | 'limiteds'): Promise<BloxFruitItem[]> {
  const url = `/values/${category}`;
  const response = await axiosInstance.get(url);
  const html = String(response.data);
  const targetCategory: ItemCategory =
    category === 'fruits' ? 'Fruits' : category === 'gamepasses' ? 'Gamepasses' : 'Limiteds';

  // 1. Try to extract JSON array from Next.js RSC stream
  const marker = 'initialItems';
  const pos = html.indexOf(marker);
  if (pos !== -1) {
    const arrayStart = html.indexOf('[', pos);
    if (arrayStart !== -1) {
      let depth = 0;
      let end = arrayStart;
      for (let i = arrayStart; i < html.length; i++) {
        if (html[i] === '[') depth++;
        else if (html[i] === ']') {
          depth--;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }

      if (end > arrayStart) {
        const rawArray = html.slice(arrayStart, end + 1);
        const unescaped = rawArray
          .replace(/\\"/g, '"')
          .replace(/\\r/g, '')
          .replace(/\\n/g, '')
          .replace(/"\$D([^"]+)"/g, '"$1"');

        try {
          const items: RawSourceItem[] = JSON.parse(unescaped);
          if (Array.isArray(items) && items.length > 0) {
            return items.map((item) => normalizeItem(item, targetCategory));
          }
        } catch {
          // Fall through to HTML scraping if JSON parse fails
        }
      }
    }
  }

  // 2. Pure HTML card parsing with Cheerio
  const $ = cheerio.load(html);
  const scrapedItems: BloxFruitItem[] = [];

  $('article, [class*="group flex h-full"]').each((idx, el) => {
    const card = $(el);
    const title = card.find('h3').text().trim() || card.find('a[aria-label]').attr('aria-label') || '';
    if (!title) return;

    let img = card.find('img').attr('src') || '';
    if (img.startsWith('/')) {
      img = `https://bloxfruitsvalues.com${img}`;
    }
    const rarity = card.find('[class*="tinted-text"], [class*="tinted-border"]').first().text().trim() || 'Common';
    const valueText = card.find('[class*="tabular-nums text-foreground"]').first().text().trim();
    const trend = card.find('[class*="text-muted-foreground"]').first().text().trim() || 'Stable';
    const demandText = card.find('span:contains("/10")').text().trim();
    let demand: number | null = null;
    const demandMatch = demandText.match(/(\d+)\/10/);
    if (demandMatch) {
      demand = parseInt(demandMatch[1], 10);
    }

    const beliText = card.find('dt:contains("Beli Price")').next('dd').text().trim();
    const fruitType = card.find('dt:contains("Fruit type")').next('dd').text().trim();
    const itemId = String(idx + 1);

    scrapedItems.push({
      id: `scraped-${category}-${idx}-${title.toLowerCase().replace(/\s+/g, '-')}`,
      itemId,
      name: title,
      category: targetCategory,
      rarity,
      image: `/api/bloxfruits/item-image/${itemId}`,
      images: [
        `/api/bloxfruits/item-image/${itemId}`,
        `https://bloxfruitsvalues.com/api/bloxfruits/item-image/${itemId}`,
        ...(img ? [img.split(',')[0]] : []),
      ],
      physicalValue: null,
      physicalValueFormatted: valueText || 'N/A',
      permanentValue: null,
      permanentValueFormatted: 'N/A',
      physicalDemand: demand,
      permanentDemand: null,
      physicalTrend: trend,
      permanentTrend: 'Stable',
      beliPrice: null,
      beliPriceFormatted: beliText || 'N/A',
      robuxPrice: null,
      fruitType: fruitType || '',
      tradeable: true,
      bestUsedFor: '',
      updatedAt: new Date().toISOString(),
      position: idx + 1,
    });
  });

  return scrapedItems;
}

export interface ScrapingResult {
  fruits: BloxFruitItem[];
  gamepasses: BloxFruitItem[];
  limiteds: BloxFruitItem[];
  all: BloxFruitItem[];
  missingCategories: string[];
  sourceMethod: 'api' | 'cheerio' | 'mixed';
  scrapedAt: string;
}

/**
 * Scrapes all Blox Fruits categories with resilience and failover.
 */
export async function scrapeAllBloxFruitsValues(): Promise<ScrapingResult> {
  let fruits: BloxFruitItem[] = [];
  let gamepasses: BloxFruitItem[] = [];
  let limiteds: BloxFruitItem[] = [];
  const missingCategories: string[] = [];
  let usedApi = false;
  let usedCheerio = false;

  // 1. Fetch Fruits
  try {
    fruits = await fetchCategoryFromApi('fruits');
    usedApi = true;
  } catch (apiErr: any) {
    console.warn(`[Scraper] API fetch failed for fruits (${apiErr.message}), falling back to Cheerio...`);
    try {
      fruits = await scrapeCategoryWithCheerio('fruits');
      usedCheerio = true;
    } catch (cheerioErr: any) {
      console.error(`[Scraper] Cheerio failed for fruits:`, cheerioErr.message);
      missingCategories.push('Fruits');
    }
  }

  // 2. Fetch Gamepasses
  try {
    gamepasses = await fetchCategoryFromApi('gamepasses');
    usedApi = true;
  } catch (apiErr: any) {
    console.warn(`[Scraper] API fetch failed for gamepasses (${apiErr.message}), falling back to Cheerio...`);
    try {
      gamepasses = await scrapeCategoryWithCheerio('gamepasses');
      usedCheerio = true;
    } catch (cheerioErr: any) {
      console.error(`[Scraper] Cheerio failed for gamepasses:`, cheerioErr.message);
      missingCategories.push('Gamepasses');
    }
  }

  // 3. Fetch Limiteds
  try {
    limiteds = await fetchCategoryFromApi('limiteds');
    usedApi = true;
  } catch (apiErr: any) {
    console.warn(`[Scraper] API fetch failed for limiteds (${apiErr.message}), falling back to Cheerio...`);
    try {
      limiteds = await scrapeCategoryWithCheerio('limiteds');
      usedCheerio = true;
    } catch (cheerioErr: any) {
      console.error(`[Scraper] Cheerio failed for limiteds:`, cheerioErr.message);
      missingCategories.push('Limiteds');
    }
  }

  // Deduplicate items within categories by name
  const dedupe = (items: BloxFruitItem[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = `${item.category}-${item.name.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  fruits = dedupe(fruits);
  gamepasses = dedupe(gamepasses);
  limiteds = dedupe(limiteds);

  const all = [...fruits, ...gamepasses, ...limiteds];

  return {
    fruits,
    gamepasses,
    limiteds,
    all,
    missingCategories,
    sourceMethod: usedApi && usedCheerio ? 'mixed' : usedApi ? 'api' : 'cheerio',
    scrapedAt: new Date().toISOString(),
  };
}
