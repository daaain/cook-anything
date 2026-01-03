'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RecipeUploader } from '@/components/RecipeUploader';
import { OAuthToken, Recipe } from '@/lib/types';
import { getTokenFromStorage, getTokenStatus } from '@/lib/token';
import { useRecipes } from '@/hooks/useRecipes';
import { Settings, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const [token, setToken] = useState<OAuthToken | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();
  const { save } = useRecipes();

  useEffect(() => {
    const storedToken = getTokenFromStorage();
    setToken(storedToken);
    setIsLoaded(true);
  }, []);

  const handleRecipeProcessed = (recipe: Recipe) => {
    // Save the recipe
    const savedRecipe = save(recipe);
    // Navigate to the recipe view
    router.push(`/recipe?slug=${savedRecipe.slug}`);
  };

  const tokenStatus = getTokenStatus(token);

  if (!isLoaded) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-amber-900 mb-2">
          Recipe Flow
        </h1>
        <p className="text-amber-700">
          Transform recipe screenshots into interactive cooking flowcharts
        </p>
      </div>

      {/* Token Status Banner */}
      {tokenStatus !== 'valid' && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Settings className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-800">
                {tokenStatus === 'expired' ? 'Token Expired' : 'Set Up Your API Token'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {tokenStatus === 'expired'
                  ? 'Your API token has expired. Please update it to continue processing recipes.'
                  : 'Add your Claude API token to start transforming recipes.'}
              </p>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1 text-sm text-amber-600 font-medium mt-2 hover:text-amber-700"
              >
                Go to Settings
                <Sparkles className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Uploader */}
      <RecipeUploader
        token={token}
        onRecipeProcessed={handleRecipeProcessed}
      />

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
