import { Recipe } from './types';

const RECIPES_STORAGE_KEY = 'recipe-flow-recipes';
const OAUTH_TOKEN_KEY = 'recipe-flow-oauth-token';

// OAuth token management
export function getOAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(OAUTH_TOKEN_KEY);
}

export function setOAuthToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(OAUTH_TOKEN_KEY, token);
}

export function clearOAuthToken(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(OAUTH_TOKEN_KEY);
}

export function hasOAuthToken(): boolean {
  return !!getOAuthToken();
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function getSavedRecipes(): Recipe[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const stored = localStorage.getItem(RECIPES_STORAGE_KEY);
  if (!stored) {
    return [];
  }

  try {
    const recipes = JSON.parse(stored) as Recipe[];
    // Sort by savedAt, newest first
    return recipes.sort((a, b) => {
      const dateA = a.savedAt ? new Date(a.savedAt).getTime() : 0;
      const dateB = b.savedAt ? new Date(b.savedAt).getTime() : 0;
      return dateB - dateA;
    });
  } catch {
    return [];
  }
}

export function saveRecipe(recipe: Recipe): Recipe {
  const recipes = getSavedRecipes();

  const slug = recipe.slug || generateSlug(recipe.title);
  const savedRecipe: Recipe = {
    ...recipe,
    slug,
    savedAt: new Date().toISOString(),
  };

  // Check if recipe with same slug exists
  const existingIndex = recipes.findIndex((r) => r.slug === slug);

  if (existingIndex >= 0) {
    // Overwrite existing
    recipes[existingIndex] = savedRecipe;
  } else {
    // Add new
    recipes.unshift(savedRecipe);
  }

  localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(recipes));

  return savedRecipe;
}

export function getRecipeBySlug(slug: string): Recipe | null {
  const recipes = getSavedRecipes();
  return recipes.find((r) => r.slug === slug) || null;
}

export function deleteRecipe(slug: string): void {
  const recipes = getSavedRecipes();
  const filtered = recipes.filter((r) => r.slug !== slug);
  localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(filtered));
}

export function updateRecipe(slug: string, updates: Partial<Recipe>): Recipe | null {
  const recipes = getSavedRecipes();
  const index = recipes.findIndex((r) => r.slug === slug);

  if (index < 0) {
    return null;
  }

  const updated: Recipe = {
    ...recipes[index],
    ...updates,
    savedAt: new Date().toISOString(),
  };

  recipes[index] = updated;
  localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(recipes));

  return updated;
}
