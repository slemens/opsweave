# ── Stage 1: Build shared package ─────────────────────────────────
# Build context: project root (.)
# docker-compose.yml should use: context: . / dockerfile: packages/frontend/Dockerfile
FROM node:22-alpine AS shared-build

WORKDIR /build

# Copy root workspace config
COPY package.json package-lock.json* ./

# Copy workspace package.json files for dependency resolution
COPY packages/shared/package.json ./packages/shared/package.json

# Stub other workspaces so npm resolves correctly
RUN mkdir -p packages/backend packages/frontend && \
    echo '{"name":"@opsweave/backend","version":"0.1.0","private":true}' > packages/backend/package.json && \
    echo '{"name":"@opsweave/frontend","version":"0.1.0","private":true}' > packages/frontend/package.json

RUN npm ci --ignore-scripts

COPY tsconfig.base.json ./tsconfig.base.json
COPY packages/shared/ ./packages/shared/
RUN npm run build -w packages/shared

# ── Stage 2: Build frontend ──────────────────────────────────────
FROM node:22-alpine AS frontend-build

WORKDIR /build

# Copy root workspace config
COPY package.json package-lock.json* ./

# Copy workspace package.json files
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/frontend/package.json ./packages/frontend/package.json

# Stub backend workspace
RUN mkdir -p packages/backend && \
    echo '{"name":"@opsweave/backend","version":"0.1.0","private":true}' > packages/backend/package.json

RUN npm ci --ignore-scripts

# Copy tsconfig.base.json (extended by frontend tsconfigs)
COPY tsconfig.base.json ./tsconfig.base.json

# Copy pre-built shared
COPY --from=shared-build /build/packages/shared/ ./packages/shared/

# Copy frontend source
COPY packages/frontend/ ./packages/frontend/

# Build-time env vars for Vite
ARG VITE_API_URL=/api
ARG VITE_WS_URL=/ws
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}

RUN npm run build -w packages/frontend

# ── Stage 3: Serve with nginx ────────────────────────────────────
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# SPA-friendly nginx config
RUN cat > /etc/nginx/conf.d/default.conf <<'NGINX'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
    gzip_min_length 256;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # SPA routing — serve index.html for all non-file routes
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

COPY --from=frontend-build /build/packages/frontend/dist/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
