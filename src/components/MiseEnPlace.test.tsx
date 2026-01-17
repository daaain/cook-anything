import { describe, expect, it } from 'bun:test';
import type { Recipe } from '@/lib/types';
import { extractUniqueItems } from './MiseEnPlace';

describe('MiseEnPlace', () => {
  const createTestRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
    title: 'Test Recipe',
    servings: '4 servings',
    flowGroups: [],
    ...overrides,
  });

  describe('extractUniqueItems', () => {
    it('should return empty array for recipe with no flow groups', () => {
      const recipe = createTestRecipe({ flowGroups: [] });

      expect(extractUniqueItems(recipe, 'ingredients')).toEqual([]);
      expect(extractUniqueItems(recipe, 'equipment')).toEqual([]);
    });

    it('should collect ingredients from all steps', () => {
      const recipe = createTestRecipe({
        flowGroups: [
          {
            parallel: false,
            steps: [
              {
                stepNumber: 1,
                type: 'prep',
                instruction: 'Chop onions',
                ingredients: ['🧅 2 onions', '🧈 1 tbsp butter'],
                timerMinutes: 0,
              },
              {
                stepNumber: 2,
                type: 'cook',
                instruction: 'Fry',
                ingredients: ['🧄 3 cloves garlic'],
                timerMinutes: 5,
              },
            ],
          },
        ],
      });

      const ingredients = extractUniqueItems(recipe, 'ingredients');

      expect(ingredients).toHaveLength(3);
      expect(ingredients).toContain('🧅 2 onions');
      expect(ingredients).toContain('🧈 1 tbsp butter');
      expect(ingredients).toContain('🧄 3 cloves garlic');
    });

    it('should collect equipment from all steps', () => {
      const recipe = createTestRecipe({
        flowGroups: [
          {
            parallel: false,
            steps: [
              {
                stepNumber: 1,
                type: 'prep',
                instruction: 'Chop onions',
                ingredients: [],
                equipment: ['🔪 Chef knife', '🪵 Cutting board'],
                timerMinutes: 0,
              },
              {
                stepNumber: 2,
                type: 'cook',
                instruction: 'Fry',
                ingredients: [],
                equipment: ['🍳 Cast iron skillet'],
                timerMinutes: 5,
              },
            ],
          },
        ],
      });

      const equipment = extractUniqueItems(recipe, 'equipment');

      expect(equipment).toHaveLength(3);
      expect(equipment).toContain('🔪 Chef knife');
      expect(equipment).toContain('🪵 Cutting board');
      expect(equipment).toContain('🍳 Cast iron skillet');
    });

    it('should deduplicate items case-insensitively', () => {
      const recipe = createTestRecipe({
        flowGroups: [
          {
            parallel: false,
            steps: [
              {
                stepNumber: 1,
                type: 'prep',
                instruction: 'Step 1',
                ingredients: ['🧈 Butter', '🧅 Onion'],
                timerMinutes: 0,
              },
              {
                stepNumber: 2,
                type: 'cook',
                instruction: 'Step 2',
                ingredients: ['🧈 butter', '🧅 ONION'],
                timerMinutes: 0,
              },
            ],
          },
        ],
      });

      const ingredients = extractUniqueItems(recipe, 'ingredients');

      expect(ingredients).toHaveLength(2);
    });

    it('should preserve original casing of first occurrence', () => {
      const recipe = createTestRecipe({
        flowGroups: [
          {
            parallel: false,
            steps: [
              {
                stepNumber: 1,
                type: 'prep',
                instruction: 'Step 1',
                ingredients: ['🧈 2 tbsp Butter'],
                timerMinutes: 0,
              },
              {
                stepNumber: 2,
                type: 'cook',
                instruction: 'Step 2',
                ingredients: ['🧈 2 tbsp butter'],
                timerMinutes: 0,
              },
            ],
          },
        ],
      });

      const ingredients = extractUniqueItems(recipe, 'ingredients');

      expect(ingredients).toHaveLength(1);
      expect(ingredients[0]).toBe('🧈 2 tbsp Butter');
    });

    it('should handle steps without equipment (backward compatibility)', () => {
      const recipe = createTestRecipe({
        flowGroups: [
          {
            parallel: false,
            steps: [
              {
                stepNumber: 1,
                type: 'prep',
                instruction: 'Chop onions',
                ingredients: ['🧅 2 onions'],
                timerMinutes: 0,
              },
              {
                stepNumber: 2,
                type: 'cook',
                instruction: 'Fry',
                ingredients: [],
                equipment: ['🍳 Skillet'],
                timerMinutes: 5,
              },
            ],
          },
        ],
      });

      const equipment = extractUniqueItems(recipe, 'equipment');

      expect(equipment).toHaveLength(1);
      expect(equipment).toContain('🍳 Skillet');
    });

    it('should handle empty equipment arrays', () => {
      const recipe = createTestRecipe({
        flowGroups: [
          {
            parallel: false,
            steps: [
              {
                stepNumber: 1,
                type: 'prep',
                instruction: 'Mix ingredients',
                ingredients: ['🥚 2 eggs'],
                equipment: [],
                timerMinutes: 0,
              },
            ],
          },
        ],
      });

      const equipment = extractUniqueItems(recipe, 'equipment');

      expect(equipment).toEqual([]);
    });

    it('should collect items from parallel steps', () => {
      const recipe = createTestRecipe({
        flowGroups: [
          {
            parallel: true,
            steps: [
              {
                stepNumber: 1,
                type: 'prep',
                instruction: 'Boil water',
                ingredients: ['💧 Water'],
                equipment: ['🍲 Large pot'],
                timerMinutes: 10,
              },
              {
                stepNumber: 2,
                type: 'prep',
                instruction: 'Chop vegetables',
                ingredients: ['🥕 Carrots', '🥬 Cabbage'],
                equipment: ['🔪 Knife'],
                timerMinutes: 0,
              },
            ],
          },
        ],
      });

      const ingredients = extractUniqueItems(recipe, 'ingredients');
      const equipment = extractUniqueItems(recipe, 'equipment');

      expect(ingredients).toHaveLength(3);
      expect(equipment).toHaveLength(2);
    });

    it('should collect items from multiple flow groups', () => {
      const recipe = createTestRecipe({
        flowGroups: [
          {
            parallel: false,
            steps: [
              {
                stepNumber: 1,
                type: 'prep',
                instruction: 'Prep',
                ingredients: ['🧅 Onion'],
                equipment: ['🔪 Knife'],
                timerMinutes: 0,
              },
            ],
          },
          {
            parallel: false,
            steps: [
              {
                stepNumber: 2,
                type: 'cook',
                instruction: 'Cook',
                ingredients: ['🧈 Butter'],
                equipment: ['🍳 Pan'],
                timerMinutes: 5,
              },
            ],
          },
        ],
      });

      const ingredients = extractUniqueItems(recipe, 'ingredients');
      const equipment = extractUniqueItems(recipe, 'equipment');

      expect(ingredients).toHaveLength(2);
      expect(ingredients).toContain('🧅 Onion');
      expect(ingredients).toContain('🧈 Butter');
      expect(equipment).toHaveLength(2);
      expect(equipment).toContain('🔪 Knife');
      expect(equipment).toContain('🍳 Pan');
    });
  });
});
