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
import { buildUserPrompt, RecipeSchema, SYSTEM_PROMPT } from '@/lib/recipe';
import type { ProcessRecipeRequest, Recipe } from '@/lib/types';

// Create Claude Code provider, optionally with OAuth token
function createClaudeProvider(oauthToken?: string) {
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

    // Create Claude provider
    const provider = createClaudeProvider(oauthToken);

    // Call AI API with structured output
    const { output: recipe } = await generateText({
      model: provider(model),
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
