# LinkPulse Redirect and Click Recording

> **OPERATIONS GUIDE | PUBLIC REDIRECTS AND ANALYTICS**

## Contents

- [Local addresses and the redirect-to-app issue](#local-addresses-and-the-redirect-to-app-issue)
- [Local Redis and Windows startup](#local-redis-and-windows-startup)
- [Redirect decision flow](#redirect-decision-flow)
- [Click count and event persistence](#click-count-and-event-persistence)
- [Known implementation limits](#known-implementation-limits)
- [Neon and Redis deployment notes](#neon-and-redis-deployment-notes)
- [Future Pulse Safety Record (not implemented)](#future-pulse-safety-record-not-implemented)
- [Quick local checks](#quick-local-checks)

This document describes the redirect path implemented in the current code. The source of truth is `server/src/modules/redirect/redirect.routes.ts`, `ruleEngine.ts`, `clickQueue.ts`, `server/src/modules/analytics/queries.ts`, and `server/prisma/schema.prisma`.

## Local addresses and the redirect-to-app issue

- Vite serves the LinkPulse UI at `http://localhost:5174`.
- Express serves API and short-link routes at `http://localhost:3000`.
- Vite proxies `/api/*` to Express, so browser API calls remain on the UI origin and carry the auth cookie.
- Express uses `APP_URL` to send unavailable, expired, disabled, limited, and password-protected links back to the frontend.

There were two separate origin mismatches. First, Vite had been allowed to move from `5173` to `5174` while Express still sent status/unlock visitors to `APP_URL` on `5173`. Second, the UI copied short links using its own `window.location.origin`, which points to the Vite app; short-link routes are served by Express. LinkPulse now fixes the UI at `5174` (`strictPort`), uses `APP_URL=http://localhost:5174` for status/unlock pages, and builds copied links and QR payloads from `VITE_PUBLIC_BASE_URL=http://localhost:3000`. If you change the ports or deploy behind a custom short domain, update `APP_URL` and `VITE_PUBLIC_BASE_URL` for their respective origins and restart/rebuild the relevant workspace.

## Local Redis and Windows startup

The included `docker-compose.yml` can start PostgreSQL and Redis as separate optional services. The lightest local path starts only PostgreSQL; leave `REDIS_URL` empty and the app uses its process-local cache and queue. To exercise the optional shared path, start Redis with `docker compose up -d redis` and set `REDIS_URL=redis://localhost:6379` in the ignored root `.env` file.

On Windows, Docker Desktop needs WSL 2 and the Virtual Machine Platform feature to run Linux containers. The first-time feature installation needs administrator PowerShell and a restart (`wsl --install --no-distribution`). Enable Docker Desktop's **Start Docker Desktop when you sign in** preference. The optional Redis Compose service has a persistent `redisdata` volume and `restart: unless-stopped`: after the initial `docker compose up -d redis`, the container starts when Docker's engine starts at a later sign-in, unless it was explicitly stopped. Start the application separately from the repository root with `npm run dev`.

When onboarding a teammate, each person needs their own `.env` values and a reachable PostgreSQL database. Docker Desktop/WSL 2 is optional and is only needed for the Compose database or Redis path. `.env` is ignored by Git and must not be committed. For a shared development team, replace each local Redis container with a reachable development Redis service; isolated local containers do not share analytics events/cache across contributors' machines.

## Redirect decision flow

1. A browser or QR scanner requests `GET /:alias` or `GET /qr/:alias` from Express on port `3000`.
2. `/qr/:alias` is registered before the generic `/:alias` handler and tags the event source as `QR`; normal links use `LINK`.
3. Express lowercases the alias and checks Redis for a shared `Link` cache entry (30-second TTL). A cache miss reads PostgreSQL through Prisma. Without `REDIS_URL` locally, it uses the process-local LRU cache instead. If configured Redis is temporarily unavailable after startup, the cache fails open to PostgreSQL.
4. The redirect handler checks the destination host against `BlockedDomain` entries and calls the shared `effectiveStatus` rule engine.
5. A valid visit is recorded once and gets HTTP 302 to the React interstitial at `APP_URL/continue/:alias`. The visitor can continue immediately or is sent to the destination after three seconds.
6. The interstitial makes a read-only request to `/api/public/resolve/:alias?token=...` to show the destination. The short-lived HMAC token is issued only after the initial visit is admitted (or a password is accepted); it prevents an unauthenticated caller from bypassing a click limit by resolving the destination directly. This endpoint does not record a second click and allows the approved final click to resolve after its limit counter has been consumed.
7. Failures get HTTP 302 to a LinkPulse status or unlock route, with the target origin taken from `APP_URL`. Successful password unlock records the visit once, returns a continue token, and opens the same interstitial.
8. Valid visits are enriched and queued for persistence; blocked visits are queued as `BlockedAttempt` rows where the current code records a reason.

The rule order is:

| Check | Decision |
|---|---|
| Alias does not resolve to a link | `NOT_FOUND` → `/status/not-found` |
| Link status is `DISABLED` | `DISABLED` → `/status/disabled` |
| Stored status is `EXPIRED` or expiry is at/before now | `EXPIRED` → `/status/expired` |
| Human click count is at the configured limit | `LIMIT_REACHED` → `/status/limit-reached` |
| Password exists and has not been verified | `PASSWORD_REQUIRED` → `/unlock/:alias` |
| Destination domain is blocklisted | `DISABLED` → `/status/disabled` |
| All checks pass | `REDIRECT` → destination URL |

For a password-protected link, the unlock page posts the password to `/api/public/unlock/:alias`. Express verifies the bcrypt hash, checks the rules again, records the successful visit, and returns the destination URL to the app. The app passes that one-time result into the same interstitial; a later direct visit to `/continue/:alias` must resolve the alias again instead of trusting browser storage. Wrong passwords queue a `BlockedAttempt` with `WRONG_PASSWORD`.

## Click count and event persistence

For human visits to limited links, the server increments `Link.clickCount` with an atomic SQL update that only succeeds while the old count is below the limit. Concurrent visits therefore cannot all pass a stale cached count. Bots do not increment this limit counter. For unlimited links, human click counts are incremented after the queued click events flush successfully.

Click enrichment records:

- `ClickEvent.source`: `LINK` or `QR`.
- `isBot`: user-agent classification via `isbot`.
- `visitorHash`: SHA-256 of IP, user agent, current UTC date, and `SERVER_SALT`; the raw IP is not written to `ClickEvent`.
- `referrer` and derived `channel` (`DIRECT`, `SOCIAL`, `SEARCH`, `EMAIL`, or `OTHER_SITE`).
- Device, browser, and operating system from `ua-parser-js`.
- Country, region, city, and rounded latitude/longitude when `geoip-lite` can resolve the IP. Localhost traffic normally has no geo result.

With `REDIS_URL` configured, `clickQueue.ts` appends click and blocked-attempt events to the `linkpulse:analytics:events` Redis Stream. A consumer group reads new entries, persists each event in a Prisma transaction, and acknowledges/deletes it only after success. Idle pending entries are reclaimed after 30 seconds. The event UUID is also the Prisma row ID, so a retry after a worker crash cannot double-increment an unlimited link's click counter. Analytics read the persisted `ClickEvent` table; a new event appears after the worker commits it. Without Redis in local development, a best-effort in-memory queue flushes directly to PostgreSQL. The standard human metrics exclude `isBot = true`; analytics can request bot inclusion through the `includeBots=true` filter. The visitor hash rotates daily, so unique visitors are approximate daily identities, not a durable person-level identity.

## Known implementation limits

- If Redis is not configured locally, the LRU cache and event queue are in process memory and queued events can be lost if the process stops before persistence.
- With Redis configured, link records use a shared 30-second Redis cache; edits and admin disable delete the shared key. Redis outages bypass the cache and read PostgreSQL; new events temporarily use the local fallback queue until Redis reconnects.
- Redis Stream events are retained while pending and deleted after database persistence; configure Redis persistence/backups because the stream is a durability boundary for production analytics.
- GeoIP depends on the local `geoip-lite` database and cannot resolve private/local addresses.
- Analytics currently groups series by UTC date; although users have a saved timezone and the API passes it to the time-series function, the current implementation does not apply that timezone. This should be corrected before describing daily reports as timezone-aware.
- A blocklisted destination currently uses the general `DISABLED` status page/reason because `BlockReason` has no separate blocklist value.
- Redirect errors are logged on the server and returned as a generic 500 response. A structured, durable safety/audit log is not currently implemented.

## Neon and Redis deployment notes

The interstitial does not depend on a database-specific feature: destination lookup and click records continue through Prisma/PostgreSQL, so Neon can replace local PostgreSQL through `DATABASE_URL` and Prisma migrations. In the lightweight one-instance deployment, Redis can remain disabled. If production is scaled to multiple API instances, add a shared persistent Redis plan and set `REDIS_URL` so cache entries and analytics stream events are shared.

## Future Pulse Safety Record (not implemented)

If Pulse Safety Record becomes a feature, it should be designed as a separate append-only audit stream rather than inferred from click analytics. A future record could capture actor (user/admin/system), action, affected link/domain, timestamp, outcome/reason, and a request/correlation ID. It should not store raw passwords, JWTs, or visitor IP addresses. Define access controls, retention, and export behavior before adding a Prisma model or API. There is no current Pulse Safety Record table, endpoint, or UI.

## Quick local checks

Start Redis (if configured) and PostgreSQL, then start both workspaces from the repository root with `npm run dev`. Use an existing link alias on the backend origin:

```text
http://localhost:3000/<alias>
http://localhost:3000/qr/<alias>
```

Expected outcomes: a live link returns a 302 to `http://localhost:5174/continue/<alias>`; the page shows a 3-second countdown and an immediate continue action. A disabled/expired/limited link returns a 302 to the matching LinkPulse status route under `http://localhost:5174`; a protected link goes to `/unlock/<alias>` and then to the interstitial after a correct password. The visit is recorded on the initial short-link request (or after successful password entry), not again when the interstitial resolves its destination. Check analytics after the queue flush delay. `GET /health` on port 3000 should return `{"status":"ok"}`.

Runtime check status on 2026-10-18: server and web builds and Prisma schema validation passed. The API health route returned HTTP 200 in local development without Redis. Redis container startup has not yet been verified on Windows because enabling WSL/Virtual Machine Platform is pending the user's restart; repeat the Redis `PONG` and API stream startup checks after reboot.
