import type { Message, MessageContent, Recipe } from './types';

/**
 * Escape HTML special characters to prevent XSS attacks.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strip base64 image data from conversation history to reduce export size.
 * Replaces image content with a placeholder.
 */
export function stripImagesFromConversation(messages: Message[]): Message[] {
  return messages.map((message) => {
    if (typeof message.content === 'string') {
      return message;
    }

    const strippedContent: MessageContent[] = message.content.map((content) => {
      if (content.type === 'image') {
        return { type: 'image', text: '[image]' };
      }
      return content;
    });

    return { ...message, content: strippedContent };
  });
}

/**
 * Prepare a recipe for export by stripping image data from conversation history.
 */
export function prepareRecipeForExport(recipe: Recipe): Recipe {
  if (!recipe.conversationHistory) {
    return recipe;
  }

  return {
    ...recipe,
    conversationHistory: stripImagesFromConversation(recipe.conversationHistory),
  };
}

/**
 * Generate type-specific styles for recipe steps.
 */
function getTypeStyles() {
  return {
    prep: {
      bg: '#eff6ff',
      border: '#bfdbfe',
      badge: '#dbeafe',
      text: '#1d4ed8',
    },
    cook: {
      bg: '#fff7ed',
      border: '#fed7aa',
      badge: '#ffedd5',
      text: '#c2410c',
    },
    rest: {
      bg: '#faf5ff',
      border: '#e9d5ff',
      badge: '#f3e8ff',
      text: '#7c3aed',
    },
  };
}

/**
 * Generate the HTML for recipe steps.
 */
function generateStepsHtml(recipe: Recipe): string {
  const typeStyles = getTypeStyles();

  return recipe.flowGroups
    .map((group) => {
      if (group.parallel) {
        return `
          <div style="border: 2px dashed #fcd34d; border-radius: 12px; padding: 16px; background: rgba(254, 243, 199, 0.3); margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 8px; color: #b45309; margin-bottom: 16px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
              <span style="font-size: 14px; font-weight: 500;">These can be done in parallel</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px;">
              ${group.steps
                .map((step) => {
                  const style = typeStyles[step.type];
                  return `
                  <div style="background: ${style.bg}; border: 1px solid ${style.border}; border-radius: 12px; padding: 16px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                      <div style="width: 32px; height: 32px; border-radius: 50%; background: ${style.badge}; color: ${style.text}; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px;">
                        ${escapeHtml(String(step.stepNumber))}
                      </div>
                      <span style="background: ${style.badge}; color: ${style.text}; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; text-transform: capitalize;">
                        ${escapeHtml(step.type)}
                      </span>
                      ${step.timerMinutes > 0 ? `<span style="font-size: 12px; color: #6b7280;">${escapeHtml(String(step.timerMinutes))} min</span>` : ''}
                    </div>
                    <p style="color: #374151; line-height: 1.6; margin: 0;">${escapeHtml(step.instruction)}</p>
                    ${
                      step.ingredients.length > 0
                        ? `
                      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;">
                        ${step.ingredients
                          .map(
                            (ing) => `
                          <span style="background: rgba(255,255,255,0.7); border: 1px solid #e5e7eb; padding: 4px 8px; border-radius: 12px; font-size: 12px; color: #4b5563;">
                            ${escapeHtml(ing)}
                          </span>
                        `,
                          )
                          .join('')}
                      </div>
                    `
                        : ''
                    }
                  </div>
                `;
                })
                .join('')}
            </div>
          </div>
        `;
      }

      return group.steps
        .map((step) => {
          const style = typeStyles[step.type];
          return `
            <div style="background: ${style.bg}; border: 1px solid ${style.border}; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: ${style.badge}; color: ${style.text}; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px;">
                  ${escapeHtml(String(step.stepNumber))}
                </div>
                <span style="background: ${style.badge}; color: ${style.text}; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; text-transform: capitalize;">
                  ${escapeHtml(step.type)}
                </span>
                ${step.timerMinutes > 0 ? `<span style="font-size: 12px; color: #6b7280;">${escapeHtml(String(step.timerMinutes))} min</span>` : ''}
              </div>
              <p style="color: #374151; line-height: 1.6; margin: 0;">${escapeHtml(step.instruction)}</p>
              ${
                step.ingredients.length > 0
                  ? `
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;">
                  ${step.ingredients
                    .map(
                      (ing) => `
                    <span style="background: rgba(255,255,255,0.7); border: 1px solid #e5e7eb; padding: 4px 8px; border-radius: 12px; font-size: 12px; color: #4b5563;">
                      ${escapeHtml(ing)}
                    </span>
                  `,
                    )
                    .join('')}
                </div>
              `
                  : ''
              }
            </div>
          `;
        })
        .join('');
    })
    .join('');
}

/**
 * Generate a complete HTML document for a recipe with embedded JSON data.
 */
export function generateRecipeHtml(recipe: Recipe): string {
  const exportableRecipe = prepareRecipeForExport(recipe);
  const stepsHTML = generateStepsHtml(recipe);
  const recipeJson = JSON.stringify(exportableRecipe, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(recipe.title)} - Recipe Flow</title>
  <script type="application/json" id="recipe-data">
${recipeJson}
  </script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 50%, #f97316 100%);
      min-height: 100vh;
      padding: 24px;
    }
    .container { max-width: 800px; margin: 0 auto; }
    .card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    h1 { color: #1f2937; font-size: 24px; margin-bottom: 8px; }
    .servings { color: #6b7280; font-size: 14px; margin-bottom: 24px; display: flex; align-items: center; gap: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>${escapeHtml(recipe.title)}</h1>
      ${recipe.servings ? `<div class="servings"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>${escapeHtml(String(recipe.servings))}</div>` : ''}
      ${stepsHTML}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Parse a recipe from an exported HTML file.
 * Returns null if the HTML doesn't contain valid recipe data.
 */
export function parseRecipeFromHtml(html: string): Recipe | null {
  try {
    // Use regex to extract the JSON from the script tag
    // This works both in browser and Node.js environments
    const scriptMatch = html.match(
      /<script\s+type="application\/json"\s+id="recipe-data">\s*([\s\S]*?)\s*<\/script>/,
    );

    if (!scriptMatch || !scriptMatch[1]) {
      return null;
    }

    const jsonString = scriptMatch[1].trim();
    const recipe = JSON.parse(jsonString) as Recipe;

    // Basic validation
    if (!recipe.title || !Array.isArray(recipe.flowGroups)) {
      return null;
    }

    return recipe;
  } catch {
    return null;
  }
}

/**
 * Generate a filename for a recipe export.
 */
export function generateExportFilename(recipe: Recipe): string {
  const slug = recipe.slug || recipe.title.toLowerCase().replace(/\s+/g, '-');
  return `${slug}.html`;
}

/**
 * Trigger a file download in the browser.
 */
export function downloadFile(
  content: string | Blob,
  filename: string,
  mimeType = 'text/html',
): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
