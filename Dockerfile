# ===========================================================================
# FlowForge Production Dockerfile
# Multi-stage: build backend → build client → production image
# ===========================================================================

# ---------- Stage 1: Build Backend ----------
FROM node:20-alpine AS backend-builder

WORKDIR /app

# Copy root package files + prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (need devDeps for tsc)
RUN npm ci

# Copy backend source
COPY src ./src/
COPY tsconfig.json ./

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript → dist/
RUN npm run build

# ---------- Stage 2: Build Client ----------
FROM node:20-alpine AS client-builder

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install client dependencies
RUN npm ci

# Copy client source
COPY client/ ./

# Set API URL to relative path for same-origin serving
ENV VITE_API_URL=/api/v1

# Build Vite → dist/
RUN npm run build

# ---------- Stage 3: Production ----------
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S flowforge -u 1001

# Copy root package files + prisma
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production

# Generate Prisma client (needed at runtime)
RUN npx prisma generate

# Copy built backend from stage 1
COPY --from=backend-builder /app/dist ./dist

# Copy built client from stage 2
COPY --from=client-builder /app/client/dist ./client/dist

# Set ownership
RUN chown -R flowforge:nodejs /app

# Switch to non-root user
USER flowforge

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run migrations and start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
