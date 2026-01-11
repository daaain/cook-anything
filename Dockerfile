FROM oven/bun:1.3.5-debian

# Install system dependencies for canvas (needed for tests)
RUN apt-get update && apt-get install -y \
    libcairo2-dev \
    libjpeg62-turbo-dev \
    libpango1.0-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    libexpat1-dev \
    && rm -rf /var/lib/apt/lists/*

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
