import React, { useState, useMemo, useEffect } from 'react';
import { Search, ArrowUpDown, ImageOff, X } from 'lucide-react';
import { BloxFruitItem, ItemCategory } from '../types';

interface ItemsTableProps {
  items: BloxFruitItem[];
  selectedCategory: ItemCategory | 'all';
  onCategoryChange: (cat: ItemCategory | 'all') => void;
  externalSearch?: string;
  onClearExternalSearch?: () => void;
}

export const ItemsTable: React.FC<ItemsTableProps> = ({
  items,
  selectedCategory,
  onCategoryChange,
  externalSearch = '',
  onClearExternalSearch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'value' | 'perm' | 'demand' | 'name'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Sync external search from Hero showcase
  useEffect(() => {
    if (externalSearch) {
      setSearchTerm(externalSearch);
    }
  }, [externalSearch]);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    if (!val && onClearExternalSearch) {
      onClearExternalSearch();
    }
  };

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
    <div id="database-table" className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden mt-8 scroll-mt-20">
      {/* Table Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3.5 sm:items-center sm:justify-between bg-slate-50/50">
        {/* Category Tabs (Interactive Segmented Control) */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-lg self-start">
          {(['all', 'Fruits', 'Gamepasses', 'Limiteds'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              type="button"
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat === 'all' ? 'All Items' : cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search items, fruits, rarity..."
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => handleSearchChange('')}
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50 text-slate-600 font-semibold tracking-wide">
              <th className="py-3 px-4 w-12">#</th>
              <th className="py-3 px-4">
                <button
                  onClick={() => toggleSort('name')}
                  type="button"
                  className="flex items-center gap-1 text-slate-700 hover:text-blue-600 cursor-pointer"
                >
                  <span>Item Name</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Rarity</th>
              <th className="py-3 px-4 text-right">
                <button
                  onClick={() => toggleSort('value')}
                  type="button"
                  className="flex items-center gap-1 ml-auto text-slate-700 hover:text-blue-600 font-semibold cursor-pointer"
                >
                  <span>Physical Value</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>
              <th className="py-3 px-4 text-right">
                <button
                  onClick={() => toggleSort('perm')}
                  type="button"
                  className="flex items-center gap-1 ml-auto text-slate-700 hover:text-blue-600 cursor-pointer"
                >
                  <span>Permanent Value</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>
              <th className="py-3 px-4 text-center">
                <button
                  onClick={() => toggleSort('demand')}
                  type="button"
                  className="flex items-center gap-1 mx-auto text-slate-700 hover:text-blue-600 cursor-pointer"
                >
                  <span>Demand</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>
              <th className="py-3 px-4">Trend</th>
              <th className="py-3 px-4 text-right">Beli Price</th>
              <th className="py-3 px-4">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400 text-sm">
                  No items matched your search criteria.
                </td>
              </tr>
            ) : (
              filteredItems.map((item, idx) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/70 transition-colors group text-slate-800"
                >
                  <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900 flex items-center gap-2.5">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-7 h-7 object-contain rounded shrink-0 bg-slate-50 border border-slate-100 p-0.5"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center shrink-0">
                        <ImageOff className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    )}
                    <span className="truncate max-w-[150px] font-semibold text-slate-900">
                      {item.name}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{item.category}</td>
                  <td className="py-3 px-4 font-medium text-slate-600">
                    {item.rarity}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-blue-700 text-xs">
                    {item.physicalValueFormatted}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-purple-700 text-xs">
                    {item.permanentValueFormatted}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {item.physicalDemand !== null ? (
                      <span className="font-mono text-slate-700 font-medium">
                        {item.physicalDemand}/10
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-medium ${
                        item.physicalTrend === 'Overpaid'
                          ? 'text-emerald-600'
                          : item.physicalTrend === 'Underpaid'
                          ? 'text-red-600'
                          : item.physicalTrend === 'Rising'
                          ? 'text-indigo-600'
                          : 'text-slate-600'
                      }`}
                    >
                      {item.physicalTrend || 'Stable'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">
                    {item.beliPriceFormatted || '-'}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {item.fruitType || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (for Phone / Mobile Screens) */}
      <div className="block md:hidden divide-y divide-slate-100">
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No items matched your search criteria.
          </div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="p-4 flex items-start gap-3.5">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-12 h-12 object-contain rounded-lg bg-slate-50 border border-slate-200/60 p-1 shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <ImageOff className="w-5 h-5 text-slate-400" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="font-bold text-slate-900 text-sm truncate">
                    {item.name}
                  </h4>
                  <span className="font-mono text-xs text-blue-700 font-bold shrink-0">
                    {item.physicalValueFormatted}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                  <span>{item.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.rarity}</span>
                  {item.fruitType && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{item.fruitType}</span>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Permanent</span>
                    <span className="font-mono font-semibold text-purple-700">
                      {item.permanentValueFormatted}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Demand & Trend</span>
                    <span className="text-slate-700 font-medium">
                      {item.physicalDemand !== null ? `${item.physicalDemand}/10` : 'N/A'} · {item.physicalTrend}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Table Footer info */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <span>
          Showing {filteredItems.length} of {items.length} items
        </span>
        <span>All data synced from bloxfruitsvalues.com</span>
      </div>
    </div>
  );
};
