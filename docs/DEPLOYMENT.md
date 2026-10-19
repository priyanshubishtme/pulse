# Deployment Guide

> **OPERATIONS GUIDE | DEPLOYMENT AND ENVIRONMENT**

## Contents

- [Environment Variables Needed](#environment-variables-needed)
- [Single-service deployment (Render)](#single-service-deployment-render)
- [Optional split frontend deployment](#optional-split-frontend-deployment)
- [Pre-release verification (without Docker/WSL)](#pre-release-verification-without-dockerwsl)
- [Local Redis](#local-redis)

The app is built as a modular monolith but is designed to be deployed cleanly. The database connection and secrets are all provided via environment variables.

## Environment Variables Needed
- `DATABASE_URL`: A PostgreSQL connection string
- `REDIS_URL`: Optional Redis connection URL (`redis://` locally; managed Redis providers commonly supply a TLS `rediss://` URL). When omitted, the service uses its in-process LRU cache and PostgreSQL-backed best-effort event queue.
- `JWT_SECRET`: Random long string for session security
- `SERVER_SALT`: Random long string used with IP and user-agent data to create daily visitor hashes
- `APP_URL`: Frontend origin used for status and password-unlock redirects (e.g. `https://app.linkpulse.dev`)
- `VITE_PUBLIC_BASE_URL`: Frontend build-time value for copied short links and QR payloads; set it to the public short-link server/domain that serves `/:alias` and `/qr/:alias` (e.g. `https://go.linkpulse.dev`)
- `PORT`: (Server only) usually 3000

## Single-service deployment (Render)

The lightweight deployment is one Render Web Service running the Express server. It serves the compiled React app, the API, and public short links from the same process. PostgreSQL is the only required external service; Redis is an optional scale-up rather than a second required server.

1. Provision one managed PostgreSQL database and copy its connection string into `DATABASE_URL`.
2. Create one Render Web Service from this repository. The included `server/Dockerfile` builds both workspaces and runs Prisma migrations before starting Express.
3. Set `JWT_SECRET`, `SERVER_SALT`, and `APP_URL` to the service's HTTPS origin. For the simplest one-domain deployment, set `VITE_PUBLIC_BASE_URL` to the same origin at build time or leave it unset so the browser uses the current origin.
4. Keep `REDIS_URL` empty for the lightest deployment. Add a managed Redis URL later only when multiple instances, shared cache, or durable stream buffering are required.
5. Confirm that at least one active `ADMIN` account exists. `ADMIN` is the current platform-wide **super-admin** role; it can review users, links, activity, and the destination blocklist. The API prevents a super-admin from disabling their own account or the last active super-admin.

The current release includes `20261019000000_add_user_active_status`; do not skip migrations because the super-admin user controls depend on `User.isActive`.

When Redis is enabled, the analytics stream uses at-least-once processing. Events are acknowledged and removed from the stream only after a Prisma transaction persists the event and updates its click counter. A stable event ID makes a retry idempotent. Configure Redis backups/persistence and monitor pending entries and stream length. Without Redis, the local fallback is intentionally simpler but events still in memory can be lost if the single process stops before flushing.

## Optional split frontend deployment

The project can still be split later if CDN delivery is needed, but it is not required for the lightweight path. If using Vercel or Netlify, use `web` as the base directory, `npm run build` as the build command, `dist` as the publish directory, and proxy `/api` to the Render service. Set `VITE_PUBLIC_BASE_URL` to the public short-link origin and `APP_URL` to the frontend origin.
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://your-server-url.com/api/$1" }
  ]
}
```

The unified service routes `/:alias` and `/qr/:alias` to Express before the SPA fallback. A valid request returns a 302 to the frontend interstitial, which resolves the destination, offers an immediate continue action, and automatically navigates after three seconds.

## Pre-release verification (without Docker/WSL)

From the repository root, run the checks that do not require a running database or container:

```bash
npm run build --workspace server
npm test --workspace server
npm run build --workspace web
npm run lint --workspace web
npx prisma validate --schema server/prisma/schema.prisma
```

The default server suite skips the database E2E file unless `RUN_DB_TESTS=1` is set. After applying migrations to a reachable PostgreSQL instance, run `RUN_DB_TESTS=1 npm test --workspace server` and exercise a real alias through `/`, `/qr/`, `/unlock/`, and `/continue/`. Docker/WSL and the Redis stream round trip are separate release checks and are not covered by the no-container validation above.

## Local Redis

The backend runs without Redis using an in-memory cache and a best-effort in-process analytics fallback. To exercise the optional Redis path, run `docker compose up -d redis` and set `REDIS_URL=redis://localhost:6379` in `.env`. Redis can be disabled locally and in the lightweight single-service deployment by leaving `REDIS_URL` unset.

On Windows, Docker Desktop's Linux engine requires WSL 2 and the Virtual Machine Platform feature. The first-time WSL install requires an administrator PowerShell and a restart: `wsl --install --no-distribution`. In Docker Desktop, turn on **Settings > General > Start Docker Desktop when you sign in**. The Redis service persists data in the `redisdata` named volume and uses `restart: unless-stopped`, so it will start when the engine starts on later sign-ins after the initial Compose `up`. To check readiness, run `docker compose ps redis` and `docker compose exec redis redis-cli ping`; expect `PONG`. Start the API separately with `npm run dev` and check for `Redis analytics stream ready` in its logs.

For teammates, commit the Compose file and `.env.example`, never `.env`. Each developer needs their own `.env` and local or shared PostgreSQL. Docker Desktop/WSL 2 is only needed when using the Compose database or optional Redis; a local Redis container is private to that machine, so use a shared development Redis service only if contributors must see the same queued events and cache.
