import type { RecipeOutput } from './recipe';

// Recipe extends the LLM output schema with app-specific metadata
export interface Recipe extends RecipeOutput {
  slug?: string;
  savedAt?: string;
  conversationHistory?: Message[];
  measureSystem?: MeasureSystem;
  servingsCount?: number;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string | MessageContent[];
}

export interface MessageContent {
  type: 'text' | 'image';
  text?: string;
  image?: string;
  mimeType?: string;
}

export interface ImageData {
  base64: string;
  mediaType: string;
}

export type MeasureSystem = 'metric' | 'american';

export type ModelId = 'haiku' | 'sonnet' | 'opus';

export type ProviderType = 'claude' | 'openai-local';

export interface ProcessRecipeRequest {
  images: ImageData[];
  instructions?: string;
  conversationHistory?: Message[];
  measureSystem?: MeasureSystem;
  servings?: number;
  oauthToken?: string;
  model?: ModelId;
  providerType?: ProviderType;
  apiEndpoint?: string;
  customModel?: string;
}

export interface ProcessRecipeResponse {
  success: boolean;
  recipe?: Recipe;
  error?: string;
  assistantMessage?: string;
}

export interface OpenAIModel {
  id: string;
  object: string;
  created?: number;
  owned_by?: string;
}

export interface TestConnectionResponse {
  success: boolean;
  error?: string;
  models?: OpenAIModel[];
}
