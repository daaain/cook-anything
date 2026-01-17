import { describe, expect, it } from 'bun:test';
import JSZip from 'jszip';
import { parseRecipeFromHtml } from './recipe-export';
import { exportAllRecipesToZip, generateZipFilename } from './recipe-zip';
import type { Recipe } from './types';

describe('recipe-zip', () => {
  const createTestRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
    title: 'Test Recipe',
    slug: 'test-recipe',
    savedAt: '2024-01-15T10:00:00.000Z',
    flowGroups: [
      {
        parallel: false,
        steps: [
          {
            stepNumber: 1,
            type: 'prep',
            instruction: 'Test step',
            ingredients: [],
            timerMinutes: 0,
          },
        ],
      },
    ],
    ...overrides,
  });

  describe('exportAllRecipesToZip', () => {
    it('should create a valid ZIP blob', async () => {
      const recipes = [createTestRecipe()];

      const blob = await exportAllRecipesToZip(recipes);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/zip');
    });

    it('should include all recipes as HTML files', async () => {
      const recipes = [
        createTestRecipe({ slug: 'recipe-1', title: 'Recipe One' }),
        createTestRecipe({ slug: 'recipe-2', title: 'Recipe Two' }),
        createTestRecipe({ slug: 'recipe-3', title: 'Recipe Three' }),
      ];

      const blob = await exportAllRecipesToZip(recipes);
      const zip = await JSZip.loadAsync(blob);

      const files = Object.keys(zip.files);
      expect(files).toHaveLength(3);
      expect(files).toContain('recipe-1.html');
      expect(files).toContain('recipe-2.html');
      expect(files).toContain('recipe-3.html');
    });

    it('should generate valid HTML content in each file', async () => {
      const recipes = [createTestRecipe({ slug: 'test-recipe', title: 'My Test Recipe' })];

      const blob = await exportAllRecipesToZip(recipes);
      const zip = await JSZip.loadAsync(blob);

      const htmlContent = await zip.file('test-recipe.html')?.async('string');

      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('My Test Recipe');
      expect(htmlContent).toContain('<script type="application/json" id="recipe-data">');
    });

    it('should embed parseable JSON in each HTML file', async () => {
      const recipes = [
        createTestRecipe({
          slug: 'parseable',
          title: 'Parseable Recipe',
          servings: 4,
        }),
      ];

      const blob = await exportAllRecipesToZip(recipes);
      const zip = await JSZip.loadAsync(blob);

      const htmlContent = await zip.file('parseable.html')!.async('string');
      const parsed = parseRecipeFromHtml(htmlContent);

      expect(parsed).not.toBeNull();
      expect(parsed?.title).toBe('Parseable Recipe');
      expect(parsed?.slug).toBe('parseable');
      expect(parsed?.servings).toBe(4);
    });

    it('should handle empty recipe list', async () => {
      const blob = await exportAllRecipesToZip([]);
      const zip = await JSZip.loadAsync(blob);

      const files = Object.keys(zip.files);
      expect(files).toHaveLength(0);
    });

    it('should handle duplicate slugs by appending numbers', async () => {
      const recipes = [
        createTestRecipe({ slug: 'same-slug', title: 'First' }),
        createTestRecipe({ slug: 'same-slug', title: 'Second' }),
        createTestRecipe({ slug: 'same-slug', title: 'Third' }),
      ];

      const blob = await exportAllRecipesToZip(recipes);
      const zip = await JSZip.loadAsync(blob);

      const files = Object.keys(zip.files);
      expect(files).toHaveLength(3);
      expect(files).toContain('same-slug.html');
      expect(files).toContain('same-slug-2.html');
      expect(files).toContain('same-slug-3.html');
    });

    it('should strip images from conversation history', async () => {
      const recipes = [
        createTestRecipe({
          slug: 'with-images',
          conversationHistory: [
            {
              role: 'user',
              content: [{ type: 'image', image: 'verylongbase64string', mimeType: 'image/png' }],
            },
          ],
        }),
      ];

      const blob = await exportAllRecipesToZip(recipes);
      const zip = await JSZip.loadAsync(blob);

      const htmlContent = await zip.file('with-images.html')?.async('string');

      expect(htmlContent).not.toContain('verylongbase64string');
      expect(htmlContent).toContain('[image]');
    });

    it('should preserve all recipe metadata', async () => {
      const recipes = [
        createTestRecipe({
          slug: 'full-metadata',
          title: 'Full Metadata Recipe',
          servings: 8,
          measureSystem: 'american',
          servingsCount: 8,
          savedAt: '2024-06-15T14:30:00.000Z',
        }),
      ];

      const blob = await exportAllRecipesToZip(recipes);
      const zip = await JSZip.loadAsync(blob);

      const htmlContent = await zip.file('full-metadata.html')!.async('string');
      const parsed = parseRecipeFromHtml(htmlContent);

      expect(parsed?.measureSystem).toBe('american');
      expect(parsed?.servingsCount).toBe(8);
      expect(parsed?.savedAt).toBe('2024-06-15T14:30:00.000Z');
    });
  });

  describe('generateZipFilename', () => {
    it('should include current date in filename', () => {
      const filename = generateZipFilename();

      expect(filename).toMatch(/^recipes-export-\d{4}-\d{2}-\d{2}\.zip$/);
    });

    it('should start with recipes-export prefix', () => {
      const filename = generateZipFilename();

      expect(filename.startsWith('recipes-export-')).toBe(true);
    });

    it('should end with .zip extension', () => {
      const filename = generateZipFilename();

      expect(filename.endsWith('.zip')).toBe(true);
    });
  });
});
