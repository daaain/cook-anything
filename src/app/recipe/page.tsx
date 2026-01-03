'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FlowChart } from '@/components/FlowChart';
import { RecipeUploader } from '@/components/RecipeUploader';
import { RecipeExport } from '@/components/RecipeExport';
import { useRecipes } from '@/hooks/useRecipes';
import { Recipe, Message } from '@/lib/types';
import { ArrowLeft, Edit3, X, Trash2 } from 'lucide-react';
import Link from 'next/link';

function RecipePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = searchParams.get('slug');
  const { getBySlug, update, remove } = useRecipes();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (slug) {
      const loadedRecipe = getBySlug(slug);
      setRecipe(loadedRecipe);
    }
    setIsLoaded(true);
  }, [slug, getBySlug]);

  const handleRecipeUpdate = (updatedRecipe: Recipe) => {
    if (!slug) return;

    // Build conversation history for context
    const newHistory: Message[] = [
      ...(recipe?.conversationHistory || []),
      {
        role: 'assistant' as const,
        content: JSON.stringify(updatedRecipe),
      },
    ];

    const updated = update(slug, {
      ...updatedRecipe,
      conversationHistory: newHistory,
    });

    if (updated) {
      setRecipe(updated);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (!slug) return;
    if (confirm('Are you sure you want to delete this recipe?')) {
      remove(slug);
      router.push('/library');
    }
  };

  if (!isLoaded) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Recipe not found</h2>
          <p className="text-gray-600 mb-4">The recipe you&apos;re looking for doesn&apos;t exist.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-amber-600 font-medium hover:text-amber-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/library"
          className="flex items-center gap-2 text-amber-700 hover:text-amber-800 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Library
        </Link>

        <div className="flex items-center gap-2">
          <RecipeExport recipe={recipe} />

          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isEditing
                ? 'bg-gray-200 text-gray-700'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
            }`}
          >
            {isEditing ? (
              <>
                <X className="w-4 h-4" />
                Cancel
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4" />
                Edit
              </>
            )}
          </button>

          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Edit Panel */}
      {isEditing && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-medium text-amber-800 mb-3">Edit Recipe</h3>
          <p className="text-sm text-amber-700 mb-4">
            Add more images or describe changes you&apos;d like to make. Your changes will be applied to the current recipe.
          </p>
          <RecipeUploader
            onRecipeProcessed={handleRecipeUpdate}
            conversationHistory={recipe.conversationHistory}
          />
        </div>
      )}

      {/* Recipe FlowChart */}
      <FlowChart recipe={recipe} />
    </div>
  );
}

export default function RecipePage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    }>
      <RecipePageContent />
    </Suspense>
  );
}
