import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeftRight,
  Plus,
  Trash2,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Scale,
  Sparkles,
  Info,
} from 'lucide-react';
import { BloxFruitItem, ItemCategory } from '../types';
import { ItemImage } from './ItemImage';
import { formatValue } from '../utils/formatters';

export const MAX_TRADE_SLOTS = 4;

export interface TradeSlotItem {
  slotId: string;
  item: BloxFruitItem;
  isPermanent: boolean;
}

interface TradingCalculatorProps {
  items: BloxFruitItem[];
  prefilledItem?: { item: BloxFruitItem; target: 'you' | 'them' } | null;
  onClearPrefilled?: () => void;
  onOfferFullWarning?: (side: 'you' | 'them') => void;
}

export const TradingCalculator: React.FC<TradingCalculatorProps> = ({
  items,
  prefilledItem,
  onClearPrefilled,
  onOfferFullWarning,
}) => {
  const [yourOffer, setYourOffer] = useState<TradeSlotItem[]>([]);
  const [theirOffer, setTheirOffer] = useState<TradeSlotItem[]>([]);
  const [activeSideForPicker, setActiveSideForPicker] = useState<'you' | 'them' | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState<ItemCategory | 'all'>('all');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [slotLimitMessage, setSlotLimitMessage] = useState<string | null>(null);

  // Handle prefilled item if passed from values list (with MAX 4 slots enforcement)
  useEffect(() => {
    if (prefilledItem) {
      const isYou = prefilledItem.target === 'you';
      const targetOffer = isYou ? yourOffer : theirOffer;

      if (targetOffer.length >= MAX_TRADE_SLOTS) {
        setSlotLimitMessage(
          `${isYou ? 'Your' : 'Their'} offer already has the maximum of 4 items. Remove an item to add another.`
        );
        setTimeout(() => setSlotLimitMessage(null), 4000);
        if (onOfferFullWarning) onOfferFullWarning(prefilledItem.target);
      } else {
        const newItem: TradeSlotItem = {
          slotId: `slot-${Date.now()}-${Math.random()}`,
          item: prefilledItem.item,
          isPermanent: false,
        };
        if (isYou) {
          setYourOffer((prev) => (prev.length < MAX_TRADE_SLOTS ? [...prev, newItem] : prev));
        } else {
          setTheirOffer((prev) => (prev.length < MAX_TRADE_SLOTS ? [...prev, newItem] : prev));
        }
      }

      if (onClearPrefilled) onClearPrefilled();
    }
  }, [prefilledItem, yourOffer, theirOffer, onClearPrefilled, onOfferFullWarning]);

  // Calculations
  const calcTotalValue = (slots: TradeSlotItem[]) => {
    return slots.reduce((acc, s) => {
      const val = s.isPermanent
        ? s.item.permanentValue ?? s.item.physicalValue ?? 0
        : s.item.physicalValue ?? 0;
      return acc + (val || 0);
    }, 0);
  };

  const calcTotalBeli = (slots: TradeSlotItem[]) => {
    return slots.reduce((acc, s) => acc + (s.item.beliPrice || 0), 0);
  };

  const calcAverageDemand = (slots: TradeSlotItem[]) => {
    const valid = slots.filter((s) => s.item.physicalDemand !== null);
    if (valid.length === 0) return '0.0';
    const sum = valid.reduce((acc, s) => acc + (s.item.physicalDemand || 0), 0);
    return (sum / valid.length).toFixed(1);
  };

  const yourTotalValue = useMemo(() => calcTotalValue(yourOffer), [yourOffer]);
  const theirTotalValue = useMemo(() => calcTotalValue(theirOffer), [theirOffer]);
  const yourTotalBeli = useMemo(() => calcTotalBeli(yourOffer), [yourOffer]);
  const theirTotalBeli = useMemo(() => calcTotalBeli(theirOffer), [theirOffer]);

  const valueDifference = theirTotalValue - yourTotalValue;

  // Percentage difference relative to Your Offer
  const percentageDiff = useMemo(() => {
    if (yourTotalValue === 0 && theirTotalValue === 0) return 0;
    if (yourTotalValue === 0) return 100;
    return Math.round((valueDifference / yourTotalValue) * 100);
  }, [valueDifference, yourTotalValue, theirTotalValue]);

  // Win / Fair / Lose classification
  const tradeRating = useMemo(() => {
    if (yourOffer.length === 0 && theirOffer.length === 0) {
      return { status: 'EMPTY', text: 'Add items (Max 4 each) to calculate', color: 'slate', badge: '' };
    }
    if (yourOffer.length === 0) {
      return { status: 'THEIR_SIDE', text: 'Add items to your side to compare', color: 'blue', badge: 'Setup' };
    }
    if (theirOffer.length === 0) {
      return { status: 'YOUR_SIDE', text: 'Add items to their side to compare', color: 'blue', badge: 'Setup' };
    }

    if (percentageDiff >= 20) {
      return { status: 'BIG_WIN', text: 'MASSIVE WIN (W)', color: 'emerald', badge: 'HUGE W' };
    } else if (percentageDiff >= 5) {
      return { status: 'WIN', text: 'WIN (W)', color: 'emerald', badge: 'WIN' };
    } else if (percentageDiff >= -5 && percentageDiff <= 5) {
      return { status: 'FAIR', text: 'FAIR TRADE (F)', color: 'blue', badge: 'FAIR' };
    } else if (percentageDiff >= -20) {
      return { status: 'LOSE', text: 'LOSE (L)', color: 'amber', badge: 'LOSE' };
    } else {
      return { status: 'BIG_LOSE', text: 'MASSIVE LOSE (L)', color: 'red', badge: 'HUGE L' };
    }
  }, [yourOffer.length, theirOffer.length, percentageDiff]);

  // Blox Fruits in-game 40% Beli difference rule check
  const beliDifferenceExceeds40 = useMemo(() => {
    const hasGamepass = [...yourOffer, ...theirOffer].some((s) => s.item.category === 'Gamepasses');
    if (hasGamepass) return false;
    if (yourTotalBeli === 0 || theirTotalBeli === 0) return false;

    const maxBeli = Math.max(yourTotalBeli, theirTotalBeli);
    const minBeli = Math.min(yourTotalBeli, theirTotalBeli);
    const diffPct = ((maxBeli - minBeli) / maxBeli) * 100;
    return diffPct > 40;
  }, [yourOffer, theirOffer, yourTotalBeli, theirTotalBeli]);

  // Add Item from Picker (enforcing MAX 4 slots)
  const handleAddItem = (item: BloxFruitItem) => {
    if (!activeSideForPicker) return;
    const isYou = activeSideForPicker === 'you';
    const currentOffer = isYou ? yourOffer : theirOffer;

    if (currentOffer.length >= MAX_TRADE_SLOTS) {
      setSlotLimitMessage(
        `${isYou ? 'Your' : 'Their'} offer already has the max of 4 items. Remove an item to add another.`
      );
      setTimeout(() => setSlotLimitMessage(null), 3000);
      setActiveSideForPicker(null);
      return;
    }

    const newItem: TradeSlotItem = {
      slotId: `slot-${Date.now()}-${Math.random()}`,
      item,
      isPermanent: false,
    };

    if (isYou) {
      setYourOffer((prev) => (prev.length < MAX_TRADE_SLOTS ? [...prev, newItem] : prev));
    } else {
      setTheirOffer((prev) => (prev.length < MAX_TRADE_SLOTS ? [...prev, newItem] : prev));
    }

    setActiveSideForPicker(null);
    setPickerSearch('');
  };

  // Remove Item
  const handleRemoveItem = (side: 'you' | 'them', slotId: string) => {
    if (side === 'you') {
      setYourOffer((prev) => prev.filter((s) => s.slotId !== slotId));
    } else {
      setTheirOffer((prev) => prev.filter((s) => s.slotId !== slotId));
    }
  };

  // Toggle Permanent / Regular
  const handleTogglePermanent = (side: 'you' | 'them', slotId: string) => {
    const update = (slots: TradeSlotItem[]) =>
      slots.map((s) => (s.slotId === slotId ? { ...s, isPermanent: !s.isPermanent } : s));
    if (side === 'you') setYourOffer(update);
    else setTheirOffer(update);
  };

  // Swap Offers
  const handleSwapOffers = () => {
    const temp = yourOffer;
    setYourOffer(theirOffer);
    setTheirOffer(temp);
  };

  // Clear All
  const handleClearAll = () => {
    setYourOffer([]);
    setTheirOffer([]);
  };

  // Copy Trade Summary
  const handleCopySummary = () => {
    const youNames = yourOffer.map((s) => `${s.isPermanent ? 'Perm ' : ''}${s.item.name}`).join(', ') || 'Nothing';
    const themNames = theirOffer.map((s) => `${s.isPermanent ? 'Perm ' : ''}${s.item.name}`).join(', ') || 'Nothing';
    const text = `Blox Fruits Trade:
You (${yourOffer.length}/4): [${youNames}] (${formatValue(yourTotalValue)})
Them (${theirOffer.length}/4): [${themNames}] (${formatValue(theirTotalValue)})
Result: ${tradeRating.text} (${valueDifference >= 0 ? '+' : ''}${formatValue(valueDifference)}, ${percentageDiff}%)
via bloxfruitsvalues.com`;

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  // Filtered items for Picker Modal
  const pickerFilteredItems = useMemo(() => {
    let result = items;
    if (pickerCategory !== 'all') {
      result = result.filter((i) => i.category === pickerCategory);
    }
    if (pickerSearch.trim()) {
      const q = pickerSearch.toLowerCase().trim();
      result = result.filter(
        (i) => i.name.toLowerCase().includes(q) || i.rarity.toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => (b.physicalValue ?? 0) - (a.physicalValue ?? 0));
  }, [items, pickerCategory, pickerSearch]);

  // Helper to render an individual slot (0..3)
  const renderSlot = (
    side: 'you' | 'them',
    slotIndex: number,
    slotItem?: TradeSlotItem
  ) => {
    const isYou = side === 'you';
    const accentColor = isYou ? 'blue' : 'purple';

    if (slotItem) {
      const itemValue = slotItem.isPermanent
        ? slotItem.item.permanentValue ?? slotItem.item.physicalValue
        : slotItem.item.physicalValue;

      return (
        <div
          key={slotItem.slotId}
          className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border bg-white shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between relative group ${
            isYou ? 'border-blue-100 hover:border-blue-300' : 'border-purple-100 hover:border-purple-300'
          }`}
        >
          {/* Top row: Slot index & remove button */}
          <div className="flex items-center justify-between mb-1.5">
            <span
              className={`text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                isYou ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
              }`}
            >
              Slot {slotIndex + 1}/4
            </span>
            <button
              onClick={() => handleRemoveItem(side, slotItem.slotId)}
              type="button"
              className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Remove item"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Item details */}
          <div className="flex items-center gap-2 sm:gap-2.5 my-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-slate-50 border border-slate-100 p-1 shrink-0 flex items-center justify-center">
              <ItemImage
                name={slotItem.item.name}
                itemId={slotItem.item.itemId}
                image={slotItem.item.image}
                images={slotItem.item.images}
                rarity={slotItem.item.rarity}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                {slotItem.item.name}
              </h4>
              <span className="text-[10px] text-slate-400 block truncate">
                {slotItem.item.rarity} · {slotItem.item.category}
              </span>
              <span
                className={`font-mono text-xs sm:text-sm font-black block mt-0.5 ${
                  isYou ? 'text-blue-700' : 'text-purple-700'
                }`}
              >
                {formatValue(itemValue)}
              </span>
            </div>
          </div>

          {/* Permanent vs Physical toggle */}
          {slotItem.item.permanentValue && slotItem.item.permanentValue > 0 ? (
            <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="text-slate-400 font-medium">Type:</span>
              <button
                onClick={() => handleTogglePermanent(side, slotItem.slotId)}
                type="button"
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  slotItem.isPermanent
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {slotItem.isPermanent ? '★ Permanent' : 'Physical'}
              </button>
            </div>
          ) : (
            <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span>Beli: {slotItem.item.beliPriceFormatted || '-'}</span>
              <span>Demand: {slotItem.item.physicalDemand ?? '-'}/10</span>
            </div>
          )}
        </div>
      );
    }

    // Empty Slot
    return (
      <button
        key={`empty-${side}-${slotIndex}`}
        onClick={() => setActiveSideForPicker(side)}
        type="button"
        className={`min-h-[110px] sm:min-h-[125px] p-3 rounded-xl sm:rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer group select-none ${
          isYou
            ? 'border-blue-200 hover:border-blue-500 hover:bg-blue-50/40 text-blue-700'
            : 'border-purple-200 hover:border-purple-500 hover:bg-purple-50/40 text-purple-700'
        }`}
      >
        <div
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${
            isYou ? 'bg-blue-100/70 text-blue-700' : 'bg-purple-100/70 text-purple-700'
          }`}
        >
          <Plus className="w-4 h-4" />
        </div>
        <div className="text-center">
          <span className="font-bold text-xs sm:text-sm block">Add Item</span>
          <span className="text-[10px] text-slate-400 font-medium">Slot {slotIndex + 1} of 4</span>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* Slot Limit Notification */}
      {slotLimitMessage && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{slotLimitMessage}</span>
          </div>
          <button
            onClick={() => setSlotLimitMessage(null)}
            type="button"
            className="p-1 hover:bg-blue-100 rounded text-blue-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner & Quick Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Blox Fruits Trade Calculator
              </h2>
              <span className="text-[10px] sm:text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                Max 4 Items
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulates the in-game Roblox Blox Fruits 4-slot trade window (Cafe &amp; Mansion).
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={handleSwapOffers}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              title="Swap your offer and their offer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
              <span>Swap</span>
            </button>

            <button
              onClick={handleCopySummary}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              title="Copy trade evaluation to clipboard"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>{copiedNotification ? 'Copied!' : 'Copy'}</span>
            </button>

            <button
              onClick={handleClearAll}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-50 text-red-600 text-xs font-semibold transition-all cursor-pointer"
              title="Clear all trade slots"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Central Trade Result Status Indicator */}
        <div className="mt-3 sm:mt-4 pt-1">
          <div
            className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border text-center transition-all ${
              tradeRating.color === 'emerald'
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : tradeRating.color === 'red'
                ? 'bg-red-50/80 border-red-200 text-red-950'
                : tradeRating.color === 'amber'
                ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3">
              <span className="text-xl sm:text-2xl font-black tracking-tight">
                {tradeRating.text}
              </span>
              {tradeRating.badge && (
                <span
                  className={`text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                    tradeRating.color === 'emerald'
                      ? 'bg-emerald-600 text-white'
                      : tradeRating.color === 'red'
                      ? 'bg-red-600 text-white'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {tradeRating.badge}
                </span>
              )}
            </div>

            {yourOffer.length > 0 && theirOffer.length > 0 && (
              <div className="mt-2 text-xs font-medium flex items-center justify-center gap-2 sm:gap-4 text-slate-600 flex-wrap">
                <span>
                  Diff:{' '}
                  <strong
                    className={
                      valueDifference >= 0
                        ? 'text-emerald-700 font-mono font-bold'
                        : 'text-red-700 font-mono font-bold'
                    }
                  >
                    {valueDifference >= 0 ? '+' : ''}
                    {formatValue(valueDifference)}
                  </strong>
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>
                  Gain / Loss:{' '}
                  <strong className={percentageDiff >= 0 ? 'text-emerald-700 font-mono font-bold' : 'text-red-700 font-mono font-bold'}>
                    {percentageDiff >= 0 ? '+' : ''}
                    {percentageDiff}%
                  </strong>
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>
                  Avg Demand: <strong className="text-slate-800 font-mono">{calcAverageDemand(yourOffer)}</strong> vs{' '}
                  <strong className="text-slate-800 font-mono">{calcAverageDemand(theirOffer)}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Blox Fruits 40% Beli Warning */}
          {beliDifferenceExceeds40 && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">In-Game 40% Beli Limit Exceeded:</strong>
                <p className="mt-0.5 opacity-90 leading-relaxed">
                  Roblox Blox Fruits blocks trades if the total Beli difference is greater than 40%.
                  (Your Beli: {formatValue(yourTotalBeli, true)} vs Their Beli: {formatValue(theirTotalBeli, true)}).
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Two-Column Trade Stage (YOU vs THEM) - 2x2 Slots Grid for Max 4 Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* LEFT: YOUR OFFER (Max 4 Items) */}
        <div className="bg-white rounded-2xl border border-blue-100/90 p-3.5 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    YOUR OFFER
                  </h3>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      yourOffer.length === MAX_TRADE_SLOTS
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-700 border border-blue-100'
                    }`}
                  >
                    {yourOffer.length}/{MAX_TRADE_SLOTS} Slots
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Items you are offering</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                  Total Value
                </span>
                <span className="text-base sm:text-xl font-mono font-black text-blue-700">
                  {formatValue(yourTotalValue)}
                </span>
              </div>
            </div>

            {/* 4 Fixed Slots Grid (2x2 on Mobile & Desktop) */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 my-3 sm:my-4">
              {[0, 1, 2, 3].map((idx) => renderSlot('you', idx, yourOffer[idx]))}
            </div>
          </div>

          {/* Footer metrics */}
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Beli: <strong className="text-slate-800 font-mono">{formatValue(yourTotalBeli, true)}</strong></span>
            <span>Avg Demand: <strong className="text-slate-800 font-mono">{calcAverageDemand(yourOffer)}/10</strong></span>
          </div>
        </div>

        {/* RIGHT: THEIR OFFER (Max 4 Items) */}
        <div className="bg-white rounded-2xl border border-purple-100/90 p-3.5 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    THEIR OFFER
                  </h3>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      theirOffer.length === MAX_TRADE_SLOTS
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-50 text-purple-700 border border-purple-100'
                    }`}
                  >
                    {theirOffer.length}/{MAX_TRADE_SLOTS} Slots
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Items you will receive</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                  Total Value
                </span>
                <span className="text-base sm:text-xl font-mono font-black text-purple-700">
                  {formatValue(theirTotalValue)}
                </span>
              </div>
            </div>

            {/* 4 Fixed Slots Grid (2x2 on Mobile & Desktop) */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 my-3 sm:my-4">
              {[0, 1, 2, 3].map((idx) => renderSlot('them', idx, theirOffer[idx]))}
            </div>
          </div>

          {/* Footer metrics */}
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Beli: <strong className="text-slate-800 font-mono">{formatValue(theirTotalBeli, true)}</strong></span>
            <span>Avg Demand: <strong className="text-slate-800 font-mono">{calcAverageDemand(theirOffer)}/10</strong></span>
          </div>
        </div>
      </div>

      {/* Item Picker Modal (Responsive Bottom-Sheet on Mobile, Centered Dialog on PC) */}
      {activeSideForPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <span>Select Item for {activeSideForPicker === 'you' ? 'YOUR OFFER' : 'THEIR OFFER'}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                    Max 4
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">Tap any item to insert into an open trade slot</p>
              </div>
              <button
                onClick={() => setActiveSideForPicker(null)}
                type="button"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-3 sm:p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between">
              <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-xl overflow-x-auto shrink-0">
                {(['all', 'Fruits', 'Gamepasses', 'Limiteds'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setPickerCategory(cat)}
                    type="button"
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 ${
                      pickerCategory === cat
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat === 'all' ? 'All' : cat}
                  </button>
                ))}
              </div>

              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Search item name..."
                  autoFocus
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Items Grid (Responsive: 2 cols on small mobile, 3-4 cols on PC) */}
            <div className="p-3 sm:p-4 overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
              {pickerFilteredItems.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                  No items match your search.
                </div>
              ) : (
                pickerFilteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleAddItem(item)}
                    type="button"
                    className="p-2 sm:p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-blue-500 hover:bg-blue-50/20 transition-all text-left flex flex-col justify-between group cursor-pointer shadow-2xs"
                  >
                    <div className="w-full aspect-square rounded-lg bg-slate-50 p-1 flex items-center justify-center mb-1.5">
                      <ItemImage
                        name={item.name}
                        itemId={item.itemId}
                        image={item.image}
                        images={item.images}
                        rarity={item.rarity}
                      />
                    </div>

                    <div className="w-full min-w-0">
                      <h5 className="font-extrabold text-xs text-slate-900 truncate group-hover:text-blue-600">
                        {item.name}
                      </h5>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {item.category} {item.rarity ? `· ${item.rarity}` : ''}
                      </span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="font-mono text-xs font-black text-blue-700">
                          {item.physicalValueFormatted || 'N/A'}
                        </span>
                        {item.physicalDemand !== null && (
                          <span className="text-[9px] text-slate-400 font-mono">
                            {item.physicalDemand}/10
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                {pickerFilteredItems.length} items available
              </span>
              <button
                onClick={() => setActiveSideForPicker(null)}
                type="button"
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
