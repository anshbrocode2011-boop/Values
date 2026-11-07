import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, X, LayoutGrid, List, Plus, Scale, Sparkles, TrendingUp } from 'lucide-react';
import { BloxFruitItem, ItemCategory } from '../types';
import { ItemImage } from './ItemImage';

interface FruitCardGridProps {
  items: BloxFruitItem[];
  selectedCategory: ItemCategory | 'all';
  onCategoryChange: (cat: ItemCategory | 'all') => void;
  onAddToCalculator: (item: BloxFruitItem, side: 'you' | 'them') => void;
}

export const FruitCardGrid: React.FC<FruitCardGridProps> = ({
  items,
  selectedCategory,
  onCategoryChange,
  onAddToCalculator,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'value' | 'perm' | 'demand' | 'name'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    let result = items;

    if (selectedCategory !== 'all') {
      result = result.filter((item) => item.category === selectedCategory);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.rarity.toLowerCase().includes(q) ||
          item.fruitType.toLowerCase().includes(q)
      );
    }

    return [...result].sort((a, b) => {
      let comp = 0;
      if (sortBy === 'value') {
        comp = (b.physicalValue ?? 0) - (a.physicalValue ?? 0);
      } else if (sortBy === 'perm') {
        comp = (b.permanentValue ?? 0) - (a.permanentValue ?? 0);
      } else if (sortBy === 'demand') {
        comp = (b.physicalDemand ?? 0) - (a.physicalDemand ?? 0);
      } else if (sortBy === 'name') {
        comp = a.name.localeCompare(b.name);
      }
      return sortOrder === 'desc' ? comp : -comp;
    });
  }, [items, selectedCategory, searchTerm, sortBy, sortOrder]);

  const toggleSort = (field: 'value' | 'perm' | 'demand' | 'name') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-5">
      {/* Search, Category, and View Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Category Tabs (All, Fruits, Gamepasses, Limiteds) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            {(['all', 'Fruits', 'Gamepasses', 'Limiteds'] as const).map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => onCategoryChange(cat)}
                  type="button"
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat === 'all' ? 'All Items' : cat}
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle: Grid vs Table */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                type="button"
                className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                type="button"
                className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Search & Sort Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search fruits, items, rarity, types..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Sort Controls */}
          <div className="flex items-center gap-2 text-xs overflow-x-auto pb-1 sm:pb-0">
            <span className="text-slate-400 font-medium shrink-0">Sort by:</span>
            <button
              onClick={() => toggleSort('value')}
              type="button"
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
                sortBy === 'value'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Value {sortBy === 'value' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
            </button>
            <button
              onClick={() => toggleSort('demand')}
              type="button"
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
                sortBy === 'demand'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Demand {sortBy === 'demand' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
            </button>
            <button
              onClick={() => toggleSort('perm')}
              type="button"
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
                sortBy === 'perm'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Permanent {sortBy === 'perm' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
            </button>
            <button
              onClick={() => toggleSort('name')}
              type="button"
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
                sortBy === 'name'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Name {sortBy === 'name' ? (sortOrder === 'desc' ? 'Z-A' : 'A-Z') : ''}
            </button>
          </div>
        </div>
      </div>

      {/* Showing Fruits One by One - Modern Responsive Grid View (2 cols mobile, 3-4 cols PC) */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {filteredItems.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              No fruits or items match your search.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all p-2.5 sm:p-4 flex flex-col justify-between group relative"
              >
                {/* Top header: Rarity & Demand */}
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <span
                      className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-md border truncate max-w-[85px] sm:max-w-none ${
                        item.rarity === 'Mythical'
                          ? 'bg-red-50 text-red-600 border-red-100'
                          : item.rarity === 'Legendary'
                          ? 'bg-purple-50 text-purple-600 border-purple-100'
                          : item.rarity === 'Rare'
                          ? 'bg-blue-50 text-blue-600 border-blue-100'
                          : item.rarity === 'Uncommon'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {item.rarity}
                    </span>

                    {item.physicalDemand !== null && (
                      <span className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-1.5 sm:px-2 py-0.5 rounded shrink-0">
                        {item.physicalDemand}/10
                      </span>
                    )}
                  </div>

                  {/* Fruit Image (Large & Responsive) */}
                  <div className="w-full aspect-square rounded-lg sm:rounded-xl bg-slate-50/80 p-2 sm:p-3 my-1 sm:my-2 flex items-center justify-center relative overflow-hidden group-hover:bg-slate-100/60 transition-colors">
                    <ItemImage
                      name={item.name}
                      itemId={item.itemId}
                      image={item.image}
                      images={item.images}
                      rarity={item.rarity}
                      category={item.category}
                      className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-300"
                    />
                  </div>

                  {/* Item Name & Details */}
                  <h3 className="font-extrabold text-slate-900 text-xs sm:text-base tracking-tight truncate mt-0.5">
                    {item.name}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 truncate mb-2 sm:mb-3">
                    {item.category} {item.fruitType ? `· ${item.fruitType}` : ''}
                  </p>

                  {/* Value Numbers Grid */}
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2 p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-slate-50/80 border border-slate-100 text-[11px] sm:text-xs">
                    <div>
                      <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Physical
                      </span>
                      <span className="font-mono font-extrabold text-blue-700 text-xs sm:text-sm truncate block">
                        {item.physicalValueFormatted || 'N/A'}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-slate-500 block truncate">
                        {item.physicalTrend || 'Stable'}
                      </span>
                    </div>

                    <div className="border-l border-slate-200/80 pl-1.5 sm:pl-2">
                      <span className="text-[9px] sm:text-[10px] uppercase font-bold text-purple-500 block tracking-wider">
                        Permanent
                      </span>
                      <span className="font-mono font-extrabold text-purple-700 text-xs sm:text-sm truncate block">
                        {item.permanentValueFormatted || 'N/A'}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-slate-500 block truncate">
                        {item.beliPriceFormatted !== 'N/A' && item.beliPriceFormatted !== '0'
                          ? `Beli: ${item.beliPriceFormatted}`
                          : item.robuxPrice
                          ? `${item.robuxPrice} R$`
                          : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Quick Action: Add to Calculator (Max 4 Slots) */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 relative">
                  <button
                    onClick={() => onAddToCalculator(item, 'you')}
                    type="button"
                    className="flex-1 inline-flex items-center justify-center gap-1 py-1 sm:py-1.5 px-1.5 sm:px-2 rounded-md sm:rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer"
                    title="Add to Your Offer in Calculator (Max 4)"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+You</span>
                  </button>

                  <button
                    onClick={() => onAddToCalculator(item, 'them')}
                    type="button"
                    className="flex-1 inline-flex items-center justify-center gap-1 py-1 sm:py-1.5 px-1.5 sm:px-2 rounded-md sm:rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer"
                    title="Add to Their Offer in Calculator (Max 4)"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+Them</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Compact Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50 text-slate-600 font-semibold tracking-wide">
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Rarity</th>
                  <th className="py-3 px-4 text-right">Physical Value</th>
                  <th className="py-3 px-4 text-right">Permanent Value</th>
                  <th className="py-3 px-4 text-center">Demand</th>
                  <th className="py-3 px-4">Trend</th>
                  <th className="py-3 px-4 text-right">Beli / Cost</th>
                  <th className="py-3 px-4 text-center">Trade Calc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/80 p-0.5 shrink-0">
                        <ItemImage
                          name={item.name}
                          itemId={item.itemId}
                          image={item.image}
                          images={item.images}
                          rarity={item.rarity}
                        />
                      </div>
                      <span>{item.name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{item.category}</td>
                    <td className="py-3 px-4 font-medium text-slate-600">{item.rarity}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">
                      {item.physicalValueFormatted}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-purple-700">
                      {item.permanentValueFormatted}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {item.physicalDemand !== null ? `${item.physicalDemand}/10` : '-'}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600">{item.physicalTrend}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {item.beliPriceFormatted !== 'N/A' && item.beliPriceFormatted !== '0'
                        ? item.beliPriceFormatted
                        : item.robuxPrice
                        ? `${item.robuxPrice} R$`
                        : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => onAddToCalculator(item, 'you')}
                          type="button"
                          className="px-2 py-1 rounded bg-blue-50 text-blue-700 font-bold hover:bg-blue-100"
                          title="Add to You"
                        >
                          +You
                        </button>
                        <button
                          onClick={() => onAddToCalculator(item, 'them')}
                          type="button"
                          className="px-2 py-1 rounded bg-purple-50 text-purple-700 font-bold hover:bg-purple-100"
                          title="Add to Them"
                        >
                          +Them
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bottom Summary Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
        <span>Showing {filteredItems.length} of {items.length} Blox Fruits items</span>
        <span>100% verified values directly from bloxfruitsvalues.com</span>
      </div>
    </div>
  );
};
