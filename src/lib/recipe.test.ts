import { describe, expect, it } from 'bun:test';
import {
  buildUserPrompt,
  ClarifyingQuestionSchema,
  ClarifyingQuestionsResponseSchema,
  ProcessResponseSchema,
  type QuestionAnswer,
  RecipeResponseSchema,
} from './recipe';

describe('Clarifying Questions Schemas', () => {
  describe('ClarifyingQuestionSchema', () => {
    it('should validate a valid question', () => {
      const question = {
        id: 'cuisine-style',
        question: 'What cuisine style would you prefer?',
        options: ['Italian', 'Asian'],
      };

      const result = ClarifyingQuestionSchema.safeParse(question);
      expect(result.success).toBe(true);
    });

    it('should require at least 2 options', () => {
      const question = {
        id: 'test',
        question: 'Test question?',
        options: ['Only one'],
      };

      const result = ClarifyingQuestionSchema.safeParse(question);
      expect(result.success).toBe(false);
    });

    it('should allow up to 5 options', () => {
      const question = {
        id: 'test',
        question: 'Test question?',
        options: ['One', 'Two', 'Three', 'Four', 'Five'],
      };

      const result = ClarifyingQuestionSchema.safeParse(question);
      expect(result.success).toBe(true);
    });

    it('should reject more than 5 options', () => {
      const question = {
        id: 'test',
        question: 'Test question?',
        options: ['One', 'Two', 'Three', 'Four', 'Five', 'Six'],
      };

      const result = ClarifyingQuestionSchema.safeParse(question);
      expect(result.success).toBe(false);
    });
  });

  describe('ClarifyingQuestionsResponseSchema', () => {
    it('should validate a valid clarifying questions response', () => {
      const response = {
        type: 'clarifying_questions' as const,
        questions: [
          {
            id: 'cuisine',
            question: 'What cuisine?',
            options: ['Italian', 'Mexican'],
          },
        ],
        context: 'To help create the perfect recipe',
      };

      const result = ClarifyingQuestionsResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should require at least 1 question', () => {
      const response = {
        type: 'clarifying_questions' as const,
        questions: [],
      };

      const result = ClarifyingQuestionsResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('should allow up to 5 questions', () => {
      const questions = Array.from({ length: 5 }, (_, i) => ({
        id: `q${i}`,
        question: `Question ${i}?`,
        options: ['Yes', 'No'],
      }));

      const response = {
        type: 'clarifying_questions' as const,
        questions,
      };

      const result = ClarifyingQuestionsResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should reject more than 5 questions', () => {
      const questions = Array.from({ length: 6 }, (_, i) => ({
        id: `q${i}`,
        question: `Question ${i}?`,
        options: ['Yes', 'No'],
      }));

      const response = {
        type: 'clarifying_questions' as const,
        questions,
      };

      const result = ClarifyingQuestionsResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('should allow optional context', () => {
      const response = {
        type: 'clarifying_questions' as const,
        questions: [
          {
            id: 'test',
            question: 'Test?',
            options: ['A', 'B'],
          },
        ],
      };

      const result = ClarifyingQuestionsResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('RecipeResponseSchema', () => {
    it('should validate a valid recipe response', () => {
      const response = {
        type: 'recipe' as const,
        recipe: {
          title: 'Test Recipe',
          flowGroups: [],
        },
      };

      const result = RecipeResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('ProcessResponseSchema (discriminated union)', () => {
    it('should correctly discriminate clarifying_questions type', () => {
      const response = {
        type: 'clarifying_questions' as const,
        questions: [
          {
            id: 'test',
            question: 'Test?',
            options: ['A', 'B'],
          },
        ],
      };

      const result = ProcessResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success && result.data.type === 'clarifying_questions') {
        expect(result.data.questions).toHaveLength(1);
      }
    });

    it('should correctly discriminate recipe type', () => {
      const response = {
        type: 'recipe' as const,
        recipe: {
          title: 'Pasta',
          flowGroups: [],
        },
      };

      const result = ProcessResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success && result.data.type === 'recipe') {
        expect(result.data.recipe.title).toBe('Pasta');
      }
    });

    it('should reject invalid type', () => {
      const response = {
        type: 'invalid',
        data: {},
      };

      const result = ProcessResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });
  });
});

describe('buildUserPrompt', () => {
  describe('without clarifying answers', () => {
    it('should build prompt for text-only request', () => {
      const result = buildUserPrompt({
        instructions: 'Make pasta carbonara',
        measureSystem: 'metric',
        servings: 4,
        hasImages: false,
      });

      expect(result).toContain('Make pasta carbonara');
      expect(result).toContain('metric (g, ml, °C)');
      expect(result).toContain('4 servings');
    });

    it('should build prompt for image request', () => {
      const result = buildUserPrompt({
        instructions: 'Make it spicy',
        measureSystem: 'american',
        servings: 2,
        hasImages: true,
      });

      expect(result).toContain('Analyze these images');
      expect(result).toContain('Make it spicy');
      expect(result).toContain('US (cups, tbsp, oz, °F)');
      expect(result).toContain('2 servings');
    });

    it('should build prompt for image request without instructions', () => {
      const result = buildUserPrompt({
        measureSystem: 'metric',
        servings: 4,
        hasImages: true,
      });

      expect(result).toContain('Analyze these images');
      expect(result).not.toContain('User request');
    });
  });

  describe('with clarifying answers', () => {
    it('should include selected option answers', () => {
      const answers: QuestionAnswer[] = [
        { questionId: 'cuisine', selectedOption: 'italian', customText: undefined },
        { questionId: 'spice-level', selectedOption: 'mild', customText: undefined },
      ];

      const result = buildUserPrompt({
        instructions: 'dinner with chicken',
        measureSystem: 'metric',
        servings: 4,
        hasImages: false,
        clarifyingAnswers: answers,
      });

      expect(result).toContain('User preferences from clarifying questions');
      expect(result).toContain('cuisine: italian');
      expect(result).toContain('spice-level: mild');
    });

    it('should include custom text for "Other" answers', () => {
      const answers: QuestionAnswer[] = [
        { questionId: 'cuisine', selectedOption: null, customText: 'Fusion Asian-Mexican' },
      ];

      const result = buildUserPrompt({
        instructions: 'something unique',
        measureSystem: 'metric',
        servings: 2,
        hasImages: false,
        clarifyingAnswers: answers,
      });

      expect(result).toContain('User preferences from clarifying questions');
      expect(result).toContain('cuisine: Fusion Asian-Mexican');
    });

    it('should handle mixed answer types', () => {
      const answers: QuestionAnswer[] = [
        { questionId: 'cuisine', selectedOption: 'italian', customText: undefined },
        { questionId: 'dietary', selectedOption: null, customText: 'No nightshades' },
      ];

      const result = buildUserPrompt({
        instructions: 'healthy dinner',
        measureSystem: 'american',
        servings: 4,
        hasImages: false,
        clarifyingAnswers: answers,
      });

      expect(result).toContain('cuisine: italian');
      expect(result).toContain('dietary: No nightshades');
    });

    it('should not include preferences section when answers array is empty', () => {
      const result = buildUserPrompt({
        instructions: 'pasta',
        measureSystem: 'metric',
        servings: 4,
        hasImages: false,
        clarifyingAnswers: [],
      });

      expect(result).not.toContain('User preferences from clarifying questions');
    });
  });
});
