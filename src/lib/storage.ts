import type { MeasureSystem, ModelId, ProviderType, Recipe } from './types';

const RECIPES_STORAGE_KEY = 'recipe-flow-recipes';
const OAUTH_TOKEN_KEY = 'recipe-flow-oauth-token';
const MODEL_KEY = 'recipe-flow-model';
const MEASURE_SYSTEM_KEY = 'recipe-flow-measure-system';
const SERVINGS_KEY = 'recipe-flow-servings';
const PROVIDER_TYPE_KEY = 'recipe-flow-provider-type';
const API_ENDPOINT_KEY = 'recipe-flow-api-endpoint';
const CUSTOM_MODEL_KEY = 'recipe-flow-custom-model';

const DEFAULT_MODEL: ModelId = 'opus';
const DEFAULT_MEASURE_SYSTEM: MeasureSystem = 'metric';
const DEFAULT_SERVINGS = 4;
const DEFAULT_PROVIDER_TYPE: ProviderType = 'claude';
const DEFAULT_API_ENDPOINT = 'http://localhost:1234/v1';

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

// Model selection management
export function getModel(): ModelId {
  if (typeof window === 'undefined') {
    return DEFAULT_MODEL;
  }
  const stored = localStorage.getItem(MODEL_KEY);
  if (stored === 'haiku' || stored === 'sonnet' || stored === 'opus') {
    return stored;
  }
  return DEFAULT_MODEL;
}

export function setModel(model: ModelId): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(MODEL_KEY, model);
}

// Measure system preference management
export function getMeasureSystem(): MeasureSystem {
  if (typeof window === 'undefined') {
    return DEFAULT_MEASURE_SYSTEM;
  }
  const stored = localStorage.getItem(MEASURE_SYSTEM_KEY);
  if (stored === 'metric' || stored === 'american') {
    return stored;
  }
  return DEFAULT_MEASURE_SYSTEM;
}

export function setMeasureSystem(system: MeasureSystem): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(MEASURE_SYSTEM_KEY, system);
}

// Servings preference management
export function getServings(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_SERVINGS;
  }
  const stored = localStorage.getItem(SERVINGS_KEY);
  if (stored) {
    const parsed = parseInt(stored, 10);
    if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 100) {
      return parsed;
    }
  }
  return DEFAULT_SERVINGS;
}

export function setServings(servings: number): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(SERVINGS_KEY, String(servings));
}

// Provider type management
export function getProviderType(): ProviderType {
  if (typeof window === 'undefined') {
    return DEFAULT_PROVIDER_TYPE;
  }
  const stored = localStorage.getItem(PROVIDER_TYPE_KEY);
  if (stored === 'claude' || stored === 'openai-local') {
    return stored;
  }
  return DEFAULT_PROVIDER_TYPE;
}

export function setProviderType(providerType: ProviderType): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(PROVIDER_TYPE_KEY, providerType);
}

// API endpoint management
export function getApiEndpoint(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_API_ENDPOINT;
  }
  const stored = localStorage.getItem(API_ENDPOINT_KEY);
  return stored || DEFAULT_API_ENDPOINT;
}

export function setApiEndpoint(endpoint: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(API_ENDPOINT_KEY, endpoint);
}

// Custom model management
export function getCustomModel(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(CUSTOM_MODEL_KEY);
}

export function setCustomModel(model: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(CUSTOM_MODEL_KEY, model);
}

export function clearCustomModel(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(CUSTOM_MODEL_KEY);
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

export type ImportAction = 'added' | 'updated' | 'skipped';

export interface ImportResult {
  added: Recipe[];
  updated: Recipe[];
  skipped: Recipe[];
}

/**
 * Import a single recipe with timestamp-based reconciliation.
 * - If no existing recipe with same slug: adds and returns 'added'
 * - If existing recipe is older: updates and returns 'updated'
 * - If existing recipe is newer or same: returns 'skipped'
 *
 * Preserves the original savedAt from the imported recipe.
 */
export function importRecipe(recipe: Recipe): ImportAction {
  if (typeof window === 'undefined') {
    return 'skipped';
  }

  const recipes = getSavedRecipes();
  const slug = recipe.slug || generateSlug(recipe.title);

  const importedRecipe: Recipe = {
    ...recipe,
    slug,
    // Preserve original savedAt, or use epoch if missing (treat as very old)
    savedAt: recipe.savedAt || new Date(0).toISOString(),
  };

  const existingIndex = recipes.findIndex((r) => r.slug === slug);

  if (existingIndex < 0) {
    // No existing recipe - add it
    recipes.unshift(importedRecipe);
    localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(recipes));
    return 'added';
  }

  const existing = recipes[existingIndex];
  const existingTime = existing.savedAt ? new Date(existing.savedAt).getTime() : 0;
  const importedTime = importedRecipe.savedAt ? new Date(importedRecipe.savedAt).getTime() : 0;

  if (importedTime > existingTime) {
    // Imported recipe is newer - update
    recipes[existingIndex] = importedRecipe;
    localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(recipes));
    return 'updated';
  }

  // Existing recipe is newer or same - skip
  return 'skipped';
}

/**
 * Preview what would happen if recipes were imported.
 * Does not modify storage.
 */
export function previewImport(recipesToImport: Recipe[]): ImportResult {
  const existingRecipes = getSavedRecipes();
  const result: ImportResult = {
    added: [],
    updated: [],
    skipped: [],
  };

  for (const recipe of recipesToImport) {
    const slug = recipe.slug || generateSlug(recipe.title);
    const existing = existingRecipes.find((r) => r.slug === slug);

    if (!existing) {
      result.added.push(recipe);
      continue;
    }

    const existingTime = existing.savedAt ? new Date(existing.savedAt).getTime() : 0;
    const importedTime = recipe.savedAt ? new Date(recipe.savedAt).getTime() : 0;

    if (importedTime > existingTime) {
      result.updated.push(recipe);
    } else {
      result.skipped.push(recipe);
    }
  }

  return result;
}

/**
 * Import multiple recipes with reconciliation.
 * Returns a summary of what was imported.
 */
export function importRecipes(recipesToImport: Recipe[]): ImportResult {
  const result: ImportResult = {
    added: [],
    updated: [],
    skipped: [],
  };

  for (const recipe of recipesToImport) {
    const action = importRecipe(recipe);
    result[action].push(recipe);
  }

  return result;
}
