'use client';

import { useRouter } from 'next/navigation';
import { RecipeLibrary } from '@/components/RecipeLibrary';
import { useRecipes } from '@/hooks/useRecipes';
import { Recipe } from '@/lib/types';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function LibraryPage() {
  const router = useRouter();
  const { recipes, isLoaded, remove } = useRecipes();

  const handleSelectRecipe = (recipe: Recipe) => {
    router.push(`/recipe?slug=${recipe.slug}`);
  };

  const handleDeleteRecipe = (slug: string) => {
    remove(slug);
  };

  if (!isLoaded) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-amber-900">Recipe Library</h1>
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Recipe
        </Link>
      </div>

      {/* Recipe List */}
      <RecipeLibrary
        recipes={recipes}
        onSelect={handleSelectRecipe}
        onDelete={handleDeleteRecipe}
      />
    </div>
  );
}
