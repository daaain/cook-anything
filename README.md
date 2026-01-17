# Recipe Flow

A Next.js web app that turns recipe screenshots or ingredient photos into interactive cooking flowcharts using Claude AI.

Demo 1 mobile with Claude – creating a recipe from photo of ingredients you have as a starting point:
https://github.com/user-attachments/assets/fe878731-e794-4bbb-8d02-b8ae9f0c3539

Demo 2 desktop with LM Studio – creating a recipe from a photo of a supermarket product:
https://github.com/user-attachments/assets/874478b3-e8d8-4240-961c-efe70f835708

## Features

- **Recipe Processing**: Upload recipe screenshots to extract structured flowcharts, or photograph your ingredients to generate a recipe from scratch
- **Text Input**: Paste a recipe or describe what you want to cook
- **Local models or Claude subscription**: Use OpenAI compatible local inference (LM Studio, Ollama, etc) or generate an OAuth token with Claude Code
- **Measurement System Toggle**: Switch between metric (grams, ml, celsius) and US/imperial (cups, tbsp, fahrenheit)
- **Servings Scaling**: Adjust recipe quantities by setting desired number of servings
- **Step Types**: Colour-coded steps for prep (blue), cook (orange), and rest (purple)
- **Parallel Steps**: Visual grouping for steps that can be done simultaneously
- **Countdown Timers**: Built-in timers for cooking and resting steps
- **Recipe Library**: Save and manage your processed recipes locally – (bulk) export / import makes it possible to move between devices
- **Edit Mode**: Make adjustments to recipes using natural language
- **HTML Export**: Download recipes as standalone HTML files (importable)

## Tech Stack

- [Next.js 16](https://nextjs.org/) with App Router
- [Vercel AI SDK](https://sdk.vercel.ai/) with [Claude Code provider](https://www.npmjs.com/package/ai-sdk-provider-claude-code)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Lucide React](https://lucide.dev/) for icons
- TypeScript

## Development

### Prerequisites

- [Docker](https://www.docker.com/)
- [just](https://github.com/casey/just) command runner
- Claude Code OAuth token generated or OpenAI compatible local inference server running

### Commands

```bash
# Start development server (runs in Docker)
just dev

# View logs
just logs

# Stop server
just stop
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## License

MIT
