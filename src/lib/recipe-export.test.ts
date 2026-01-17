import { describe, expect, it } from 'bun:test';
import {
  generateExportFilename,
  generateRecipeHtml,
  parseRecipeFromHtml,
  prepareRecipeForExport,
  stripImagesFromConversation,
} from './recipe-export';
import type { Message, Recipe } from './types';

describe('recipe-export', () => {
  const createTestRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
    title: 'Test Recipe',
    servings: 4,
    slug: 'test-recipe',
    savedAt: '2024-01-15T10:30:00.000Z',
    flowGroups: [
      {
        parallel: false,
        steps: [
          {
            stepNumber: 1,
            type: 'prep',
            instruction: 'Chop the onions',
            ingredients: ['2 onions'],
            timerMinutes: 0,
          },
          {
            stepNumber: 2,
            type: 'cook',
            instruction: 'Fry until golden',
            ingredients: ['oil'],
            timerMinutes: 10,
          },
        ],
      },
    ],
    ...overrides,
  });

  describe('stripImagesFromConversation', () => {
    it('should return empty array for empty input', () => {
      expect(stripImagesFromConversation([])).toEqual([]);
    });

    it('should preserve text-only messages', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ];

      const result = stripImagesFromConversation(messages);

      expect(result).toEqual(messages);
    });

    it('should preserve text content in array format', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Check this recipe' }],
        },
      ];

      const result = stripImagesFromConversation(messages);

      expect(result).toEqual(messages);
    });

    it('should strip base64 image data and replace with placeholder', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Here is my recipe' },
            {
              type: 'image',
              image:
                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
              mimeType: 'image/png',
            },
          ],
        },
      ];

      const result = stripImagesFromConversation(messages);

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('user');
      expect(Array.isArray(result[0].content)).toBe(true);

      const content = result[0].content as Array<{ type: string; text?: string; image?: string }>;
      expect(content).toHaveLength(2);
      expect(content[0]).toEqual({ type: 'text', text: 'Here is my recipe' });
      expect(content[1]).toEqual({ type: 'image', text: '[image]' });
      expect(content[1].image).toBeUndefined();
    });

    it('should handle multiple images in conversation', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'image', image: 'base64data1', mimeType: 'image/jpeg' },
            { type: 'text', text: 'First image' },
          ],
        },
        {
          role: 'user',
          content: [{ type: 'image', image: 'base64data2', mimeType: 'image/png' }],
        },
      ];

      const result = stripImagesFromConversation(messages);

      expect(result).toHaveLength(2);

      const content1 = result[0].content as Array<{ type: string; text?: string }>;
      expect(content1[0]).toEqual({ type: 'image', text: '[image]' });
      expect(content1[1]).toEqual({ type: 'text', text: 'First image' });

      const content2 = result[1].content as Array<{ type: string; text?: string }>;
      expect(content2[0]).toEqual({ type: 'image', text: '[image]' });
    });
  });

  describe('prepareRecipeForExport', () => {
    it('should return recipe unchanged if no conversation history', () => {
      const recipe = createTestRecipe();

      const result = prepareRecipeForExport(recipe);

      expect(result).toEqual(recipe);
    });

    it('should strip images from conversation history', () => {
      const recipe = createTestRecipe({
        conversationHistory: [
          {
            role: 'user',
            content: [
              { type: 'image', image: 'base64data', mimeType: 'image/png' },
              { type: 'text', text: 'Parse this' },
            ],
          },
          { role: 'assistant', content: 'Here is your recipe!' },
        ],
      });

      const result = prepareRecipeForExport(recipe);

      expect(result.conversationHistory).toHaveLength(2);
      const userContent = result.conversationHistory?.[0].content as Array<{
        type: string;
        text?: string;
      }>;
      expect(userContent[0]).toEqual({ type: 'image', text: '[image]' });
      expect(userContent[1]).toEqual({ type: 'text', text: 'Parse this' });
      expect(result.conversationHistory?.[1].content).toBe('Here is your recipe!');
    });

    it('should not mutate the original recipe', () => {
      const originalImage = 'base64data';
      const recipe = createTestRecipe({
        conversationHistory: [
          {
            role: 'user',
            content: [{ type: 'image', image: originalImage, mimeType: 'image/png' }],
          },
        ],
      });

      prepareRecipeForExport(recipe);

      const content = recipe.conversationHistory?.[0].content as Array<{
        type: string;
        image?: string;
      }>;
      expect(content[0].image).toBe(originalImage);
    });
  });

  describe('generateRecipeHtml', () => {
    it('should generate valid HTML document', () => {
      const recipe = createTestRecipe();

      const html = generateRecipeHtml(recipe);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('</html>');
    });

    it('should include recipe title in HTML', () => {
      const recipe = createTestRecipe({ title: 'Delicious Pasta' });

      const html = generateRecipeHtml(recipe);

      expect(html).toContain('<title>Delicious Pasta - Recipe Flow</title>');
      expect(html).toContain('<h1>Delicious Pasta</h1>');
    });

    it('should include servings when provided', () => {
      const recipe = createTestRecipe({ servings: 6 });

      const html = generateRecipeHtml(recipe);

      expect(html).toContain('6');
    });

    it('should embed JSON data in script tag', () => {
      const recipe = createTestRecipe();

      const html = generateRecipeHtml(recipe);

      expect(html).toContain('<script type="application/json" id="recipe-data">');
      expect(html).toContain('"title": "Test Recipe"');
      expect(html).toContain('"slug": "test-recipe"');
    });

    it('should include step instructions', () => {
      const recipe = createTestRecipe();

      const html = generateRecipeHtml(recipe);

      expect(html).toContain('Chop the onions');
      expect(html).toContain('Fry until golden');
    });

    it('should include timer when set', () => {
      const recipe = createTestRecipe();

      const html = generateRecipeHtml(recipe);

      expect(html).toContain('10 min');
    });

    it('should include ingredients', () => {
      const recipe = createTestRecipe();

      const html = generateRecipeHtml(recipe);

      expect(html).toContain('2 onions');
      expect(html).toContain('oil');
    });

    it('should handle parallel steps', () => {
      const recipe = createTestRecipe({
        flowGroups: [
          {
            parallel: true,
            steps: [
              {
                stepNumber: 1,
                type: 'prep',
                instruction: 'Boil water',
                ingredients: [],
                timerMinutes: 0,
              },
              {
                stepNumber: 2,
                type: 'prep',
                instruction: 'Chop vegetables',
                ingredients: [],
                timerMinutes: 0,
              },
            ],
          },
        ],
      });

      const html = generateRecipeHtml(recipe);

      expect(html).toContain('These can be done in parallel');
      expect(html).toContain('Boil water');
      expect(html).toContain('Chop vegetables');
    });

    it('should strip images from embedded JSON', () => {
      const recipe = createTestRecipe({
        conversationHistory: [
          {
            role: 'user',
            content: [{ type: 'image', image: 'hugebase64string', mimeType: 'image/png' }],
          },
        ],
      });

      const html = generateRecipeHtml(recipe);

      expect(html).not.toContain('hugebase64string');
      expect(html).toContain('[image]');
    });
  });

  describe('parseRecipeFromHtml', () => {
    it('should parse recipe from valid HTML export', () => {
      const originalRecipe = createTestRecipe();
      const html = generateRecipeHtml(originalRecipe);

      const parsed = parseRecipeFromHtml(html);

      expect(parsed).not.toBeNull();
      expect(parsed?.title).toBe('Test Recipe');
      expect(parsed?.slug).toBe('test-recipe');
      expect(parsed?.savedAt).toBe('2024-01-15T10:30:00.000Z');
      expect(parsed?.flowGroups).toHaveLength(1);
      expect(parsed?.flowGroups[0].steps).toHaveLength(2);
    });

    it('should return null for HTML without recipe data', () => {
      const html = '<html><body>No recipe here</body></html>';

      const parsed = parseRecipeFromHtml(html);

      expect(parsed).toBeNull();
    });

    it('should return null for invalid JSON in script tag', () => {
      const html = `
        <html>
          <script type="application/json" id="recipe-data">
            { invalid json }
          </script>
        </html>
      `;

      const parsed = parseRecipeFromHtml(html);

      expect(parsed).toBeNull();
    });

    it('should return null for JSON missing required fields', () => {
      const html = `
        <html>
          <script type="application/json" id="recipe-data">
            { "notARecipe": true }
          </script>
        </html>
      `;

      const parsed = parseRecipeFromHtml(html);

      expect(parsed).toBeNull();
    });

    it('should handle recipe without optional fields', () => {
      const html = `
        <html>
          <script type="application/json" id="recipe-data">
            {
              "title": "Minimal Recipe",
              "flowGroups": []
            }
          </script>
        </html>
      `;

      const parsed = parseRecipeFromHtml(html);

      expect(parsed).not.toBeNull();
      expect(parsed?.title).toBe('Minimal Recipe');
      expect(parsed?.flowGroups).toEqual([]);
    });

    it('should preserve conversation history with image placeholders', () => {
      const recipe = createTestRecipe({
        conversationHistory: [
          {
            role: 'user',
            content: [
              { type: 'image', image: 'base64data', mimeType: 'image/png' },
              { type: 'text', text: 'My recipe photo' },
            ],
          },
        ],
      });

      const html = generateRecipeHtml(recipe);
      const parsed = parseRecipeFromHtml(html);

      expect(parsed?.conversationHistory).toHaveLength(1);
      const content = parsed?.conversationHistory?.[0].content as Array<{
        type: string;
        text?: string;
      }>;
      expect(content[0]).toEqual({ type: 'image', text: '[image]' });
      expect(content[1]).toEqual({ type: 'text', text: 'My recipe photo' });
    });

    it('should complete round-trip export/import correctly', () => {
      const originalRecipe = createTestRecipe({
        title: 'Round Trip Recipe',
        servings: 8,
        measureSystem: 'metric',
        servingsCount: 8,
        flowGroups: [
          {
            parallel: false,
            steps: [
              {
                stepNumber: 1,
                type: 'prep',
                instruction: 'Step 1',
                ingredients: ['a', 'b'],
                timerMinutes: 5,
              },
            ],
          },
          {
            parallel: true,
            steps: [
              {
                stepNumber: 2,
                type: 'cook',
                instruction: 'Step 2',
                ingredients: [],
                timerMinutes: 10,
              },
              {
                stepNumber: 3,
                type: 'rest',
                instruction: 'Step 3',
                ingredients: ['c'],
                timerMinutes: 0,
              },
            ],
          },
        ],
      });

      const html = generateRecipeHtml(originalRecipe);
      const parsed = parseRecipeFromHtml(html);

      expect(parsed?.title).toBe(originalRecipe.title);
      expect(parsed?.servings).toBe(originalRecipe.servings);
      expect(parsed?.slug).toBe(originalRecipe.slug);
      expect(parsed?.savedAt).toBe(originalRecipe.savedAt);
      expect(parsed?.measureSystem).toBe(originalRecipe.measureSystem);
      expect(parsed?.servingsCount).toBe(originalRecipe.servingsCount);
      expect(parsed?.flowGroups).toHaveLength(2);
      expect(parsed?.flowGroups[0].parallel).toBe(false);
      expect(parsed?.flowGroups[1].parallel).toBe(true);
    });
  });

  describe('generateExportFilename', () => {
    it('should use slug when available', () => {
      const recipe = createTestRecipe({ slug: 'my-recipe-slug' });

      const filename = generateExportFilename(recipe);

      expect(filename).toBe('my-recipe-slug.html');
    });

    it('should generate slug from title when slug is missing', () => {
      const recipe = createTestRecipe({ slug: undefined, title: 'My Amazing Recipe' });

      const filename = generateExportFilename(recipe);

      expect(filename).toBe('my-amazing-recipe.html');
    });

    it('should handle special characters in title', () => {
      const recipe = createTestRecipe({ slug: undefined, title: "Chef's Special (2024)" });

      const filename = generateExportFilename(recipe);

      expect(filename).toBe("chef's-special-(2024).html");
    });
  });
});
