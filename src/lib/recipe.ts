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
  ingredients: z
    .array(z.string())
    .optional()
    .describe('Complete ingredient list with emoji and quantity, e.g. "🧈 2 tbsp butter"'),
  equipment: z
    .array(z.string())
    .optional()
    .describe('All equipment needed with emoji, e.g. "🍳 Cast iron skillet"'),
  flowGroups: z.array(FlowGroupSchema).describe('Recipe steps grouped by parallel execution'),
});

// Infer TypeScript types from Zod schemas
export type Step = z.infer<typeof StepSchema>;
export type FlowGroup = z.infer<typeof FlowGroupSchema>;
export type RecipeOutput = z.infer<typeof RecipeSchema>;

export const SYSTEM_PROMPT = `You are a recipe assistant that outputs structured JSON recipes.

RULES:
- List ALL ingredients and equipment in top-level arrays (mise en place)
- Steps only list items used in that step
- parallel:true for steps that can happen simultaneously, parallel:false for sequential steps
- Sequential step numbers across all groups

EXAMPLE OUTPUT:
{"title":"Garlic Butter Pasta","servings":2,"ingredients":["🍝 200g spaghetti","🧈 3 tbsp butter","🧄 4 cloves garlic, minced","🧀 50g parmesan, grated","🌿 Fresh parsley, chopped","🧂 Salt and pepper"],"equipment":["🍲 Large pot","🍳 Large pan","📏 Colander"],"flowGroups":[{"parallel":true,"steps":[{"stepNumber":1,"type":"prep","instruction":"Mince garlic and grate parmesan.","ingredients":["🧄 4 cloves garlic, minced","🧀 50g parmesan, grated"],"equipment":["🔪 Knife"],"timerMinutes":0},{"stepNumber":2,"type":"cook","instruction":"Boil salted water and cook pasta until al dente.","ingredients":["🍝 200g spaghetti","🧂 Salt and pepper"],"equipment":["🍲 Large pot","📏 Colander"],"timerMinutes":10}]},{"parallel":false,"steps":[{"stepNumber":3,"type":"cook","instruction":"Melt butter, sauté garlic until fragrant. Toss with drained pasta, parmesan, and parsley.","ingredients":["🧈 3 tbsp butter","🧄 4 cloves garlic, minced","🧀 50g parmesan, grated","🌿 Fresh parsley, chopped"],"equipment":["🍳 Large pan"],"timerMinutes":3}]}]}

EDITING (when conversation history exists):
- Make ONLY the requested changes, preserve everything else`;

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
