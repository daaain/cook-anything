'use client';

import { ChefHat, ChevronDown, ChevronUp, UtensilsCrossed } from 'lucide-react';
import { useState } from 'react';
import type { Recipe } from '@/lib/types';

interface MiseEnPlaceProps {
  recipe: Recipe;
}

/**
 * Extract unique items from recipe.
 * Uses top-level arrays if present (new format), otherwise falls back to
 * extracting from steps with case-insensitive deduplication (old format).
 */
export function extractUniqueItems(recipe: Recipe, field: 'ingredients' | 'equipment'): string[] {
  // Use top-level arrays if present (new format)
  if (field === 'ingredients' && recipe.ingredients?.length) {
    return recipe.ingredients;
  }
  if (field === 'equipment' && recipe.equipment?.length) {
    return recipe.equipment;
  }

  // Fallback: extract from steps (old saved recipes without top-level arrays)
  const seen = new Map<string, string>();

  for (const group of recipe.flowGroups) {
    for (const step of group.steps) {
      const items = field === 'ingredients' ? step.ingredients : step.equipment;
      if (!items) continue;

      for (const item of items) {
        const key = item.toLowerCase();
        if (!seen.has(key)) {
          seen.set(key, item);
        }
      }
    }
  }

  return Array.from(seen.values());
}

interface CollapsibleSectionProps {
  title: string;
  items: string[];
  icon: React.ReactNode;
  defaultExpanded?: boolean;
}

function CollapsibleSection({
  title,
  items,
  icon,
  defaultExpanded = false,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (items.length === 0) return null;

  return (
    <div className="border border-emerald-200 dark:border-emerald-800 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 p-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        <span className="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full">
          {items.length}
        </span>
        <div className="flex-1" />
        <div className="text-emerald-600 dark:text-emerald-400">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {isExpanded && (
        <div className="p-3 bg-white dark:bg-gray-800">
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <span
                key={item}
                className="inline-block px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-full text-sm text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function MiseEnPlace({ recipe }: MiseEnPlaceProps) {
  const ingredients = extractUniqueItems(recipe, 'ingredients');
  const equipment = extractUniqueItems(recipe, 'equipment');

  if (ingredients.length === 0 && equipment.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 space-y-2">
      <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
        <ChefHat className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        Mise en Place
      </h2>
      <div className="space-y-2">
        <CollapsibleSection
          title="Ingredients"
          items={ingredients}
          icon={<ChefHat className="w-4 h-4" />}
        />
        <CollapsibleSection
          title="Equipment"
          items={equipment}
          icon={<UtensilsCrossed className="w-4 h-4" />}
        />
      </div>
    </div>
  );
}
