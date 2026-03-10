# Build context: project root (.)
# docker-compose.yml: context: . / dockerfile: ./packages/backend/Dockerfile
# ── Stage 1: Build shared package ─────────────────────────────────
FROM node:22-alpine AS shared-build

WORKDIR /build

# Copy root workspace config
COPY package.json package-lock.json* ./

# Copy workspace package.json files
COPY packages/shared/package.json ./packages/shared/package.json

# Stub other workspaces
RUN mkdir -p packages/backend packages/frontend && \
    echo '{"name":"@opsweave/backend","version":"0.1.0","private":true}' > packages/backend/package.json && \
    echo '{"name":"@opsweave/frontend","version":"0.1.0","private":true}' > packages/frontend/package.json

RUN npm ci --ignore-scripts

COPY tsconfig.base.json ./tsconfig.base.json
COPY packages/shared/ ./packages/shared/
RUN npm run build -w packages/shared

# ── Stage 2: Build backend ───────────────────────────────────────
FROM node:22-alpine AS backend-build

WORKDIR /build

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Copy root workspace config
COPY package.json package-lock.json* ./

# Copy workspace package.json files
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/backend/package.json ./packages/backend/package.json

# Stub frontend workspace
RUN mkdir -p packages/frontend && \
    echo '{"name":"@opsweave/frontend","version":"0.1.0","private":true}' > packages/frontend/package.json

RUN npm ci

# Copy tsconfig.base.json (extended by backend/tsconfig.json)
COPY tsconfig.base.json ./tsconfig.base.json

# Copy pre-built shared
COPY --from=shared-build /build/packages/shared/ ./packages/shared/

# Copy backend source
COPY packages/backend/ ./packages/backend/

# Build backend
RUN npm run build -w packages/backend

# Prune dev dependencies
RUN npm prune --omit=dev

# ── Stage 3: Production image ────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Install runtime dependencies for native modules (better-sqlite3)
RUN apk add --no-cache libstdc++

# Copy root package.json for workspace resolution
COPY --from=backend-build /build/package.json ./package.json

# Copy shared package (built)
COPY --from=backend-build /build/packages/shared/package.json ./packages/shared/package.json
COPY --from=backend-build /build/packages/shared/dist/ ./packages/shared/dist/

# Copy backend build output, dependencies, and package.json
COPY --from=backend-build /build/packages/backend/package.json ./packages/backend/package.json
COPY --from=backend-build /build/packages/backend/dist/ ./packages/backend/dist/
COPY --from=backend-build /build/node_modules/ ./node_modules/

# Copy i18n locales (loaded at runtime)
COPY --from=backend-build /build/packages/backend/src/i18n/ ./packages/backend/src/i18n/

# Copy non-TS assets that tsc doesn't emit (license public key)
COPY --from=backend-build /build/packages/backend/src/lib/license-public-key.pem ./packages/backend/dist/lib/license-public-key.pem

# Create data directory for SQLite (when used in single-container mode)
RUN mkdir -p /data && chown node:node /data

ENV NODE_ENV=production
ENV PORT=3000

USER node

EXPOSE 3000

CMD ["node", "packages/backend/dist/server.js"]
