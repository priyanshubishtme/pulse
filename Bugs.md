# LinkPulse Bugs and Release Notes

> **RELEASE NOTES | FIXES, GAPS AND VERIFICATION**

## Contents

- [Fixed in this review](#fixed-in-this-review)
- [Known gaps and follow-up checks](#known-gaps-and-follow-up-checks)
- [Current verification snapshot](#current-verification-snapshot)

Last reviewed: 2026-10-19

This file records defects found while completing the super-admin and public redirect flows. It separates fixed behavior from gaps that still need an environment or product decision. It is not a substitute for the immutable audit trail described in `redirection.md`.

## Fixed in this review

### 1. Public redirect interstitial was incomplete

- **Routes:** `GET /:alias`, `GET /qr/:alias`, `GET /api/public/resolve/:alias`, `GET /continue/:alias`
- **Fix:** The React interstitial now resolves the destination, shows the full URL and source context, provides an immediate external continue action, and automatically navigates after three seconds.
- **Coverage:** Normal and QR redirect tests verify the 302 target and click source.

### 2. Password unlock could bypass later link checks

- **Routes:** `POST /api/public/unlock/:alias`, `GET /continue/:alias`
- **Fix:** Unlock re-evaluates expiry, disabled state, click limits, and destination blocklist before recording the visit. The frontend no longer stores an unlocked destination in `sessionStorage`; a later direct interstitial visit resolves the alias again.
- **Security note:** The unlock result is passed only through the current client-side navigation state. The server remains the authority for subsequent visits.

### 3. Destination resolution could be called without proof of an admitted visit

- **Route:** `GET /api/public/resolve/:alias`
- **Fix:** Initial redirects and successful password unlocks now issue a two-minute HMAC-signed continue token. The resolve endpoint rejects missing, expired, or tampered tokens, while still rechecking current disabled, expiry, and blocklist state.

### 4. Destination blocklist matching was inconsistent

- **Routes:** `POST /api/admin/blocklist`, `DELETE /api/admin/blocklist/:id`, `POST /api/links/validate`, `GET /:alias`, `GET /qr/:alias`, `POST /api/public/unlock/:alias`, `GET /api/public/resolve/:alias`
- **Fix:** Hostnames are normalized to lowercase, with schemes, ports, paths, wildcard prefixes, and trailing DNS dots removed. Matching respects exact domains and DNS subdomain boundaries.
- **Coverage:** Unit and redirect tests cover exact and subdomain matches.

### 5. Admin controls did not cover the platform

- **Routes:** `/api/admin/*` and `/admin`
- **Fix:** `ADMIN` is now explicitly documented and guarded as the platform-wide super-admin role. The UI exposes overview metrics, link search/filter/sort/status controls, user search/status controls, activity, and destination blocklist management.
- **Safety:** A super-admin cannot disable their own account or the last active super-admin. Disabled users are rejected by fresh session checks.

### 6. Session bootstrap omitted the current user's display fields

- **Route:** `GET /api/auth/me`
- **Fix:** The auth middleware now returns `id`, `email`, `name`, `role`, `isActive`, and `timezone`, so a refreshed admin session renders the correct identity and role label.

## Known gaps and follow-up checks

### A. Database migration must be applied before runtime use

- **Migration:** `server/prisma/migrations/20261019000000_add_user_active_status/migration.sql`
- **Impact:** A database that has not applied this migration will fail admin/user status queries with a missing `User.isActive` column.
- **Action:** Run `npx prisma migrate deploy --schema server/prisma/schema.prisma` in deployment, or apply the migration in local development before enabling the admin UI.

### B. Docker/WSL and Redis production path are not verified here

- The no-container checks pass, but Docker Desktop/WSL was intentionally not started. Redis Stream persistence, consumer-group recovery, and multi-instance cache invalidation still require a post-WSL verification.
- Follow `docs/DEPLOYMENT.md` and `redirection.md` for the exact `docker compose` and `redis-cli PING` checks.

### C. Admin activity is not an immutable audit log

- `GET /api/admin/activity` currently derives recent clicks and blocked attempts from analytics tables.
- It does not prove who performed an administrative mutation. A future append-only `AdminAuditEvent`/Pulse Safety Record should capture actor, action, target, outcome, timestamp, and correlation ID without secrets or raw IPs.

### D. Analytics day buckets remain UTC

- User timezones are stored and passed through parts of the analytics API, but daily series still require a timezone-aware database query before being described as localized reports.

### E. Frontend bundle warning resolved

- The initial web bundle previously exceeded Vite's 500 kB warning threshold because all workspace pages were imported eagerly.
- `web/src/routes.tsx` now lazy-loads Dashboard, Links, Create Link, Campaigns, Campaign Detail, Analytics, QR Codes, Import, and Super Admin behind a shared `Suspense` fallback.
- The production build now emits route chunks and no longer reports the large-chunk advisory.

### F. Default local server tests do not require PostgreSQL

- `npm test --workspace server` runs the unit and mocked route suite and skips the database E2E file by default.
- After a migrated PostgreSQL instance is available, run `RUN_DB_TESTS=1 npm test --workspace server` to verify persistence, click accounting, and the full API flow.

## Current verification snapshot

Passed on 2026-10-19:

- `npm test` — 27 passed, 3 database-dependent tests skipped.
- `npm run build --workspace server` — passed.
- `npm run build --workspace web` — passed with route-level chunks and no Vite large-chunk advisory after lazy loading.
- `npm run lint --workspace web` — completed with two pre-existing `AuthContext` warnings.
- `npx prisma validate --schema server/prisma/schema.prisma` — passed.
- `git diff --check` — passed.
- `RUN_DB_TESTS=1 npm test --workspace server` — currently blocked by the existing database missing `User.isActive`; apply the migration above and rerun.
