// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - Test file with mocked modules that cause type mismatches
import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { z } from 'zod';
import mcpFixture from '../../../fixtures/mcp-ui-post-body.json';
import { RecipeSchema } from '../recipe';
import { createRecipeFlowServer, getBundledHtml, setBundledHtml } from './server';

// Mock the mcp-sdk module to capture tool and resource registration
const mockRegisterAppTool = mock(() => {});
const mockRegisterAppResource = mock(() => {});

/**
 * Schema for the show-recipe tool input (matches server.ts)
 */
const ShowRecipeInputSchema = z.object({
  recipe: RecipeSchema,
});

// We'll capture the callbacks when tools are registered
let capturedToolCallback: ((args: { recipe: unknown }) => Promise<unknown>) | null = null;
let capturedResourceCallback: (() => Promise<unknown>) | null = null;

/** Helper to call the captured tool callback safely */
async function callToolCallback(args: { recipe: unknown }) {
  if (!capturedToolCallback) {
    throw new Error('Tool callback not captured');
  }
  return capturedToolCallback(args);
}

/** Helper to call the captured resource callback safely */
async function callResourceCallback() {
  if (!capturedResourceCallback) {
    throw new Error('Resource callback not captured');
  }
  return capturedResourceCallback();
}

// Track the server info passed to McpServer constructor
let capturedServerInfo: { name: string; version: string } | null = null;

mock.module('./mcp-sdk', () => ({
  McpServer: class MockMcpServer {
    constructor(serverInfo: { name: string; version: string }) {
      capturedServerInfo = serverInfo;
    }
  },
  RESOURCE_MIME_TYPE: 'text/html',
  registerAppTool: (
    _server: unknown,
    name: string,
    _options: unknown,
    callback: (args: { recipe: unknown }) => Promise<unknown>,
  ) => {
    mockRegisterAppTool(name);
    capturedToolCallback = callback;
  },
  registerAppResource: (
    _server: unknown,
    name: string,
    _uri: string,
    _options: unknown,
    callback: () => Promise<unknown>,
  ) => {
    mockRegisterAppResource(name);
    capturedResourceCallback = callback;
  },
}));

describe('MCP Server', () => {
  beforeEach(() => {
    mockRegisterAppTool.mockClear();
    mockRegisterAppResource.mockClear();
    capturedToolCallback = null;
    capturedResourceCallback = null;
    capturedServerInfo = null;
    // Reset bundled HTML state
    setBundledHtml('');
  });

  describe('createRecipeFlowServer', () => {
    it('creates server with correct name and version', () => {
      createRecipeFlowServer();

      expect(capturedServerInfo).not.toBeNull();
      expect(capturedServerInfo?.name).toBe('Recipe Flow');
      expect(capturedServerInfo?.version).toBe('1.0.0');
    });

    it('registers show-recipe tool', () => {
      createRecipeFlowServer();

      expect(mockRegisterAppTool).toHaveBeenCalledWith('show-recipe');
    });

    it('registers UI resource', () => {
      createRecipeFlowServer();

      expect(mockRegisterAppResource).toHaveBeenCalledWith('Recipe Flow UI');
    });
  });

  describe('show-recipe tool', () => {
    beforeEach(() => {
      createRecipeFlowServer();
    });

    it('accepts valid recipe from fixture', async () => {
      const result = await callToolCallback({ recipe: mcpFixture.recipe });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('structuredContent');
    });

    it('counts total steps correctly', async () => {
      const result = (await callToolCallback({ recipe: mcpFixture.recipe })) as {
        content: Array<{ type: string; text: string }>;
      };

      // The fixture has 11 steps total across all flow groups
      const textContent = result.content[0];
      expect(textContent.type).toBe('text');
      expect(textContent.text).toContain('11 steps');
    });

    it('returns text content with recipe summary', async () => {
      const result = (await callToolCallback({ recipe: mcpFixture.recipe })) as {
        content: Array<{ type: string; text: string }>;
      };

      const textContent = result.content[0];
      expect(textContent.text).toContain('Savoury Feta, Courgette & Pepper Muffins');
      expect(textContent.text).toContain('12'); // servings
    });

    it('returns structuredContent with recipe data', async () => {
      const result = (await callToolCallback({ recipe: mcpFixture.recipe })) as {
        structuredContent: { mode: string; recipe: unknown };
      };

      expect(result.structuredContent.mode).toBe('viewing');
      expect(result.structuredContent.recipe).toEqual(mcpFixture.recipe);
    });
  });

  describe('bundled HTML', () => {
    it('setBundledHtml updates internal state', () => {
      const testHtml = '<html><body>Test</body></html>';
      setBundledHtml(testHtml);

      expect(getBundledHtml()).toBe(testHtml);
    });

    it('getBundledHtml returns set value', () => {
      const testHtml = '<html><body>Custom HTML</body></html>';
      setBundledHtml(testHtml);

      expect(getBundledHtml()).toBe(testHtml);
    });

    it('placeholder returned when not set', async () => {
      setBundledHtml('');
      createRecipeFlowServer();

      const result = (await callResourceCallback()) as {
        contents: Array<{ uri: string; mimeType: string; text: string }>;
      };

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('MCP app UI not yet built');
      expect(result.contents[0].text).toContain('bun run build:mcp');
    });

    it('returns bundled HTML when set', async () => {
      const customHtml = '<!DOCTYPE html><html><body>Recipe App</body></html>';
      setBundledHtml(customHtml);
      createRecipeFlowServer();

      const result = (await callResourceCallback()) as {
        contents: Array<{ uri: string; mimeType: string; text: string }>;
      };

      expect(result.contents[0].text).toBe(customHtml);
    });
  });

  describe('schema validation', () => {
    // Test the Zod schema directly since registerAppTool handles validation
    it('rejects recipe without title', () => {
      const invalidRecipe = {
        flowGroups: [],
      };

      const result = ShowRecipeInputSchema.safeParse({ recipe: invalidRecipe });
      expect(result.success).toBe(false);
    });

    it('rejects recipe without flowGroups', () => {
      const invalidRecipe = {
        title: 'Test Recipe',
      };

      const result = ShowRecipeInputSchema.safeParse({ recipe: invalidRecipe });
      expect(result.success).toBe(false);
    });

    it('rejects step with invalid type', () => {
      const invalidRecipe = {
        title: 'Test Recipe',
        flowGroups: [
          {
            parallel: false,
            steps: [
              {
                stepNumber: 1,
                type: 'invalid_type', // Should be 'prep', 'cook', or 'rest'
                instruction: 'Do something',
                ingredients: [],
                timerMinutes: 0,
              },
            ],
          },
        ],
      };

      const result = ShowRecipeInputSchema.safeParse({ recipe: invalidRecipe });
      expect(result.success).toBe(false);
    });

    it('accepts valid minimal recipe', () => {
      const minimalRecipe = {
        title: 'Minimal Recipe',
        flowGroups: [
          {
            parallel: false,
            steps: [
              {
                stepNumber: 1,
                type: 'prep',
                instruction: 'Do the prep',
                ingredients: [],
                timerMinutes: 0,
              },
            ],
          },
        ],
      };

      const result = ShowRecipeInputSchema.safeParse({ recipe: minimalRecipe });
      expect(result.success).toBe(true);
    });

    it('accepts valid recipe from fixture', () => {
      const result = ShowRecipeInputSchema.safeParse({ recipe: mcpFixture.recipe });
      expect(result.success).toBe(true);
    });
  });
});
