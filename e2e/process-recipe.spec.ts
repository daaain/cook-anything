import { expect, test } from '@playwright/test';

const BASE_URL = 'http://localhost:3421';

test.describe('process-recipe API', () => {
  test.skip(!process.env.E2E, 'Set E2E=true to run');

  function requireToken(): string {
    const token = process.env.CLAUDE_CODE_OAUTH_TOKEN;
    if (!token) {
      throw new Error('CLAUDE_CODE_OAUTH_TOKEN is required for LLM e2e tests');
    }
    return token;
  }

  test('simple recipe returns valid structured output', async ({ request }) => {
    const oauthToken = requireToken();

    const response = await request.post(`${BASE_URL}/api/process-recipe`, {
      data: {
        instructions: 'Simple buttered toast',
        model: 'haiku',
        allowClarifyingQuestions: false,
        oauthToken,
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.recipe).toBeDefined();

    // Validate recipe structure
    const recipe = body.recipe;
    expect(recipe.title).toBeTruthy();
    expect(Array.isArray(recipe.flowGroups)).toBe(true);
    expect(recipe.flowGroups.length).toBeGreaterThan(0);

    // Validate each flow group has steps
    for (const group of recipe.flowGroups) {
      expect(typeof group.parallel).toBe('boolean');
      expect(Array.isArray(group.steps)).toBe(true);
      expect(group.steps.length).toBeGreaterThan(0);

      for (const step of group.steps) {
        expect(step.stepNumber).toBeGreaterThan(0);
        expect(['prep', 'cook', 'rest']).toContain(step.type);
        expect(step.instruction).toBeTruthy();
        expect(Array.isArray(step.ingredients)).toBe(true);
        expect(typeof step.timerMinutes).toBe('number');
      }
    }
  });

  test('vague request with clarifying questions enabled', async ({ request }) => {
    const oauthToken = requireToken();

    const response = await request.post(`${BASE_URL}/api/process-recipe`, {
      data: {
        instructions: 'something with chicken',
        model: 'haiku',
        allowClarifyingQuestions: true,
        oauthToken,
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);

    // The model may return either clarifying questions or a recipe — both are valid
    if (body.clarifyingQuestions) {
      const cq = body.clarifyingQuestions;
      expect(cq.type).toBe('clarifying_questions');
      expect(Array.isArray(cq.questions)).toBe(true);
      expect(cq.questions.length).toBeGreaterThanOrEqual(1);

      for (const q of cq.questions) {
        expect(q.id).toBeTruthy();
        expect(q.question).toBeTruthy();
        expect(Array.isArray(q.options)).toBe(true);
        expect(q.options.length).toBeGreaterThanOrEqual(2);
      }
    } else {
      // Model decided the request was clear enough — validate the recipe
      expect(body.recipe).toBeDefined();
      expect(body.recipe.title).toBeTruthy();
      expect(Array.isArray(body.recipe.flowGroups)).toBe(true);
    }
  });

  test('validation error for empty request', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/process-recipe`, {
      data: {
        images: [],
        instructions: '',
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeTruthy();
  });
});
