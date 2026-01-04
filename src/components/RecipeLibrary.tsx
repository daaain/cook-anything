'use client';

import { ChevronRight, Clock, Trash2, Users } from 'lucide-react';
import type { Recipe } from '@/lib/types';

interface RecipeLibraryProps {
  recipes: Recipe[];
  onSelect: (recipe: Recipe) => void;
  onDelete: (slug: string) => void;
}

export function RecipeLibrary({ recipes, onSelect, onDelete }: RecipeLibraryProps) {
  if (recipes.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">No saved recipes</h3>
        <p className="text-gray-500 text-sm">
          Recipes you create will appear here for quick access
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="divide-y divide-gray-100">
        {recipes.map((recipe) => (
          <div
            key={recipe.slug}
            className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors"
          >
            <button
              type="button"
              onClick={() => onSelect(recipe)}
              className="flex-1 min-w-0 text-left"
            >
              <h3 className="font-medium text-gray-800">{recipe.title}</h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
                {recipe.servings && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {recipe.servings}
                  </span>
                )}
                {recipe.savedAt && <span>{new Date(recipe.savedAt).toLocaleDateString()}</span>}
              </div>
            </button>

            <div className="flex items-center gap-1 shrink-0">
              <ChevronRight className="w-5 h-5 text-gray-400" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this recipe?')) {
                    if (recipe.slug) onDelete(recipe.slug);
                  }
                }}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
