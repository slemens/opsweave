# Installation

OpsWeave bietet zwei Deployment-Varianten: Single-Container für einfachen Start und
Multi-Container für Production.

## Variante A: Single-Container (Quick Start)

Ideal für Evaluation, kleine Teams und die Community Edition.
Nutzt SQLite — keine externe Datenbank nötig.

```bash
docker run -d \
  -p 8080:8080 \
  -v opsweave-data:/data \
  --name opsweave \
  ghcr.io/slemens/opsweave:latest
```

→ Öffne http://localhost:8080

**Standard-Login:** `admin@opsweave.local` / `changeme`

> **Tipp:** Die SQLite-Datenbank liegt in `/data/opsweave.db` im Volume-Mount.
> Für Backups: `docker cp opsweave:/data/opsweave.db ./backup.db`

## Variante B: Multi-Container (Production)

Für Production-Deployments mit PostgreSQL und Redis.

```bash
# Repository klonen
git clone https://github.com/slemens/opsweave.git
cd opsweave

# Konfiguration anpassen
cp .env.example .env
# .env editieren: DB-Passwörter, JWT_SECRET, SMTP etc.

# Container starten
docker compose up -d
```

→ Öffne http://localhost:8080 (oder konfigurierter Port)

### Umgebungsvariablen

| Variable | Standard | Beschreibung |
|----------|---------|--------------|
| `NODE_ENV` | `production` | Laufzeitumgebung |
| `PORT` | `3000` | Backend-Port |
| `DATABASE_URL` | — | PostgreSQL Connection String |
| `REDIS_URL` | `redis://redis:6379` | Redis Connection |
| `JWT_SECRET` | — | **Muss gesetzt werden** |
| `SESSION_SECRET` | — | Session-Verschlüsselung |

## Variante C: Entwicklung

```bash
git clone https://github.com/slemens/opsweave.git
cd opsweave

# Dependencies installieren
npm install

# Umgebung konfigurieren
cp .env.example .env

# Datenbank initialisieren + Seed-Daten laden
npm run db:seed

# Frontend + Backend starten (mit Hot Reload)
npm run dev:frontend  # Port 5173
npm run dev:backend   # Port 3000
```

## Systemvoraussetzungen

| | Single-Container | Multi-Container |
|---|---|---|
| **RAM** | ≥ 512 MB | ≥ 2 GB |
| **CPU** | 1 Core | ≥ 2 Cores |
| **Disk** | ≥ 1 GB | ≥ 10 GB |
| **Docker** | ≥ 24.0 | ≥ 24.0 |
| **Node.js** | — | ≥ 20.0 (Dev only) |

## Nach der Installation

1. **Ersten Admin-Account** ändern — Passwort unter Einstellungen → Profil
2. **Tenant konfigurieren** — Name, Sprache, Branding
3. **Erste Assets** anlegen (oder importieren via API)
4. **Demo-Daten entfernen** — `npm run db:seed:clean` (Development only)

## Updates

```bash
# Single-Container
docker pull ghcr.io/slemens/opsweave:latest
docker stop opsweave && docker rm opsweave
# Neu starten mit gleichen Parametern

# Multi-Container
git pull
docker compose pull
docker compose up -d
```

Migrationen werden automatisch beim Start ausgeführt.
