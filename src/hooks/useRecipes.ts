'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  deleteRecipe,
  getRecipeBySlug,
  getSavedRecipes,
  saveRecipe,
  updateRecipe,
} from '@/lib/storage';
import type { Recipe } from '@/lib/types';

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- Valid pattern for SSR hydration */
  useEffect(() => {
    setRecipes(getSavedRecipes());
    setIsLoaded(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

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
