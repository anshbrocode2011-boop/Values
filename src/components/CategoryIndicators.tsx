import React from 'react';
import { ItemCategory } from '../types';

interface CategoryIndicatorsProps {
  fruitsCount: number;
  gamepassesCount: number;
  limitedsCount: number;
  selectedCategory: ItemCategory | 'all';
  onSelectCategory: (cat: ItemCategory | 'all') => void;
}

export const CategoryIndicators: React.FC<CategoryIndicatorsProps> = ({
  fruitsCount,
  gamepassesCount,
  limitedsCount,
  selectedCategory,
  onSelectCategory,
}) => {
  const categories: { id: ItemCategory; label: string; count: number; desc: string }[] = [
    {
      id: 'Fruits',
      label: '1. Fruits',
      count: fruitsCount,
      desc: 'Physical & Perm values, demand & Beli',
    },
    {
      id: 'Gamepasses',
      label: '2. Gamepasses',
      count: gamepassesCount,
      desc: 'Notifier, 2x Money, Dark Blade & more',
    },
    {
      id: 'Limiteds',
      label: '3. Limiteds / Skins',
      count: limitedsCount,
      desc: 'Exclusive tokens, scrolls & holiday skins',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 my-6">
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(isSelected ? 'all' : cat.id)}
            type="button"
            className={`text-left p-4 rounded-xl border transition-all text-slate-800 ${
              isSelected
                ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-1 ring-blue-600/20'
                : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-sm sm:text-base text-slate-900">
                {cat.label}
              </span>
              <span className="font-mono text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                {cat.count} items
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {cat.desc}
            </p>
          </button>
        );
      })}
    </div>
  );
};
