export interface Recipe {
  title: string;
  servings?: string;
  flowGroups: FlowGroup[];
  slug?: string;
  savedAt?: string;
  conversationHistory?: Message[];
}

export interface FlowGroup {
  parallel: boolean;
  steps: Step[];
}

export interface Step {
  stepNumber: number;
  type: 'prep' | 'cook' | 'rest';
  instruction: string;
  ingredients: string[];
  timerMinutes: number;
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

export interface ProcessRecipeRequest {
  images: ImageData[];
  instructions?: string;
  conversationHistory?: Message[];
  measureSystem?: MeasureSystem;
  servings?: number;
  oauthToken?: string;
}

export interface ProcessRecipeResponse {
  success: boolean;
  recipe?: Recipe;
  error?: string;
  assistantMessage?: string;
}
