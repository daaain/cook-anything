'use client';

import { useRouter } from 'next/navigation';
import { RecipeUploader } from '@/components/RecipeUploader';
import { useRecipes } from '@/hooks/useRecipes';
import type { Recipe } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const { save } = useRecipes();

  const handleRecipeProcessed = (recipe: Recipe) => {
    // Save the recipe
    const savedRecipe = save(recipe);
    // Navigate to the recipe view
    router.push(`/recipe?slug=${savedRecipe.slug}`);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-amber-900 mb-2">Recipe Flow</h1>
        <p className="text-amber-700">Transform recipes into interactive cooking flowcharts</p>
      </div>

      {/* Recipe Uploader */}
      <RecipeUploader onRecipeProcessed={handleRecipeProcessed} />

      {/* Quick Tips */}
      <div className="bg-white/50 rounded-xl p-4 border border-amber-200/50">
        <h3 className="font-medium text-amber-800 mb-2">Tips for best results</h3>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• Take clear screenshots of the full recipe</li>
          <li>• Include ingredient lists and instructions</li>
          <li>• Use adjustments to modify servings or ingredients</li>
        </ul>
      </div>
    </div>
  );
}
