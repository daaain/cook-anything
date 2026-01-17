import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { getSavedRecipes, importRecipe, importRecipes, previewImport } from './storage';
import type { Recipe } from './types';

describe('storage import functions', () => {
  const STORAGE_KEY = 'recipe-flow-recipes';

  // Helper to create test recipes
  const createTestRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
    title: 'Test Recipe',
    slug: 'test-recipe',
    savedAt: '2024-01-15T10:00:00.000Z',
    ingredients: [],
    equipment: [],
    flowGroups: [],
    ...overrides,
  });

  // Helper to directly set recipes in storage (bypassing saveRecipe which updates savedAt)
  const setStorageRecipes = (recipes: Recipe[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
  };

  // Clear storage before each test
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('importRecipe', () => {
    it('should add a new recipe when slug does not exist', () => {
      const recipe = createTestRecipe({ slug: 'new-recipe', title: 'New Recipe' });

      const result = importRecipe(recipe);

      expect(result).toBe('added');
      const saved = getSavedRecipes();
      expect(saved).toHaveLength(1);
      expect(saved[0].slug).toBe('new-recipe');
    });

    it('should preserve original savedAt when adding', () => {
      const originalDate = '2023-06-15T08:30:00.000Z';
      const recipe = createTestRecipe({ savedAt: originalDate });

      importRecipe(recipe);

      const saved = getSavedRecipes();
      expect(saved[0].savedAt).toBe(originalDate);
    });

    it('should update when imported recipe is newer', () => {
      // Set an older recipe directly in storage (bypassing saveRecipe which updates savedAt)
      setStorageRecipes([
        createTestRecipe({
          slug: 'test-recipe',
          title: 'Old Title',
          savedAt: '2024-01-01T00:00:00.000Z',
        }),
      ]);

      // Import a newer version
      const newerRecipe = createTestRecipe({
        slug: 'test-recipe',
        title: 'New Title',
        savedAt: '2024-01-20T00:00:00.000Z',
      });

      const result = importRecipe(newerRecipe);

      expect(result).toBe('updated');
      const saved = getSavedRecipes();
      expect(saved).toHaveLength(1);
      expect(saved[0].title).toBe('New Title');
      expect(saved[0].savedAt).toBe('2024-01-20T00:00:00.000Z');
    });

    it('should skip when existing recipe is newer', () => {
      // Set a newer recipe directly in storage
      setStorageRecipes([
        createTestRecipe({
          slug: 'test-recipe',
          title: 'Newer Local',
          savedAt: '2024-01-20T00:00:00.000Z',
        }),
      ]);

      // Try to import an older version
      const olderRecipe = createTestRecipe({
        slug: 'test-recipe',
        title: 'Older Import',
        savedAt: '2024-01-01T00:00:00.000Z',
      });

      const result = importRecipe(olderRecipe);

      expect(result).toBe('skipped');
      const saved = getSavedRecipes();
      expect(saved).toHaveLength(1);
      expect(saved[0].title).toBe('Newer Local');
    });

    it('should skip when timestamps are equal', () => {
      const sameDate = '2024-01-15T12:00:00.000Z';

      setStorageRecipes([
        createTestRecipe({
          slug: 'test-recipe',
          title: 'Local Version',
          savedAt: sameDate,
        }),
      ]);

      const importedRecipe = createTestRecipe({
        slug: 'test-recipe',
        title: 'Imported Version',
        savedAt: sameDate,
      });

      const result = importRecipe(importedRecipe);

      expect(result).toBe('skipped');
      const saved = getSavedRecipes();
      expect(saved[0].title).toBe('Local Version');
    });

    it('should generate slug from title if missing', () => {
      const recipe = createTestRecipe({
        slug: undefined,
        title: 'My New Recipe',
      });

      const result = importRecipe(recipe);

      expect(result).toBe('added');
      const saved = getSavedRecipes();
      expect(saved[0].slug).toBe('my-new-recipe');
    });

    it('should treat missing savedAt as very old (epoch)', () => {
      // Set a recipe with a real date directly in storage
      setStorageRecipes([
        createTestRecipe({
          slug: 'test-recipe',
          title: 'Has Date',
          savedAt: '2020-01-01T00:00:00.000Z',
        }),
      ]);

      // Import without savedAt
      const noDateRecipe = createTestRecipe({
        slug: 'test-recipe',
        title: 'No Date',
        savedAt: undefined,
      });

      const result = importRecipe(noDateRecipe);

      expect(result).toBe('skipped');
    });

    it('should add recipe without savedAt to empty storage', () => {
      const recipe = createTestRecipe({ savedAt: undefined });

      const result = importRecipe(recipe);

      expect(result).toBe('added');
      const saved = getSavedRecipes();
      expect(saved[0].savedAt).toBe('1970-01-01T00:00:00.000Z');
    });
  });

  describe('previewImport', () => {
    it('should return empty results for empty input', () => {
      const result = previewImport([]);

      expect(result.added).toEqual([]);
      expect(result.updated).toEqual([]);
      expect(result.skipped).toEqual([]);
    });

    it('should categorise new recipes as added', () => {
      const recipes = [
        createTestRecipe({ slug: 'recipe-1', title: 'Recipe 1' }),
        createTestRecipe({ slug: 'recipe-2', title: 'Recipe 2' }),
      ];

      const result = previewImport(recipes);

      expect(result.added).toHaveLength(2);
      expect(result.updated).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
    });

    it('should categorise newer imports as updated', () => {
      setStorageRecipes([
        createTestRecipe({
          slug: 'existing',
          savedAt: '2024-01-01T00:00:00.000Z',
        }),
      ]);

      const recipes = [
        createTestRecipe({
          slug: 'existing',
          savedAt: '2024-02-01T00:00:00.000Z',
        }),
      ];

      const result = previewImport(recipes);

      expect(result.added).toHaveLength(0);
      expect(result.updated).toHaveLength(1);
      expect(result.skipped).toHaveLength(0);
    });

    it('should categorise older imports as skipped', () => {
      setStorageRecipes([
        createTestRecipe({
          slug: 'existing',
          savedAt: '2024-02-01T00:00:00.000Z',
        }),
      ]);

      const recipes = [
        createTestRecipe({
          slug: 'existing',
          savedAt: '2024-01-01T00:00:00.000Z',
        }),
      ];

      const result = previewImport(recipes);

      expect(result.added).toHaveLength(0);
      expect(result.updated).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
    });

    it('should handle mixed scenarios', () => {
      setStorageRecipes([
        createTestRecipe({
          slug: 'old-local',
          savedAt: '2024-01-01T00:00:00.000Z',
        }),
        createTestRecipe({
          slug: 'new-local',
          savedAt: '2024-03-01T00:00:00.000Z',
        }),
      ]);

      const recipes = [
        createTestRecipe({ slug: 'brand-new', savedAt: '2024-02-01T00:00:00.000Z' }),
        createTestRecipe({ slug: 'old-local', savedAt: '2024-02-01T00:00:00.000Z' }), // newer than local
        createTestRecipe({ slug: 'new-local', savedAt: '2024-02-01T00:00:00.000Z' }), // older than local
      ];

      const result = previewImport(recipes);

      expect(result.added).toHaveLength(1);
      expect(result.added[0].slug).toBe('brand-new');
      expect(result.updated).toHaveLength(1);
      expect(result.updated[0].slug).toBe('old-local');
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].slug).toBe('new-local');
    });

    it('should not modify storage', () => {
      setStorageRecipes([createTestRecipe({ slug: 'existing' })]);

      previewImport([
        createTestRecipe({ slug: 'new-recipe' }),
        createTestRecipe({ slug: 'existing', savedAt: '2025-01-01T00:00:00.000Z' }),
      ]);

      const saved = getSavedRecipes();
      expect(saved).toHaveLength(1);
      expect(saved[0].slug).toBe('existing');
    });
  });

  describe('importRecipes', () => {
    it('should import multiple recipes and return results', () => {
      const recipes = [
        createTestRecipe({ slug: 'recipe-1', title: 'Recipe 1' }),
        createTestRecipe({ slug: 'recipe-2', title: 'Recipe 2' }),
        createTestRecipe({ slug: 'recipe-3', title: 'Recipe 3' }),
      ];

      const result = importRecipes(recipes);

      expect(result.added).toHaveLength(3);
      expect(result.updated).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);

      const saved = getSavedRecipes();
      expect(saved).toHaveLength(3);
    });

    it('should handle mixed add/update/skip scenarios', () => {
      // Set up existing recipes directly in storage
      setStorageRecipes([
        createTestRecipe({
          slug: 'will-update',
          title: 'Old Version',
          savedAt: '2024-01-01T00:00:00.000Z',
        }),
        createTestRecipe({
          slug: 'will-skip',
          title: 'Newer Local',
          savedAt: '2024-03-01T00:00:00.000Z',
        }),
      ]);

      const recipes = [
        createTestRecipe({ slug: 'new-recipe', savedAt: '2024-02-01T00:00:00.000Z' }),
        createTestRecipe({
          slug: 'will-update',
          title: 'New Version',
          savedAt: '2024-02-01T00:00:00.000Z',
        }),
        createTestRecipe({
          slug: 'will-skip',
          title: 'Older Import',
          savedAt: '2024-02-01T00:00:00.000Z',
        }),
      ];

      const result = importRecipes(recipes);

      expect(result.added).toHaveLength(1);
      expect(result.updated).toHaveLength(1);
      expect(result.skipped).toHaveLength(1);

      const saved = getSavedRecipes();
      expect(saved).toHaveLength(3);

      const updated = saved.find((r) => r.slug === 'will-update');
      expect(updated?.title).toBe('New Version');

      const skipped = saved.find((r) => r.slug === 'will-skip');
      expect(skipped?.title).toBe('Newer Local');
    });

    it('should return empty results for empty input', () => {
      const result = importRecipes([]);

      expect(result.added).toEqual([]);
      expect(result.updated).toEqual([]);
      expect(result.skipped).toEqual([]);
    });

    it('should preserve all recipe data on import', () => {
      const fullRecipe = createTestRecipe({
        slug: 'full-recipe',
        title: 'Full Recipe',
        servings: 6,
        measureSystem: 'metric',
        servingsCount: 6,
        flowGroups: [
          {
            parallel: false,
            steps: [
              {
                stepNumber: 1,
                type: 'prep',
                instruction: 'Do stuff',
                ingredients: ['a', 'b'],
                timerMinutes: 5,
              },
            ],
          },
        ],
        conversationHistory: [
          { role: 'user', content: 'Make me food' },
          { role: 'assistant', content: 'Here you go!' },
        ],
      });

      importRecipes([fullRecipe]);

      const saved = getSavedRecipes();
      expect(saved[0].title).toBe('Full Recipe');
      expect(saved[0].servings).toBe(6);
      expect(saved[0].measureSystem).toBe('metric');
      expect(saved[0].servingsCount).toBe(6);
      expect(saved[0].flowGroups).toHaveLength(1);
      expect(saved[0].conversationHistory).toHaveLength(2);
    });
  });
});
