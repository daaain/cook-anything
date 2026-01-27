/**
 * MCP server for Recipe Flow app.
 *
 * Provides a single tool to display recipes as interactive flowcharts.
 * Claude generates the recipe JSON, then calls this tool to display it.
 */

import { z } from 'zod';
import { type FlowGroupSchema, RecipeSchema } from '@/lib/recipe';
import { McpServer, RESOURCE_MIME_TYPE, registerAppResource, registerAppTool } from './mcp-sdk';

const UI_RESOURCE_URI = 'ui://recipe-flow/app.html';

// Will be populated by the build process
let bundledHtml = '';

/**
 * Set the bundled HTML content for the MCP app UI.
 * Called during build or at runtime to provide the UI HTML.
 */
export function setBundledHtml(html: string): void {
  bundledHtml = html;
}

/**
 * Get the bundled HTML content.
 */
export function getBundledHtml(): string {
  return bundledHtml;
}

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
  // Claude generates the recipe, then calls this to display it
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
      _meta: { ui: { resourceUri: UI_RESOURCE_URI } },
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
      };
    },
  );

  // Register the HTML UI resource
  registerAppResource(
    server,
    'Recipe Flow UI',
    UI_RESOURCE_URI,
    {
      mimeType: RESOURCE_MIME_TYPE,
      description: 'Interactive cooking flowchart viewer with timers and step tracking',
    },
    async () => ({
      contents: [
        {
          uri: UI_RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: bundledHtml || getPlaceholderHtml(),
        },
      ],
    }),
  );

  return server;
}

/**
 * Returns placeholder HTML when the bundled app hasn't been built yet.
 */
function getPlaceholderHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recipe Flow</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f9fafb;
      color: #374151;
    }
    .message {
      text-align: center;
      padding: 2rem;
    }
  </style>
</head>
<body>
  <div class="message">
    <h1>Recipe Flow</h1>
    <p>MCP app UI not yet built. Run <code>bun run build:mcp</code> to build.</p>
  </div>
</body>
</html>`;
}
