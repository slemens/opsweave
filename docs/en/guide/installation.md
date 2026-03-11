# Installation

OpsWeave offers two deployment variants: single-container for easy setup and
multi-container for production.

## Variant A: Single-Container (Quick Start)

Ideal for evaluation, small teams, and the Community Edition.
Uses SQLite — no external database required.

```bash
docker run -d \
  -p 8080:8080 \
  -v opsweave-data:/data \
  --name opsweave \
  ghcr.io/slemens/opsweave:latest
```

> Open http://localhost:8080

**Default Login:** `admin@opsweave.local` / `changeme`

> **Tip:** The SQLite database is located at `/data/opsweave.db` in the volume mount.
> For backups: `docker cp opsweave:/data/opsweave.db ./backup.db`

## Variant B: Multi-Container (Production)

For production deployments with PostgreSQL and Redis.

```bash
# Clone repository
git clone https://github.com/slemens/opsweave.git
cd opsweave

# Adjust configuration
cp .env.example .env
# Edit .env: DB passwords, JWT_SECRET, SMTP etc.

# Start containers
docker compose up -d
```

> Open http://localhost:8080 (or configured port)

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Runtime environment |
| `PORT` | `3000` | Backend port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_URL` | `redis://redis:6379` | Redis connection |
| `JWT_SECRET` | — | **Must be set** |
| `SESSION_SECRET` | — | Session encryption |

## Variant C: Development

```bash
git clone https://github.com/slemens/opsweave.git
cd opsweave

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Initialize database + load seed data
npm run db:seed

# Start frontend + backend (with hot reload)
npm run dev:frontend  # Port 5173
npm run dev:backend   # Port 3000
```

## System Requirements

| | Single-Container | Multi-Container |
|---|---|---|
| **RAM** | ≥ 512 MB | ≥ 2 GB |
| **CPU** | 1 Core | ≥ 2 Cores |
| **Disk** | ≥ 1 GB | ≥ 10 GB |
| **Docker** | ≥ 24.0 | ≥ 24.0 |
| **Node.js** | — | ≥ 20.0 (Dev only) |

## After Installation

1. **Change the first admin account** — password under Settings → Profile
2. **Configure tenant** — name, language, branding
3. **Create first assets** (or import via API)
4. **Remove demo data** — `npm run db:seed:clean` (Development only)

## Updates

```bash
# Single-Container
docker pull ghcr.io/slemens/opsweave:latest
docker stop opsweave && docker rm opsweave
# Restart with the same parameters

# Multi-Container
git pull
docker compose pull
docker compose up -d
```

Migrations are executed automatically on startup.
