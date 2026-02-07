/**
 * MCP server for Recipe Flow app.
 *
 * Provides a single tool to display recipes as interactive flowcharts.
 * Supports both Claude (via @modelcontextprotocol/ext-apps) and ChatGPT (via skybridge).
 */

import { z } from 'zod';
import { BASE_URL } from '@/lib/env';
import { type FlowGroupSchema, RecipeSchema } from '@/lib/recipe';
import { McpServer, registerAppResource, registerAppTool } from './mcp-sdk';

/**
 * URL to the MCP UI page served by Next.js.
 * This avoids inline scripts which are blocked by ChatGPT's CSP.
 */
const MCP_UI_URL = `${BASE_URL}/mcp-ui`;

/**
 * Resource URI for the MCP ext-apps protocol (Claude).
 */
const UI_RESOURCE_URI = 'ui://recipe-flow/app.html';

/**
 * MIME type for widget rendering.
 * ChatGPT uses 'text/html+skybridge' to identify HTML content for its sandbox.
 * This is also compatible with Claude's MCP widget system.
 */
const WIDGET_MIME_TYPE = 'text/html+skybridge';

/**
 * OpenAI-specific metadata for tools.
 * These fields enable proper widget rendering in ChatGPT.
 * Uses the HTTP URL directly so ChatGPT can fetch the page externally.
 */
const OPENAI_TOOL_META = {
  'openai/outputTemplate': MCP_UI_URL,
  'openai/toolInvocation/invoking': 'Preparing your recipe flowchart...',
  'openai/toolInvocation/invoked': 'Recipe flowchart ready!',
  'openai/widgetAccessible': true,
} as const;

/**
 * OpenAI-specific annotations for tools.
 * These control elicitation behavior in ChatGPT.
 */
const OPENAI_TOOL_ANNOTATIONS = {
  // This is a read-only display tool - no side effects
  readOnlyHint: true,
  // The tool operates on bounded input (recipe data)
  openWorldHint: false,
  // The tool is not destructive
  destructiveHint: false,
} as const;

// Detailed schema description for Claude to understand the recipe format
const RECIPE_SCHEMA_DESCRIPTION = `
A structured recipe object with the following fields:

- title: string - Recipe name
- servings: string - Serving description (e.g., "4 servings", "Makes 12 cookies")
- ingredients: string[] - ALL ingredients with quantities and emoji prefixes (e.g., "🥚 2 large eggs", "🧈 100g butter")
- equipment: string[] - ALL equipment needed with emoji prefixes (e.g., "🍳 Large frying pan", "🔪 Sharp knife")
- flowGroups: array of step groups, each containing:
  - parallel: boolean - true if steps in this group can be done simultaneously
  - steps: array of steps, each with:
    - stepNumber: number - Sequential number across all groups
    - type: "prep" | "cook" | "rest" - Step category
    - instruction: string - Clear instruction text
    - ingredients: string[] - Ingredients used in THIS step (subset of top-level ingredients)
    - equipment: string[] - Equipment used in THIS step (subset of top-level equipment)
    - timerMinutes: number - Timer duration (0 if no timer needed)

IMPORTANT RULES:
- List ALL ingredients and equipment in top-level arrays first (mise en place)
- Each step only references items from the top-level arrays
- Use parallel: true for steps that can happen simultaneously (e.g., "while the pasta boils, prepare the sauce")
- Step numbers must be sequential across all groups
- Include timers for any step that requires waiting
`;

/**
 * Input schema for the show-recipe tool.
 * This is what Claude will fill in when calling the tool.
 */
const ShowRecipeInputSchema = z.object({
  recipe: RecipeSchema.describe(RECIPE_SCHEMA_DESCRIPTION),
});

/**
 * Create and configure the MCP server for Recipe Flow.
 */
export function createRecipeFlowServer(): McpServer {
  const server = new McpServer({
    name: 'Recipe Flow',
    version: '1.0.0',
  });

  // Single tool: Show Recipe
  // The LLM generates the recipe, then calls this to display it
  registerAppTool(
    server,
    'show-recipe',
    {
      title: 'Show Recipe Flowchart',
      description: `Display a recipe as an interactive cooking flowchart with timers and step tracking.

Use this tool AFTER generating a complete recipe in the required JSON format. The recipe will be displayed with:
- Mise en place section showing all ingredients and equipment
- Step-by-step flowchart with collapsible steps
- Built-in timers for timed steps (with audio alerts)
- Visual indicators for prep, cook, and rest steps
- Support for parallel steps that can be done simultaneously

When the user asks for a recipe, first generate the complete recipe JSON following the schema, then call this tool with it.`,
      inputSchema: ShowRecipeInputSchema,
      // Combined metadata for both Claude and ChatGPT
      _meta: {
        // Claude's MCP ext-apps format
        ui: { resourceUri: UI_RESOURCE_URI },
        // OpenAI/ChatGPT format
        ...OPENAI_TOOL_META,
      },
      // OpenAI annotations for elicitation control
      annotations: OPENAI_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const { recipe } = args;

      // Count total steps
      const totalSteps = recipe.flowGroups.reduce(
        (sum: number, group: z.infer<typeof FlowGroupSchema>) => sum + group.steps.length,
        0,
      );

      return {
        content: [
          {
            type: 'text',
            text: `Displaying "${recipe.title}" - ${recipe.servings} with ${totalSteps} steps.`,
          },
        ],
        structuredContent: {
          mode: 'viewing',
          recipe,
        },
        // Include OpenAI invocation metadata in response
        _meta: {
          'openai/toolInvocation/invoking': OPENAI_TOOL_META['openai/toolInvocation/invoking'],
          'openai/toolInvocation/invoked': OPENAI_TOOL_META['openai/toolInvocation/invoked'],
        },
      };
    },
  );

  // Register the HTML UI resource
  // Uses text/html+skybridge MIME type which is recognized by both ChatGPT and Claude
  registerAppResource(
    server,
    'Recipe Flow UI',
    UI_RESOURCE_URI,
    {
      mimeType: WIDGET_MIME_TYPE,
      description: 'Interactive cooking flowchart viewer with timers and step tracking',
      // Include OpenAI metadata for ChatGPT discovery
      _meta: OPENAI_TOOL_META,
    },
    async () => ({
      contents: [
        {
          uri: UI_RESOURCE_URI,
          mimeType: WIDGET_MIME_TYPE,
          // Return an iframe that loads the Next.js page.
          // This avoids inline scripts which are blocked by CSP.
          text: getIframeHtml(),
          _meta: OPENAI_TOOL_META,
        },
      ],
    }),
  );

  return server;
}

/**
 * Returns HTML that embeds the Next.js MCP UI page via iframe.
 * This approach avoids inline scripts which are blocked by ChatGPT's CSP.
 */
function getIframeHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recipe Flow</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    iframe { width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <iframe src="${MCP_UI_URL}" allow="autoplay"></iframe>
</body>
</html>`;
}
