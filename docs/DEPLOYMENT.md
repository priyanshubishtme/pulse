# Deployment Guide

The app is built as a modular monolith but is designed to be deployed cleanly. The database connection and secrets are all provided via environment variables.

## Environment Variables Needed
- `DATABASE_URL`: A PostgreSQL connection string
- `REDIS_URL`: Redis connection URL (`redis://` locally; managed Redis providers commonly supply a TLS `rediss://` URL). Required in production for shared redirect caching and durable analytics event processing.
- `JWT_SECRET`: Random long string for session security
- `SERVER_SALT`: Random long string used with IP and user-agent data to create daily visitor hashes
- `APP_URL`: Frontend origin used for status and password-unlock redirects (e.g. `https://app.linkpulse.dev`)
- `VITE_PUBLIC_BASE_URL`: Frontend build-time value for copied short links and QR payloads; set it to the public short-link server/domain that serves `/:alias` and `/qr/:alias` (e.g. `https://go.linkpulse.dev`)
- `PORT`: (Server only) usually 3000

## Deploying the Server (e.g., Render or Railway)
1. Provision managed PostgreSQL (such as Neon) and managed Redis, then provide their connection URLs and the other environment variables. Keep Redis persistence enabled for the analytics stream and restrict network access to the API service.
2. In the platform, specify the `server/Dockerfile` path to build the container.
3. The Dockerfile will automatically build the code and run `npx prisma migrate deploy` upon startup.
4. Start one API instance first and confirm its logs show `Redis analytics stream ready`. Then scale the API; all instances share the link cache and Redis Stream consumer group.

The analytics stream uses at-least-once processing. Events are acknowledged and removed from the stream only after a Prisma transaction persists the event and updates its click counter. A stable event ID makes a retry idempotent. Configure Redis backups/persistence and monitor pending entries and stream length; Redis is part of the event durability path, not only a disposable cache.

## Deploying the Frontend (e.g., Vercel or Netlify)
1. Base Directory: `web`
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Set `VITE_PUBLIC_BASE_URL` during the frontend build to your public short-link origin. Configure rewrites/proxying for `/api` traffic and set the server's `APP_URL` to the deployed frontend origin. For example, in Vercel `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://your-server-url.com/api/$1" }
  ]
}
```

## Local Redis

The backend runs without Redis in local development using an in-memory cache and a best-effort in-process analytics fallback. To exercise the production Redis path without starting a second PostgreSQL on port 5432, run `docker compose up -d redis`. Preserve an existing `.env` and add `REDIS_URL=redis://localhost:6379`; only copy `.env.example` when creating a new `.env`. Redis can be disabled locally by leaving `REDIS_URL` unset. Production startup fails fast when Redis is not configured.

On Windows, Docker Desktop's Linux engine requires WSL 2 and the Virtual Machine Platform feature. The first-time WSL install requires an administrator PowerShell and a restart: `wsl --install --no-distribution`. In Docker Desktop, turn on **Settings > General > Start Docker Desktop when you sign in**. The Redis service persists data in the `redisdata` named volume and uses `restart: unless-stopped`, so it will start when the engine starts on later sign-ins after the initial Compose `up`. To check readiness, run `docker compose ps redis` and `docker compose exec redis redis-cli ping`; expect `PONG`. Start the API separately with `npm run dev` and check for `Redis analytics stream ready` in its logs.

For teammates, commit the Compose file and `.env.example`, never `.env`. Each developer needs their own `.env`, local or shared PostgreSQL, Docker Desktop/WSL 2, and a one-time `docker compose up -d redis`. A local Redis container is private to that machine; use a shared development Redis service only if contributors must see the same queued events and cache.
