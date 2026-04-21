# Multi-stage build for Signal MCP Server with Streamable HTTP
# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-slim AS production

WORKDIR /app

# Install runtime dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create directory for Signal data mount point
RUN mkdir -p /signal-data

# Environment variables with defaults
ENV MCP_TRANSPORT=http
ENV MCP_HTTP_PORT=3000
ENV SIGNAL_SOURCE_DIR=/signal-data

# The auth token should be provided at runtime
# ENV MCP_AUTH_TOKEN=

# Expose the HTTP port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:${MCP_HTTP_PORT}/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Run the server
CMD ["node", "dist/index.js"]
