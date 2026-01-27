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

// Clarifying question schemas
export const ClarifyingQuestionSchema = z.object({
  id: z.string().describe('Unique identifier for the question'),
  question: z.string().describe('The question to ask the user'),
  options: z
    .array(z.string().describe('Option text that serves as both display label and value'))
    .min(2)
    .max(5)
    .describe('Multiple choice options for the question'),
});

export const ClarifyingQuestionsResponseSchema = z.object({
  type: z.literal('clarifying_questions'),
  questions: z.array(ClarifyingQuestionSchema).min(1).max(5),
  context: z.string().optional().describe('Brief explanation of why questions are needed'),
});

export const RecipeResponseSchema = z.object({
  type: z.literal('recipe'),
  recipe: RecipeSchema,
});

export const ProcessResponseSchema = z.discriminatedUnion('type', [
  ClarifyingQuestionsResponseSchema,
  RecipeResponseSchema,
]);

// Infer TypeScript types from Zod schemas
export type Step = z.infer<typeof StepSchema>;
export type FlowGroup = z.infer<typeof FlowGroupSchema>;
export type RecipeOutput = z.infer<typeof RecipeSchema>;
export type ClarifyingQuestion = z.infer<typeof ClarifyingQuestionSchema>;
export type ClarifyingQuestionsResponse = z.infer<typeof ClarifyingQuestionsResponseSchema>;
export type RecipeResponse = z.infer<typeof RecipeResponseSchema>;
export type ProcessResponse = z.infer<typeof ProcessResponseSchema>;

export const CLARIFYING_QUESTIONS_PROMPT = `

CLARIFYING QUESTIONS MODE:
When the user's request is ambiguous or could benefit from clarification, you may ask 1-5 clarifying questions BEFORE generating the recipe. Return questions when:
- The recipe request is vague (e.g., "something with chicken", "a quick dinner")
- There are multiple reasonable interpretations
- Key details like cuisine style, dietary restrictions, or cooking method would significantly affect the recipe

If the request is clear and specific (e.g., "Pasta carbonara", "Classic beef tacos"), generate the recipe directly without asking questions.

When asking questions, respond with type "clarifying_questions" and provide multiple-choice options that cover the most likely preferences.`;

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

export interface QuestionAnswer {
  questionId: string;
  selectedOption: string | null; // null if "Other" was selected
  customText?: string; // Custom text when "Other" is selected
}

export interface BuildPromptOptions {
  instructions?: string;
  measureSystem: 'metric' | 'american';
  servings: number;
  hasImages: boolean;
  allowClarifyingQuestions?: boolean;
  clarifyingAnswers?: QuestionAnswer[];
}

export function buildUserPrompt({
  instructions,
  measureSystem,
  servings,
  hasImages,
  clarifyingAnswers,
}: BuildPromptOptions): string {
  const units = measureSystem === 'metric' ? 'metric (g, ml, °C)' : 'US (cups, tbsp, oz, °F)';

  // Build the base prompt
  let basePrompt: string;
  if (hasImages) {
    const userRequest = instructions ? `\nUser request: "${instructions}"` : '';
    basePrompt = `Analyze these images and create a recipe.${userRequest}
Use ${units}, scale to ${servings} servings.`;
  } else {
    basePrompt = `Create a recipe: "${instructions}"
Use ${units}, scale to ${servings} servings.`;
  }

  // If we have answers to clarifying questions, include them
  if (clarifyingAnswers && clarifyingAnswers.length > 0) {
    const answersText = clarifyingAnswers
      .map((a) => {
        if (a.selectedOption === null && a.customText) {
          return `- ${a.questionId}: ${a.customText}`;
        }
        return `- ${a.questionId}: ${a.selectedOption}`;
      })
      .join('\n');
    return `${basePrompt}

User preferences from clarifying questions:
${answersText}`;
  }

  return basePrompt;
}
