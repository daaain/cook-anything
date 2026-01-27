/**
 * Client-side functions for communicating with local OpenAI-compatible APIs.
 * These run in the browser and connect directly to localhost (e.g., LM Studio, Ollama).
 *
 * Uses the AI SDK's @ai-sdk/openai-compatible package for consistent API with server-side.
 */

import { OpenAICompatibleChatLanguageModel } from '@ai-sdk/openai-compatible';
import {
  type AssistantModelMessage,
  generateObject,
  type ImagePart,
  type ModelMessage,
  type TextPart,
  type UserModelMessage,
} from 'ai';
import {
  buildUserPrompt,
  CLARIFYING_QUESTIONS_PROMPT,
  type ProcessResponse,
  ProcessResponseSchema,
  RecipeSchema,
  SYSTEM_PROMPT,
} from './recipe';
import type {
  ClarifyingQuestionsResponse,
  ImageData,
  MeasureSystem,
  Message,
  OpenAIModel,
  QuestionAnswer,
  Recipe,
  TestConnectionResponse,
} from './types';

/**
 * Test connection to a local OpenAI-compatible API endpoint.
 * Fetches the models list to verify connectivity.
 */
export async function testLocalConnection(apiEndpoint: string): Promise<TestConnectionResponse> {
  try {
    const modelsUrl = `${apiEndpoint}/models`;
    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to connect: ${response.status} ${response.statusText} - ${errorText}`,
      };
    }

    const data = await response.json();

    // Validate response structure
    if (!data.data || !Array.isArray(data.data)) {
      return {
        success: false,
        error: 'Invalid response format from API',
      };
    }

    return {
      success: true,
      models: data.data as OpenAIModel[],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Connection failed: ${errorMessage}`,
    };
  }
}

export interface ProcessRecipeLocalOptions {
  apiEndpoint: string;
  customModel?: string;
  images: ImageData[];
  instructions?: string;
  conversationHistory?: Message[];
  measureSystem: MeasureSystem;
  servings: number;
  allowClarifyingQuestions?: boolean;
  clarifyingAnswers?: QuestionAnswer[];
}

export interface ProcessRecipeLocalResponse {
  success: boolean;
  recipe?: Recipe;
  clarifyingQuestions?: ClarifyingQuestionsResponse;
  error?: string;
}

/**
 * Process a recipe using a local OpenAI-compatible API.
 * Uses the AI SDK for consistent API with server-side Claude implementation.
 */
export async function processRecipeLocal(
  options: ProcessRecipeLocalOptions,
): Promise<ProcessRecipeLocalResponse> {
  const {
    apiEndpoint,
    customModel,
    images,
    instructions,
    conversationHistory = [],
    measureSystem,
    servings,
    allowClarifyingQuestions = false,
    clarifyingAnswers,
  } = options;

  try {
    // Determine model to use
    const modelId = customModel || 'default';

    // Create the model with supportsStructuredOutputs enabled for LM Studio
    // This is a workaround for https://github.com/vercel/ai/issues/5197
    const model = new OpenAICompatibleChatLanguageModel(modelId, {
      provider: 'lmstudio.chat',
      url: ({ path }) => `${apiEndpoint}${path}`,
      headers: () => ({}),
      supportsStructuredOutputs: true,
    });

    // Build messages array using AI SDK types
    const messages: ModelMessage[] = [];

    // Add conversation history for context (for edits)
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

    // Build the current user message (with or without images)
    const hasImages = images && images.length > 0;
    const userPrompt = buildUserPrompt({
      instructions,
      measureSystem,
      servings,
      hasImages,
      allowClarifyingQuestions,
      clarifyingAnswers,
    });
    const userContent: Array<ImagePart | TextPart> = [];

    if (hasImages) {
      // Add images first
      for (const img of images) {
        const imagePart: ImagePart = {
          type: 'image',
          image: `data:${img.mediaType};base64,${img.base64}`,
        };
        userContent.push(imagePart);
      }
    }

    // Add text prompt
    const textPart: TextPart = {
      type: 'text',
      text: userPrompt,
    };
    userContent.push(textPart);

    const currentUserMessage: UserModelMessage = {
      role: 'user',
      content: userContent,
    };
    messages.push(currentUserMessage);

    // Determine if we should allow clarifying questions
    // Allow questions only if: enabled, no answers yet provided, and this is a new request
    const shouldAllowQuestions =
      allowClarifyingQuestions && !clarifyingAnswers && conversationHistory.length === 0;

    // Build system prompt - add clarifying questions instructions if allowed
    const systemPrompt = shouldAllowQuestions
      ? SYSTEM_PROMPT + CLARIFYING_QUESTIONS_PROMPT
      : SYSTEM_PROMPT;

    if (shouldAllowQuestions) {
      // Use discriminated union schema that allows either questions or recipe
      const { object } = await generateObject({
        model,
        schema: ProcessResponseSchema,
        system: systemPrompt,
        messages,
      });

      const response = object as ProcessResponse;

      if (response.type === 'clarifying_questions') {
        return {
          success: true,
          clarifyingQuestions: response,
        };
      }

      // It's a recipe response
      const recipeWithSettings: Recipe = {
        ...response.recipe,
        measureSystem,
        servingsCount: servings,
      };

      return {
        success: true,
        recipe: recipeWithSettings,
      };
    }

    // Standard recipe generation (no questions allowed or answers already provided)
    const { object: recipe } = await generateObject({
      model,
      schema: RecipeSchema,
      system: systemPrompt,
      messages,
    });

    // Add settings used to create this recipe
    const recipeWithSettings: Recipe = {
      ...(recipe as Recipe),
      measureSystem,
      servingsCount: servings,
    };

    return {
      success: true,
      recipe: recipeWithSettings,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Local API error:', error);
    return {
      success: false,
      error: `Failed to process recipe: ${errorMessage}`,
    };
  }
}
