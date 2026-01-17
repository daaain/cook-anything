import { z } from 'zod';
import type { MeasureSystem } from './types';

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
  servings: z.string().optional().describe('Number of servings'),
  flowGroups: z.array(FlowGroupSchema).describe('Recipe steps grouped by parallel execution'),
});

export const SYSTEM_PROMPT = `You are a recipe assistant. Your job is to help users cook by either:
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
7. Integrate ingredient amounts naturally into instructions
8. List equipment needed for each step with emojis (e.g. "🍳 Cast iron skillet", "🔪 Chef's knife", "🥣 Mixing bowl")`;

export interface BuildPromptOptions {
  instructions?: string;
  measureSystem: MeasureSystem;
  servings: number;
  hasImages: boolean;
}

export function buildUserPrompt({
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
3. List each ingredient ONLY ONCE - in the step where it is first used or prepped (use emoji, e.g. "🧈 2 tbsp butter"). Do NOT re-list ingredients in later steps; just reference them in the instruction text (e.g. "Add the melted butter" not "🧈 melted butter" in ingredients array)
4. List the equipment needed for each step in the equipment array (use emoji, e.g. "🍳 Cast iron skillet", "🔪 Chef's knife")
5. Group steps that can happen simultaneously as parallel: true
6. Identify step types: prep (cutting, mixing), cook (heat applied), rest (waiting/marinating)
7. Estimate timer minutes for steps that need timing (cooking, marinating, resting). Use 0 for steps without timers.
8. Make instructions clear and actionable
9. Keep the original recipe flow but optimise for parallel prep where logical
10. Step numbers should be sequential across all groups`;
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
5. List each ingredient ONLY ONCE - in the step where it is first used or prepped (use emoji, e.g. "🧈 2 tbsp butter"). Do NOT re-list ingredients in later steps; just reference them in the instruction text (e.g. "Add the melted butter" not "🧈 melted butter" in ingredients array)
6. List the equipment needed for each step in the equipment array (use emoji, e.g. "🍳 Cast iron skillet", "🔪 Chef's knife")
7. Group steps that can happen simultaneously as parallel: true
8. Identify step types: prep (cutting, mixing), cook (heat applied), rest (waiting/marinating)
9. Estimate timer minutes for steps that need timing (cooking, marinating, resting). Use 0 for steps without timers.
10. Make instructions clear and actionable
11. Optimise for parallel prep where logical
12. Step numbers should be sequential across all groups and start from 1`;
}
