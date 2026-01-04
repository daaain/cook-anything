# Default recipe - show available commands
default:
    @just --list

# Build the Docker image
build:
    docker compose build

# Start the development server in Docker (detached, use `just logs` to follow)
dev:
    docker compose up -d

# Stop all containers
stop:
    docker compose down

# Rebuild and start (detached)
rebuild:
    docker compose up --build -d

# Open a shell in the container
shell:
    docker compose exec app bash

# Run bun commands inside container
bun *args:
    docker compose exec app bun {{args}}

# View container logs
logs:
    docker compose logs -f

# Clean up all containers and images
clean:
    docker compose down --rmi all --volumes

# Run with OAuth token (pass as argument)
dev-oauth token:
    CLAUDE_CODE_OAUTH_TOKEN={{token}} docker compose up -d

# Check if Claude CLI is working in container
check-claude:
    docker compose exec app bunx @anthropic-ai/claude-code --version
