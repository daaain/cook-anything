'use client';

import { useState, useEffect, useCallback } from 'react';
import { Recipe } from '@/lib/types';
import {
  getSavedRecipes,
  saveRecipe,
  deleteRecipe,
  getRecipeBySlug,
  updateRecipe,
} from '@/lib/storage';

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setRecipes(getSavedRecipes());
    setIsLoaded(true);
  }, []);

  const refresh = useCallback(() => {
    setRecipes(getSavedRecipes());
  }, []);

  const save = useCallback(
    (recipe: Recipe): Recipe => {
      const saved = saveRecipe(recipe);
      refresh();
      return saved;
    },
    [refresh],
  );

  const remove = useCallback(
    (slug: string) => {
      deleteRecipe(slug);
      refresh();
    },
    [refresh],
  );

  const getBySlug = useCallback((slug: string): Recipe | null => {
    return getRecipeBySlug(slug);
  }, []);

  const update = useCallback(
    (slug: string, updates: Partial<Recipe>): Recipe | null => {
      const updated = updateRecipe(slug, updates);
      if (updated) {
        refresh();
      }
      return updated;
    },
    [refresh],
  );

  return {
    recipes,
    isLoaded,
    save,
    remove,
    getBySlug,
    update,
    refresh,
  };
}
