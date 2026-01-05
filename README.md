# Recipe Flow

A Next.js web app that turns recipe screenshots or ingredient photos into interactive cooking flowcharts using Claude AI.

See demo video below showing a recipe modification flow using screenshots and pasting them into the app.

Note: it's recorded on the desktop as it was easier to do, but the screenshot feature is more useful on mobile where it's a simple gesture to take one and apps often disable text selection. The app's prompt also supports using photos of ingredients as a starting point of recipes, or mixing an existing recipe with what you have available and modifications requested in the text input, etc. Be creative!

https://github.com/user-attachments/assets/3ee93c37-4a6d-4f3f-b37d-ffc398240973

## Features

- **Recipe Processing**: Upload recipe screenshots to extract structured flowcharts, or photograph your ingredients to generate a recipe from scratch
- **Text Input**: Paste a recipe or describe what you want to cook
- **Model Selection**: Choose between Haiku (fast), Sonnet (balanced), or Opus (best quality)
- **Measurement System Toggle**: Switch between metric (grams, ml, celsius) and US/imperial (cups, tbsp, fahrenheit)
- **Servings Scaling**: Adjust recipe quantities by setting desired number of servings
- **Step Types**: Colour-coded steps for prep (blue), cook (orange), and rest (purple)
- **Parallel Steps**: Visual grouping for steps that can be done simultaneously
- **Countdown Timers**: Built-in timers for cooking and resting steps
- **Recipe Library**: Save and manage your processed recipes locally
- **Edit Mode**: Make adjustments to recipes using natural language
- **HTML Export**: Download recipes as standalone HTML files

## Tech Stack

- [Next.js 16](https://nextjs.org/) with App Router
- [Vercel AI SDK](https://sdk.vercel.ai/) with [Claude Code provider](https://www.npmjs.com/package/ai-sdk-provider-claude-code)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Lucide React](https://lucide.dev/) for icons
- TypeScript

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/)
- [just](https://github.com/casey/just) command runner
- Claude API OAuth token

### Development

```bash
# Start development server (runs in Docker)
just dev

# View logs
just logs

# Stop server
just stop
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Configuration

1. Click the **Settings** button in the app
2. Enter your Claude API OAuth token
3. The token is stored locally in your browser

## Usage

1. **Add Recipe**: Upload recipe screenshots, photograph your ingredients, or paste/type a recipe
2. **Set Preferences**: Choose metric or US measurements, set desired servings, select AI model
3. **Add Instructions** (optional): Enter modifications like "make it vegetarian" or specify a dish
4. **Process**: Click "Create Recipe Flow" to generate the flowchart
5. **Cook**: Use the interactive view with timers to follow along
6. **Save**: Store recipes in your local library for future use

## API

The app uses Claude's vision capabilities to analyse images and extract or create recipes. The API route (`/api/process-recipe`) accepts:

- `images`: Base64-encoded images (recipe screenshots or ingredient photos)
- `instructions`: Text input—a recipe to parse, a dish to create, or modifications
- `measureSystem`: "metric" or "american"
- `servings`: Number of servings to scale to
- `model`: "haiku", "sonnet", or "opus"
- `oauthToken`: OAuth Bearer token for authentication

## License

MIT
