import {
  type AssistantModelMessage,
  generateText,
  type ImagePart,
  type ModelMessage,
  Output,
  type TextPart,
  type UserModelMessage,
} from 'ai';
import { createClaudeCode } from 'ai-sdk-provider-claude-code';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { MeasureSystem, ProcessRecipeRequest, Recipe } from '@/lib/types';

// Zod schema for structured output - guarantees valid JSON
const StepSchema = z.object({
  stepNumber: z.number().describe('Sequential step number'),
  type: z
    .enum(['prep', 'cook', 'rest'])
    .describe('Step type: prep (cutting, mixing), cook (heat applied), rest (waiting/marinating)'),
  instruction: z
    .string()
    .describe('Full instruction text with ingredient amounts integrated naturally'),
  ingredients: z
    .array(z.string())
    .describe('Ingredients used in this step with emoji and quantity, e.g. "🧈 2 tbsp butter"'),
  timerMinutes: z.number().describe('Timer duration in minutes (0 for steps without timing)'),
});

const FlowGroupSchema = z.object({
  parallel: z.boolean().describe('True if steps in this group can be done simultaneously'),
  steps: z.array(StepSchema),
});

const RecipeSchema = z.object({
  title: z.string().describe('Recipe name'),
  servings: z.string().optional().describe('Number of servings'),
  flowGroups: z.array(FlowGroupSchema).describe('Recipe steps grouped by parallel execution'),
});

const SYSTEM_PROMPT = `You are a recipe assistant. Your job is to help users cook by either:
1. EXTRACTING recipes from screenshots when recipe cards/instructions are visible
2. CREATING recipes when only ingredients are shown (use your culinary knowledge)
3. EDITING existing recipes when conversation history is provided

When analyzing images:
- If you see a recipe with instructions → extract and structure it
- If you see only ingredients → create a sensible recipe using those ingredients
- Consider any user instructions (e.g., "make muffins") to guide what to create
- You may assume common pantry staples and any reasonable ingredients needed to complete the recipe (the user can adjust via the edit box if needed)

When EDITING an existing recipe (conversation history provided):
- The most recent assistant message contains the current recipe as JSON
- Make ONLY the changes the user requests - preserve everything else
- Keep the same structure, step organization, and flow unless changes require restructuring
- Maintain the recipe's character and style while applying modifications
- If the user asks to "make it vegetarian", substitute ingredients but keep the same cooking approach
- If the user asks to "add more X", increase that ingredient and adjust related steps if needed

When building recipes:
1. Identify all visible ingredients with reasonable quantities
2. Break down into logical steps
3. Group steps that can be done simultaneously as parallel steps
4. Categorize each step as prep (cutting, mixing, measuring), cook (heat applied), or rest (waiting, marinating, resting)
5. Estimate timer durations for steps that need timing
6. Make instructions clear and actionable
7. Integrate ingredient amounts naturally into instructions`;

interface PromptOptions {
  instructions?: string;
  measureSystem: MeasureSystem;
  servings: number;
}

interface BuildPromptOptions extends PromptOptions {
  hasImages: boolean;
}

function buildUserPrompt({
  instructions,
  measureSystem,
  servings,
  hasImages,
}: BuildPromptOptions): string {
  const measureDesc =
    measureSystem === 'metric'
      ? 'metric units (grams, ml, celsius)'
      : 'US/imperial units (cups, tablespoons, ounces, fahrenheit)';

  if (hasImages) {
    return `Analyze these images and provide a recipe.

SCENARIO HANDLING:
- If you see a recipe card with instructions: Extract and structure it
- If you see only ingredients: Create a recipe using those ingredients (you may assume common pantry staples and any reasonable ingredients needed)
${instructions ? `- User request: "${instructions}" - use this to guide what dish to make\n` : ''}
RECIPE SETTINGS:
- Measurement system: ${measureDesc}
- Scale recipe to: ${servings} servings

IMPORTANT RULES:
1. If ingredients are visible but no recipe, CREATE a sensible recipe for them
2. Merge all ingredient quantities INTO the instruction text naturally
3. List the ingredients used in each step in the ingredients array (use emoji for each ingredient, e.g. "🧈 2 tbsp butter")
4. Group steps that can happen simultaneously as parallel: true
5. Identify step types: prep (cutting, mixing), cook (heat applied), rest (waiting/marinating)
6. Estimate timer minutes for steps that need timing (cooking, marinating, resting). Use 0 for steps without timers.
7. Make instructions clear and actionable
8. Keep the original recipe flow but optimise for parallel prep where logical
9. Step numbers should be sequential across all groups`;
  }

  // Text-only mode
  return `Create a recipe based on the following text input:

"${instructions}"

RECIPE SETTINGS:
- Measurement system: ${measureDesc}
- Scale recipe to: ${servings} servings

INSTRUCTIONS:
1. Parse the text to understand what recipe the user wants
2. If it's a recipe with instructions, structure it properly
3. If it's just ingredients or a dish name, create a complete recipe
4. Merge all ingredient quantities INTO the instruction text naturally
5. List the ingredients used in each step in the ingredients array (use emoji for each ingredient, e.g. "🧈 2 tbsp butter")
6. Group steps that can happen simultaneously as parallel: true
7. Identify step types: prep (cutting, mixing), cook (heat applied), rest (waiting/marinating)
8. Estimate timer minutes for steps that need timing (cooking, marinating, resting). Use 0 for steps without timers.
9. Make instructions clear and actionable
10. Optimise for parallel prep where logical
11. Step numbers should be sequential across all groups and start from 1`;
}

// Create Claude Code provider, optionally with OAuth token
function createProvider(oauthToken?: string) {
  return createClaudeCode({
    defaultSettings: {
      streamingInput: 'always',
      stderr: (data: string) => {
        console.error('[Claude CLI stderr]:', data);
      },
      env: {
        // Set config dir to /tmp for serverless environments (Vercel)
        CLAUDE_CONFIG_DIR: '/tmp/.claude',
        HOME: '/tmp',
        ...(oauthToken && {
          CLAUDE_CODE_OAUTH_TOKEN: oauthToken,
        }),
      },
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: ProcessRecipeRequest = await request.json();
    const {
      images,
      instructions,
      conversationHistory,
      oauthToken,
      measureSystem = 'metric',
      servings = 4,
      model = 'opus',
    } = body;

    // Validate that we have either images or text instructions
    if ((!images || images.length === 0) && !instructions?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Please provide recipe images or text instructions' },
        { status: 400 },
      );
    }

    // Build the messages for the API call
    const messages: ModelMessage[] = [];

    // Add conversation history for context (for edits)
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        if (msg.role === 'user') {
          const userMsg: UserModelMessage = {
            role: 'user',
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          };
          messages.push(userMsg);
        } else if (msg.role === 'assistant') {
          const assistantMsg: AssistantModelMessage = {
            role: 'assistant',
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          };
          messages.push(assistantMsg);
        }
      }
    }

    // Build the current user message (with or without images)
    const userContent: Array<ImagePart | TextPart> = [];
    const hasImages = images && images.length > 0;

    // Add images if present - convert to data URL format for Claude Code provider
    if (hasImages) {
      for (const img of images) {
        const dataUrl = `data:${img.mediaType};base64,${img.base64}`;
        const imagePart: ImagePart = {
          type: 'image',
          image: dataUrl,
        };
        userContent.push(imagePart);
      }
    }

    // Add the text prompt
    const textPart: TextPart = {
      type: 'text',
      text: buildUserPrompt({ instructions, measureSystem, servings, hasImages }),
    };
    userContent.push(textPart);

    const currentUserMessage: UserModelMessage = {
      role: 'user',
      content: userContent,
    };
    messages.push(currentUserMessage);

    // Call Claude API using Claude Code provider with structured output
    // Uses OAuth token from request if provided, otherwise falls back to server's env/CLI auth
    const claudeCode = createProvider(oauthToken);
    const { output: recipe } = await generateText({
      model: claudeCode(model),
      output: Output.object({
        schema: RecipeSchema,
      }),
      system: SYSTEM_PROMPT,
      messages,
    });

    // Include the settings used to create this recipe
    const recipeWithSettings: Recipe = {
      ...(recipe as Recipe),
      measureSystem,
      servingsCount: servings,
    };

    return NextResponse.json({
      success: true,
      recipe: recipeWithSettings,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : undefined;
    const errorLower = errorMessage.toLowerCase();

    console.error('Error processing recipe:', { name: errorName, message: errorMessage });

    // Check for authentication errors (AI_LoadAPIKeyError from provider)
    if (
      errorName === 'AI_LoadAPIKeyError' ||
      errorLower.includes('/login') ||
      errorLower.includes('invalid api key') ||
      errorLower.includes('unauthorized') ||
      errorLower.includes('authentication')
    ) {
      return NextResponse.json({ success: false, error: errorMessage }, { status: 401 });
    }

    // Check for rate limit errors
    if (errorLower.includes('rate limit') || errorLower.includes('429')) {
      return NextResponse.json({ success: false, error: errorMessage }, { status: 429 });
    }

    // Check for quota errors
    if (errorLower.includes('quota') || errorLower.includes('insufficient')) {
      return NextResponse.json({ success: false, error: errorMessage }, { status: 402 });
    }

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
