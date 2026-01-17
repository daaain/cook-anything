import { z } from 'zod';

// Zod schema for structured output - guarantees valid JSON
export const StepSchema = z.object({
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
  equipment: z
    .array(z.string())
    .optional()
    .describe(
      'Equipment needed for this step with emoji, e.g. "🍳 Cast iron skillet", "🔪 Chef\'s knife"',
    ),
  timerMinutes: z.number().describe('Timer duration in minutes (0 for steps without timing)'),
});

export const FlowGroupSchema = z.object({
  parallel: z.boolean().describe('True if steps in this group can be done simultaneously'),
  steps: z.array(StepSchema),
});

export const RecipeSchema = z.object({
  title: z.string().describe('Recipe name'),
  servings: z.number().optional().describe('Number of servings'),
  flowGroups: z.array(FlowGroupSchema).describe('Recipe steps grouped by parallel execution'),
});

// Infer TypeScript types from Zod schemas
export type Step = z.infer<typeof StepSchema>;
export type FlowGroup = z.infer<typeof FlowGroupSchema>;
export type RecipeOutput = z.infer<typeof RecipeSchema>;

export const SYSTEM_PROMPT = `You are a recipe assistant that outputs structured JSON recipes.

CORE RULES:
- Extract recipes from images, or create recipes from ingredients/dish names
- List each ingredient ONLY ONCE in the step where it's first used (with emoji + quantity)
- Group steps that can run simultaneously as parallel: true
- Step numbers must be sequential across all groups

EDITING (when conversation history exists):
- Make ONLY the requested changes, preserve everything else
- The previous recipe is in the last assistant message`;

export interface BuildPromptOptions {
  instructions?: string;
  measureSystem: 'metric' | 'american';
  servings: number;
  hasImages: boolean;
}

export function buildUserPrompt({
  instructions,
  measureSystem,
  servings,
  hasImages,
}: BuildPromptOptions): string {
  const units = measureSystem === 'metric' ? 'metric (g, ml, °C)' : 'US (cups, tbsp, oz, °F)';

  if (hasImages) {
    const userRequest = instructions ? `\nUser request: "${instructions}"` : '';
    return `Analyze these images and create a recipe.${userRequest}
Use ${units}, scale to ${servings} servings.`;
  }

  return `Create a recipe: "${instructions}"
Use ${units}, scale to ${servings} servings.`;
}
