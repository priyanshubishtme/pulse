# LinkPulse Redirect and Click Recording

This document describes the redirect path implemented in the current code. The source of truth is `server/src/modules/redirect/redirect.routes.ts`, `ruleEngine.ts`, `clickQueue.ts`, `server/src/modules/analytics/queries.ts`, and `server/prisma/schema.prisma`.

## Local addresses and the redirect-to-app issue

- Vite serves the LinkPulse UI at `http://localhost:5174`.
- Express serves API and short-link routes at `http://localhost:3000`.
- Vite proxies `/api/*` to Express, so browser API calls remain on the UI origin and carry the auth cookie.
- Express uses `APP_URL` to send unavailable, expired, disabled, limited, and password-protected links back to the frontend.

There were two separate origin mismatches. First, Vite had been allowed to move from `5173` to `5174` while Express still sent status/unlock visitors to `APP_URL` on `5173`. Second, the UI copied short links using its own `window.location.origin`, which points to the Vite app; short-link routes are served by Express. LinkPulse now fixes the UI at `5174` (`strictPort`), uses `APP_URL=http://localhost:5174` for status/unlock pages, and builds copied links and QR payloads from `VITE_PUBLIC_BASE_URL=http://localhost:3000`. If you change the ports or deploy behind a custom short domain, update `APP_URL` and `VITE_PUBLIC_BASE_URL` for their respective origins and restart/rebuild the relevant workspace.

## Redirect decision flow

1. A browser or QR scanner requests `GET /:alias` or `GET /qr/:alias` from Express on port `3000`.
2. `/qr/:alias` is registered before the generic `/:alias` handler and tags the event source as `QR`; normal links use `LINK`.
3. Express lowercases the alias and checks the process-local LRU cache (maximum 5,000 records, 30-second TTL). A cache miss reads the `Link` row from PostgreSQL through Prisma.
4. The redirect handler checks the destination host against `BlockedDomain` entries and calls the shared `effectiveStatus` rule engine.
5. A valid link gets HTTP 302 to `destinationUrl`; failures get HTTP 302 to a LinkPulse status or unlock route, with the target origin taken from `APP_URL`.
6. Valid visits are enriched and queued for persistence; blocked visits are queued as `BlockedAttempt` rows where the current code records a reason.

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

For a password-protected link, the unlock page posts the password to `/api/public/unlock/:alias`. Express verifies the bcrypt hash, checks the rules again, records the successful visit, and returns the destination URL. The browser then navigates to that URL. Wrong passwords queue a `BlockedAttempt` with `WRONG_PASSWORD`.

## Click count and event persistence

For human visits to limited links, the server increments `Link.clickCount` with an atomic SQL update that only succeeds while the old count is below the limit. Concurrent visits therefore cannot all pass a stale cached count. Bots do not increment this limit counter. For unlimited links, human click counts are incremented after the queued click events flush successfully.

Click enrichment records:

- `ClickEvent.source`: `LINK` or `QR`.
- `isBot`: user-agent classification via `isbot`.
- `visitorHash`: SHA-256 of IP, user agent, current UTC date, and `SERVER_SALT`; the raw IP is not written to `ClickEvent`.
- `referrer` and derived `channel` (`DIRECT`, `SOCIAL`, `SEARCH`, `EMAIL`, or `OTHER_SITE`).
- Device, browser, and operating system from `ua-parser-js`.
- Country, region, city, and rounded latitude/longitude when `geoip-lite` can resolve the IP. Localhost traffic normally has no geo result.

`clickQueue.ts` batches click and blocked-attempt writes: it flushes after one second or when either buffer reaches 50 entries. Analytics read the persisted `ClickEvent` table, so a newly redirected click may take about a second to appear. The standard human metrics exclude `isBot = true`; analytics can request bot inclusion through the `includeBots=true` filter. The visitor hash rotates daily, so unique visitors are approximate daily identities, not a durable person-level identity.

## Known implementation limits

- The LRU cache and event buffers are in process memory. They are not shared between server instances, and queued events can be lost if the process stops or a database write fails before persistence.
- The cache may serve a link record for up to 30 seconds. Link edits and admin disable invalidate the local cache, but invalidation is not distributed to other app processes.
- GeoIP depends on the local `geoip-lite` database and cannot resolve private/local addresses.
- Analytics currently groups series by UTC date; although users have a saved timezone and the API passes it to the time-series function, the current implementation does not apply that timezone. This should be corrected before describing daily reports as timezone-aware.
- A blocklisted destination currently uses the general `DISABLED` status page/reason because `BlockReason` has no separate blocklist value.
- Redirect errors are logged on the server and returned as a generic 500 response. A structured, durable safety/audit log is not currently implemented.

## Future Pulse Safety Record (not implemented)

If Pulse Safety Record becomes a feature, it should be designed as a separate append-only audit stream rather than inferred from click analytics. A future record could capture actor (user/admin/system), action, affected link/domain, timestamp, outcome/reason, and a request/correlation ID. It should not store raw passwords, JWTs, or visitor IP addresses. Define access controls, retention, and export behavior before adding a Prisma model or API. There is no current Pulse Safety Record table, endpoint, or UI.

## Quick local checks

With PostgreSQL and both workspaces running, use an existing link alias on the backend origin:

```text
http://localhost:3000/<alias>
http://localhost:3000/qr/<alias>
```

Expected outcomes: a live link returns a 302 to its destination; a disabled/expired/limited link returns a 302 to the matching LinkPulse status route under `http://localhost:5174`; a protected link goes to `/unlock/<alias>`. Check analytics after the queue flush delay. `GET /health` on port 3000 should return `{"status":"ok"}`.
