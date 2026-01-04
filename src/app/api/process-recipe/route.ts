import { NextRequest, NextResponse } from 'next/server';
import { createClaudeCode } from 'ai-sdk-provider-claude-code';
import {
  generateText,
  ModelMessage,
  UserModelMessage,
  AssistantModelMessage,
  ImagePart,
  TextPart,
} from 'ai';
import { ProcessRecipeRequest, Recipe, MeasureSystem } from '@/lib/types';

const SYSTEM_PROMPT = `You are a recipe analysis assistant. Your job is to analyze recipe screenshots and extract the recipe information into a structured flowchart format.

When analyzing recipes:
1. Identify all ingredients with their quantities
2. Break down the recipe into logical steps
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

function buildUserPrompt({ instructions, measureSystem, servings }: PromptOptions): string {
  const measureDesc =
    measureSystem === 'metric'
      ? 'metric units (grams, ml, celsius)'
      : 'US/imperial units (cups, tablespoons, ounces, fahrenheit)';

  return `Analyze these recipe screenshots and extract the recipe information.

RECIPE SETTINGS:
- Measurement system: ${measureDesc}
- Scale recipe to: ${servings} servings
${instructions ? `\nUSER ADJUSTMENTS - Apply these modifications to the recipe:\n${instructions}\n` : ''}
Return ONLY valid JSON (no markdown, no backticks, no code blocks) in this exact format:
{
  "title": "Recipe Name",
  "servings": "number of servings if shown",
  "flowGroups": [
    {
      "parallel": false,
      "steps": [
        {
          "stepNumber": 1,
          "type": "prep|cook|rest",
          "instruction": "Full instruction text with ingredient amounts integrated naturally",
          "ingredients": ["2 tbsp olive oil", "1 onion, diced"],
          "timerMinutes": 5
        }
      ]
    },
    {
      "parallel": true,
      "steps": [...]
    }
  ]
}

IMPORTANT RULES:
1. Merge all ingredient quantities INTO the instruction text naturally
2. List the ingredients used in each step in the ingredients array (+ use emoji for ingredient when available)
3. Group steps that can happen simultaneously as parallel: true
4. Identify step types: prep (cutting, mixing), cook (heat applied), rest (waiting/marinating)
5. Estimate timer minutes for steps that need timing (cooking, marinating, resting). Use 0 for steps without timers.
6. Make instructions clear and actionable
7. Keep the original recipe flow but optimize for parallel prep where logical
8. Step numbers should be sequential across all groups`;
}

// Capture stderr from Claude Code CLI for better error messages
let lastStderr = '';

// Create Claude Code provider, optionally with OAuth token
function createProvider(oauthToken?: string) {
  return createClaudeCode({
    defaultSettings: {
      streamingInput: 'always',
      stderr: (data: string) => {
        lastStderr += data;
        console.error('[Claude CLI stderr]:', data);
      },
      ...(oauthToken && {
        env: {
          CLAUDE_CODE_OAUTH_TOKEN: oauthToken,
        },
      }),
    },
  });
}

export async function POST(request: NextRequest) {
  // Reset stderr capture for this request
  lastStderr = '';

  try {
    const body: ProcessRecipeRequest = await request.json();
    const {
      images,
      instructions,
      conversationHistory,
      oauthToken,
      measureSystem = 'metric',
      servings = 4,
    } = body;

    // Validate images
    if (!images || images.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one image is required' },
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

    // Build the current user message with images
    const userContent: Array<ImagePart | TextPart> = [];

    // Add images first - convert to data URL format for Claude Code provider
    for (const img of images) {
      const dataUrl = `data:${img.mediaType};base64,${img.base64}`;
      const imagePart: ImagePart = {
        type: 'image',
        image: dataUrl,
      };
      userContent.push(imagePart);
    }

    // Add the text prompt
    const textPart: TextPart = {
      type: 'text',
      text: buildUserPrompt({ instructions, measureSystem, servings }),
    };
    userContent.push(textPart);

    const currentUserMessage: UserModelMessage = {
      role: 'user',
      content: userContent,
    };
    messages.push(currentUserMessage);

    // Call Claude API using Claude Code provider
    // Uses OAuth token from request if provided, otherwise falls back to server's env/CLI auth
    const claudeCode = createProvider(oauthToken);
    const { text } = await generateText({
      model: claudeCode('opus'),
      system: SYSTEM_PROMPT,
      messages,
    });

    // Parse the response
    let recipe: Recipe;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }
      recipe = JSON.parse(jsonMatch[0]);

      // Validate the recipe structure
      if (!recipe.title || !recipe.flowGroups || !Array.isArray(recipe.flowGroups)) {
        throw new Error('Invalid recipe structure');
      }

      // Ensure all required fields are present
      recipe.flowGroups = recipe.flowGroups.map((group) => ({
        parallel: Boolean(group.parallel),
        steps: group.steps.map((step) => ({
          stepNumber: step.stepNumber || 0,
          type: step.type || 'prep',
          instruction: step.instruction || '',
          ingredients: step.ingredients || [],
          timerMinutes: step.timerMinutes || 0,
        })),
      }));
    } catch (parseError) {
      console.error('Failed to parse recipe:', parseError, 'Response:', text);
      return NextResponse.json(
        { success: false, error: 'Failed to parse recipe from AI response' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      recipe,
      assistantMessage: text,
    });
  } catch (error) {
    // Extract detailed error information from AI SDK errors
    const errorData = (error as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
    const stderr = errorData?.stderr as string | undefined;
    const exitCode = errorData?.exitCode as number | undefined;

    // Use captured stderr if the error data doesn't have it
    const capturedStderr = lastStderr.trim() || stderr?.trim();

    // Log full error object for debugging
    console.error('Full error object:', error);
    console.error('Error keys:', error ? Object.keys(error as object) : 'null');

    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : undefined,
      cause: error instanceof Error ? error.cause : undefined,
      exitCode,
      stderr: capturedStderr,
      capturedStderr: lastStderr.trim() || '(none)',
      data: errorData,
    };

    console.error('Error processing recipe:', JSON.stringify(errorDetails, null, 2));

    // Build a helpful error message from stderr if available
    const stderrMessage = capturedStderr;

    // Check for API errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      const dataStr = JSON.stringify(errorDetails.data || {}).toLowerCase();
      const stderrLower = (stderrMessage || '').toLowerCase();

      // Detect auth errors - either explicit messages or "exited with code 1" with no other info
      const isExitCode1 = errorMessage.includes('exited with code 1');
      const hasNoUsefulInfo = !stderrMessage && !errorDetails.cause;
      const likelyAuthError = isExitCode1 && hasNoUsefulInfo;

      if (
        likelyAuthError ||
        errorMessage.includes('401') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('authentication') ||
        dataStr.includes('unauthorized') ||
        dataStr.includes('authentication') ||
        dataStr.includes('invalid api key') ||
        dataStr.includes('please run /login') ||
        stderrLower.includes('invalid api key') ||
        stderrLower.includes('please run /login') ||
        stderrLower.includes('unauthorized')
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              stderrMessage ||
              (likelyAuthError
                ? 'Claude Code CLI failed (likely authentication issue). Please check your OAuth token in Settings.'
                : 'Authentication failed. Please set your OAuth token in Settings.'),
            details: { exitCode, stderr: stderrMessage },
          },
          { status: 401 },
        );
      }
      if (
        errorMessage.includes('429') ||
        errorMessage.includes('rate limit') ||
        dataStr.includes('rate limit')
      ) {
        return NextResponse.json(
          {
            success: false,
            error: stderrMessage || 'Rate limit exceeded. Please try again later.',
            details: { exitCode, stderr: stderrMessage },
          },
          { status: 429 },
        );
      }
      if (
        errorMessage.includes('insufficient') ||
        errorMessage.includes('quota') ||
        dataStr.includes('quota')
      ) {
        return NextResponse.json(
          {
            success: false,
            error: stderrMessage || 'API quota exceeded. Please check your account.',
            details: { exitCode, stderr: stderrMessage },
          },
          { status: 402 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: stderrMessage || errorDetails.message || 'An error occurred while processing the recipe.',
        details: { exitCode, stderr: stderrMessage },
      },
      { status: 500 },
    );
  }
}
