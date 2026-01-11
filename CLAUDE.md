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

## Testing

Uses Bun's built-in test runner (`bun:test`) with Jest-like API.

```bash
bun test           # Run all tests
bun test --watch   # Run tests in watch mode
```

### Test Setup

- **Config**: `bunfig.toml` preloads `src/test-setup.ts`
- **Setup file**: `src/test-setup.ts` provides DOM/canvas polyfills via JSDOM and node-canvas
- **Pattern**: Tests are `*.test.ts` files alongside source files in `src/`

### Writing Tests

```typescript
import { describe, it, expect } from 'bun:test';

describe('myFunction', () => {
  it('should do something', () => {
    expect(result).toBe(expected);
  });
});
```

Key testing libraries available:

- `@testing-library/jest-dom` for extended matchers
- `jsdom` for DOM environment
- `canvas` for image operations
