# Recipe Flow

A Next.js web app that transforms recipe screenshots into interactive cooking flowcharts using Claude AI.

## Features

- **Recipe Screenshot Processing**: Upload photos of recipes and get a structured cooking flowchart
- **Measurement System Toggle**: Switch between metric (grams, ml, celsius) and US/imperial (cups, tbsp, fahrenheit)
- **Servings Scaling**: Adjust recipe quantities by setting desired number of servings
- **Step Types**: Color-coded steps for prep (blue), cook (orange), and rest (green)
- **Parallel Steps**: Visual grouping for steps that can be done simultaneously
- **Countdown Timers**: Built-in timers for cooking and resting steps
- **Recipe Library**: Save and manage your processed recipes locally
- **Edit Mode**: Make adjustments to recipes using conversation history
- **HTML Export**: Download recipes as standalone HTML files

## Tech Stack

- [Next.js 16](https://nextjs.org/) with App Router
- [Vercel AI SDK v6](https://sdk.vercel.ai/) with Anthropic provider
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Lucide React](https://lucide.dev/) for icons
- TypeScript

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) runtime
- Claude API OAuth token

### Installation

```bash
# Install dependencies
bun install

# Start development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Configuration

1. Click the **Settings** button in the app
2. Enter your Claude API OAuth token
3. The token is stored locally in your browser

## Usage

1. **Upload Recipe Images**: Tap the upload area to add recipe screenshots
2. **Set Preferences**: Choose metric or US measurements, set desired servings
3. **Add Adjustments** (optional): Enter modifications like "make it vegetarian"
4. **Process**: Click "Create Recipe Flow" to generate the flowchart
5. **Cook**: Use the interactive view with timers to follow along
6. **Save**: Store recipes in your local library for future use

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── process-recipe/    # Claude API integration
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── RecipeFlow.tsx         # Flowchart visualization
│   ├── RecipeLibrary.tsx      # Saved recipes list
│   ├── RecipeUploader.tsx     # Image upload & settings
│   └── TokenInput.tsx         # OAuth token management
└── lib/
    ├── storage.ts             # localStorage utilities
    ├── token.ts               # Token validation
    └── types.ts               # TypeScript interfaces
```

## API

The app uses Claude's vision capabilities to analyze recipe images. The API route (`/api/process-recipe`) accepts:

- `images`: Base64-encoded recipe screenshots
- `measureSystem`: "metric" or "american"
- `servings`: Number of servings to scale to
- `instructions`: Optional recipe modifications
- `token`: OAuth Bearer token for authentication

## License

MIT
