# Recipe Flow Development

## Runtime

This project uses [Bun](https://bun.sh/) as the JavaScript runtime and package manager.

## Development

Development runs in a daemonised Docker container. Use justfile commands:

```bash
just dev          # Start dev server (daemonised)
just logs         # View container logs - check this for errors
just stop         # Stop containers
just rebuild      # Rebuild and restart
just shell        # Open bash shell in container
just check-claude # Verify Claude CLI is working
```

After running `just dev`, always check `just logs` to monitor for errors.

## Dependencies

```bash
just bun add <package>
```

## Code Quality

Linting uses Biome (fast, general) and ESLint (React/Next.js specific). TypeScript checking via tsc.

```bash
bun run check      # Run all checks (typecheck + lint)
bun run typecheck  # TypeScript type checking
bun run lint       # Biome + ESLint
bun run lint:fix   # Auto-fix linting issues
bun run format     # Format and organise imports (Biome)
```
