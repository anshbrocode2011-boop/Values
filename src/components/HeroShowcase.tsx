import React, { useState, useMemo } from 'react';
import { BloxFruitItem } from '../types';
import { TrendingUp, Flame, Zap, Shield, Sparkles, ArrowRight, Eye, Star } from 'lucide-react';

interface HeroShowcaseProps {
  items: BloxFruitItem[];
  onSelectItem: (item: BloxFruitItem) => void;
}

type HeroTab = 'top-value' | 'high-demand' | 'mythical' | 'popular';

export const HeroShowcase: React.FC<HeroShowcaseProps> = ({ items, onSelectItem }) => {
  const [activeTab, setActiveTab] = useState<HeroTab>('top-value');
  const [selectedFruitId, setSelectedFruitId] = useState<string | null>(null);

  // Curate fruits for the interactive showcase based on active tab
  const displayItems = useMemo(() => {
    if (!items || items.length === 0) return [];

    if (activeTab === 'top-value') {
      return [...items]
        .filter((i) => i.physicalValue && i.physicalValue > 0)
        .sort((a, b) => (b.physicalValue ?? 0) - (a.physicalValue ?? 0))
        .slice(0, 8);
    }
    if (activeTab === 'high-demand') {
      return [...items]
        .filter((i) => (i.physicalDemand ?? 0) >= 8)
        .sort((a, b) => (b.physicalDemand ?? 0) - (a.physicalDemand ?? 0) || (b.physicalValue ?? 0) - (a.physicalValue ?? 0))
        .slice(0, 8);
    }
    if (activeTab === 'mythical') {
      return items
        .filter((i) => (i.rarity || '').toLowerCase().includes('mythic'))
        .sort((a, b) => (b.physicalValue ?? 0) - (a.physicalValue ?? 0))
        .slice(0, 8);
    }
    // 'popular'
    const popularNames = ['Kitsune', 'West Dragon', 'Dough', 'Buddha', 'T-Rex', 'Portal', 'Venom', 'Dark Blade'];
    const matched = items.filter((i) => popularNames.includes(i.name));
    return matched.length > 0
      ? matched
      : items.slice(0, 8);
  }, [items, activeTab]);

  // The currently focused fruit in the hero spotlight
  const activeFruit = useMemo(() => {
    if (selectedFruitId) {
      const found = items.find((i) => i.id === selectedFruitId);
      if (found) return found;
    }
    return displayItems[0] || items[0] || null;
  }, [selectedFruitId, displayItems, items]);

  if (!activeFruit) return null;

  return (
    <div className="mb-8 rounded-3xl bg-linear-to-b from-slate-50/90 via-slate-50/40 to-white border border-slate-200/90 p-5 sm:p-7 shadow-xs">
      {/* Top Bar with Category Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Featured Blox Fruits &amp; Items
            </h2>
            <p className="text-xs text-slate-500">
              Click any fruit below to preview live values and demand
            </p>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('top-value')}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'top-value'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span>Top Value</span>
          </button>

          <button
            onClick={() => setActiveTab('high-demand')}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'high-demand'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>High Demand</span>
          </button>

          <button
            onClick={() => setActiveTab('mythical')}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'mythical'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-purple-500" />
            <span>Mythicals</span>
          </button>

          <button
            onClick={() => setActiveTab('popular')}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'popular'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-yellow-500" />
            <span>Popular</span>
          </button>
        </div>
      </div>

      {/* Main Spotlight & Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Interactive Spotlight Card */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm relative overflow-hidden group">
          {/* Subtle decorative glow */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-blue-100/50 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-3 relative z-10">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                {activeFruit.rarity || 'Blox Fruit'}
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">
                {activeFruit.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeFruit.category} {activeFruit.fruitType ? `· ${activeFruit.fruitType} Type` : ''}
              </p>
            </div>

            {/* Demand Badge */}
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-medium block">DEMAND</span>
              <span className="text-sm font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                {activeFruit.physicalDemand !== null ? `${activeFruit.physicalDemand}/10` : 'N/A'}
              </span>
            </div>
          </div>

          {/* Fruit Image with interactive floating effect */}
          <div className="my-4 py-3 flex items-center justify-center relative">
            <div className="w-36 h-36 sm:w-44 sm:h-44 relative flex items-center justify-center">
              <img
                src={activeFruit.image}
                alt={activeFruit.name}
                className="w-full h-full object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-105 select-none"
                loading="eager"
              />
            </div>
          </div>

          {/* Live Values Breakdown */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
            <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                Physical Value
              </span>
              <span className="text-base sm:text-lg font-mono font-extrabold text-blue-700">
                {activeFruit.physicalValueFormatted || 'N/A'}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Trend: <strong className="text-slate-700">{activeFruit.physicalTrend || 'Stable'}</strong>
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-purple-50/40 border border-purple-100/60">
              <span className="text-[10px] uppercase tracking-wider text-purple-500 font-bold block">
                Permanent Value
              </span>
              <span className="text-base sm:text-lg font-mono font-extrabold text-purple-700">
                {activeFruit.permanentValueFormatted || 'N/A'}
              </span>
              <span className="text-[10px] text-purple-600/80 block mt-0.5">
                {activeFruit.beliPriceFormatted !== 'N/A' ? `Beli: ${activeFruit.beliPriceFormatted}` : 'Special Item'}
              </span>
            </div>
          </div>

          {/* Action to Jump to Item */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => onSelectItem(activeFruit)}
              type="button"
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>Locate {activeFruit.name} in Database</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Right: Interactive Fruit Cards Grid */}
        <div className="lg:col-span-7">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {displayItems.map((item) => {
              const isSelected = activeFruit.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedFruitId(item.id)}
                  type="button"
                  className={`text-left p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-600/20'
                      : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-2xs'
                  }`}
                >
                  {/* Top: Image & Rarity */}
                  <div className="w-full aspect-square rounded-xl bg-slate-50 flex items-center justify-center p-2 mb-2 relative overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-110"
                      loading="lazy"
                    />
                    {item.physicalDemand !== null && item.physicalDemand >= 9 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" title="Peak Demand" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="w-full min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 truncate">
                      {item.name}
                    </h4>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="font-mono text-xs font-extrabold text-blue-700 truncate">
                        {item.physicalValueFormatted}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.physicalDemand !== null ? `${item.physicalDemand}/10` : ''}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-3.5 flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Click any fruit card to spotlight details</span>
            <span>Live data updated continuously</span>
          </div>
        </div>
      </div>
    </div>
  );
};
