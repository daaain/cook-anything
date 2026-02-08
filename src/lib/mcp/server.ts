/**
 * MCP server for Recipe Flow app.
 *
 * Provides a single tool to display recipes as interactive flowcharts.
 * Supports both Claude (via @modelcontextprotocol/ext-apps) and ChatGPT (via skybridge).
 */

import { z } from 'zod';
import { getBaseUrl } from '@/lib/env';
import { type FlowGroupSchema, RecipeSchema } from '@/lib/recipe';
import { McpServer, registerAppResource, registerAppTool } from './mcp-sdk';

/**
 * Get the URL to the MCP UI page served by Next.js.
 * Computed at runtime to get the correct Vercel deployment URL.
 */
function getMcpUiUrl(): string {
  return `${getBaseUrl()}/mcp-ui`;
}

/**
 * Resource URI for the MCP ext-apps protocol.
 * Both Claude and ChatGPT use this URI to reference the widget.
 */
const UI_RESOURCE_URI = 'ui://recipe-flow/app.html';

/**
 * MIME type for widget rendering.
 * ChatGPT uses 'text/html+skybridge' to identify HTML content for its sandbox.
 * This is also compatible with Claude's MCP widget system.
 */
const WIDGET_MIME_TYPE = 'text/html+skybridge';

/**
 * Get OpenAI-specific metadata for tools.
 * Uses the resource URI for outputTemplate - ChatGPT will fetch the HTML from the resource.
 */
function getOpenAiToolMeta() {
  return {
    // Point to the resource URI, not HTTP URL - ChatGPT fetches HTML from the resource
    'openai/outputTemplate': UI_RESOURCE_URI,
    'openai/toolInvocation/invoking': 'Preparing your recipe flowchart...',
    'openai/toolInvocation/invoked': 'Recipe flowchart ready!',
    'openai/widgetAccessible': true,
  } as const;
}

/**
 * Fetch the HTML from the MCP UI page.
 * This fetches the Next.js rendered page which includes all the ChatGPT SDK bootstrap patches.
 */
async function fetchMcpUiHtml(): Promise<string> {
  const url = getMcpUiUrl();
  try {
    // Build headers for the fetch request
    const headers: Record<string, string> = {};

    // Add Vercel protection bypass header for preview deployments
    // This allows internal fetches to bypass deployment protection
    const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    if (bypassSecret) {
      headers['x-vercel-protection-bypass'] = bypassSecret;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.error(`Failed to fetch MCP UI HTML: ${response.status} ${response.statusText}`);
      return getPlaceholderHtml('Failed to load UI');
    }
    const html = await response.text();
    // Wrap in html tags if not already present (Next.js should include them)
    if (!html.includes('<html')) {
      return `<html>${html}</html>`;
    }
    return html;
  } catch (error) {
    console.error('Error fetching MCP UI HTML:', error);
    return getPlaceholderHtml('Error loading UI');
  }
}

/**
 * Returns placeholder HTML when the MCP UI page cannot be fetched.
 */
function getPlaceholderHtml(message: string): string {
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
    .message { text-align: center; padding: 2rem; }
  </style>
</head>
<body>
  <div class="message">
    <h1>Recipe Flow</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

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
        // OpenAI/ChatGPT format - computed at runtime for correct Vercel URL
        ...getOpenAiToolMeta(),
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

      // Get OpenAI metadata at runtime for correct URL
      const openAiMeta = getOpenAiToolMeta();

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
          'openai/toolInvocation/invoking': openAiMeta['openai/toolInvocation/invoking'],
          'openai/toolInvocation/invoked': openAiMeta['openai/toolInvocation/invoked'],
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
      _meta: getOpenAiToolMeta(),
    },
    async () => {
      // Fetch the HTML from the Next.js page (includes ChatGPT SDK bootstrap patches)
      const html = await fetchMcpUiHtml();
      return {
        contents: [
          {
            uri: UI_RESOURCE_URI,
            mimeType: WIDGET_MIME_TYPE,
            text: html,
            _meta: getOpenAiToolMeta(),
          },
        ],
      };
    },
  );

  return server;
}
