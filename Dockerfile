# ============================================================
#  LamsaDZ — Production Docker image
# ============================================================
FROM node:20-bookworm-slim AS base

# System deps for better-sqlite3 + sharp native builds
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Create runtime dirs & non-root user
RUN mkdir -p db logs public/uploads \
    && groupadd -r app && useradd -r -g app app \
    && chown -R app:app /app
USER app

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Run migrations + seed on first boot, then start
CMD ["sh", "-c", "node scripts/migrate.js && node scripts/seed.js && node src/server.js"]
