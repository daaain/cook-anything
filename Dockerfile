FROM oven/bun:1.3.5-debian

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Expose Next.js dev port
EXPOSE 3421

# Default command
CMD ["bun", "dev", "--port", "3421"]
