import { NextRequest, NextResponse } from "next/server";
import { createClaudeCode } from "ai-sdk-provider-claude-code";
import {
	generateText,
	ModelMessage,
	UserModelMessage,
	AssistantModelMessage,
	ImagePart,
	TextPart,
} from "ai";
import { ProcessRecipeRequest, Recipe, MeasureSystem } from "@/lib/types";

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

function buildUserPrompt({
	instructions,
	measureSystem,
	servings,
}: PromptOptions): string {
	const measureDesc =
		measureSystem === "metric"
			? "metric units (grams, ml, celsius)"
			: "US/imperial units (cups, tablespoons, ounces, fahrenheit)";

	return `Analyze these recipe screenshots and extract the recipe information.

RECIPE SETTINGS:
- Measurement system: ${measureDesc}
- Scale recipe to: ${servings} servings
${instructions ? `\nUSER ADJUSTMENTS - Apply these modifications to the recipe:\n${instructions}\n` : ""}
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

// Create Claude Code provider with streaming enabled for image support
const claudeCode = createClaudeCode({
	defaultSettings: {
		streamingInput: "always",
	},
});

export async function POST(request: NextRequest) {
	try {
		const body: ProcessRecipeRequest = await request.json();
		const {
			images,
			instructions,
			conversationHistory,
			measureSystem = "metric",
			servings = 4,
		} = body;

		// Validate images
		if (!images || images.length === 0) {
			return NextResponse.json(
				{ success: false, error: "At least one image is required" },
				{ status: 400 },
			);
		}

		// Build the messages for the API call
		const messages: ModelMessage[] = [];

		// Add conversation history for context (for edits)
		if (conversationHistory && conversationHistory.length > 0) {
			for (const msg of conversationHistory) {
				if (msg.role === "user") {
					const userMsg: UserModelMessage = {
						role: "user",
						content:
							typeof msg.content === "string"
								? msg.content
								: JSON.stringify(msg.content),
					};
					messages.push(userMsg);
				} else if (msg.role === "assistant") {
					const assistantMsg: AssistantModelMessage = {
						role: "assistant",
						content:
							typeof msg.content === "string"
								? msg.content
								: JSON.stringify(msg.content),
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
				type: "image",
				image: dataUrl,
			};
			userContent.push(imagePart);
		}

		// Add the text prompt
		const textPart: TextPart = {
			type: "text",
			text: buildUserPrompt({ instructions, measureSystem, servings }),
		};
		userContent.push(textPart);

		const currentUserMessage: UserModelMessage = {
			role: "user",
			content: userContent,
		};
		messages.push(currentUserMessage);

		// Call Claude API using Claude Code provider
		// Uses CLI authentication - ensure `claude login` has been run on the server
		const { text } = await generateText({
			model: claudeCode("opus"),
			system: SYSTEM_PROMPT,
			messages,
		});

		// Parse the response
		let recipe: Recipe;
		try {
			// Try to extract JSON from the response (in case there's extra text)
			const jsonMatch = text.match(/\{[\s\S]*\}/);
			if (!jsonMatch) {
				throw new Error("No JSON object found in response");
			}
			recipe = JSON.parse(jsonMatch[0]);

			// Validate the recipe structure
			if (
				!recipe.title ||
				!recipe.flowGroups ||
				!Array.isArray(recipe.flowGroups)
			) {
				throw new Error("Invalid recipe structure");
			}

			// Ensure all required fields are present
			recipe.flowGroups = recipe.flowGroups.map((group) => ({
				parallel: Boolean(group.parallel),
				steps: group.steps.map((step) => ({
					stepNumber: step.stepNumber || 0,
					type: step.type || "prep",
					instruction: step.instruction || "",
					ingredients: step.ingredients || [],
					timerMinutes: step.timerMinutes || 0,
				})),
			}));
		} catch (parseError) {
			console.error("Failed to parse recipe:", parseError, "Response:", text);
			return NextResponse.json(
				{ success: false, error: "Failed to parse recipe from AI response" },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			recipe,
			assistantMessage: text,
		});
	} catch (error) {
		console.error("Error processing recipe:", error);

		// Check for API errors
		if (error instanceof Error) {
			if (
				error.message.includes("401") ||
				error.message.includes("Unauthorized") ||
				error.message.includes("authentication")
			) {
				return NextResponse.json(
					{
						success: false,
						error:
							"Authentication failed. Ensure the server has run `claude login`.",
					},
					{ status: 401 },
				);
			}
			if (
				error.message.includes("429") ||
				error.message.includes("rate limit")
			) {
				return NextResponse.json(
					{
						success: false,
						error: "Rate limit exceeded. Please try again later.",
					},
					{ status: 429 },
				);
			}
			if (
				error.message.includes("insufficient") ||
				error.message.includes("quota")
			) {
				return NextResponse.json(
					{
						success: false,
						error: "API quota exceeded. Please check your account.",
					},
					{ status: 402 },
				);
			}
		}

		return NextResponse.json(
			{
				success: false,
				error:
					"An error occurred while processing the recipe. Please try again.",
			},
			{ status: 500 },
		);
	}
}
