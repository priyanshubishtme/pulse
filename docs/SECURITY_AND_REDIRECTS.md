# Security, redirect safeguards, and operations

This guide records the safeguards currently implemented in LinkPulse and the
operational details needed to deploy and maintain them.

## Super-admin account

The provisioned production super-admin account uses this email:

| Field | Value |
|---|---|
| Email | `admin@hackbuddy.com` |
| Initial password | `Admin@123` |
| Role | `ADMIN` (super-admin) |

This initial password was supplied for the provisioned super-admin account and
is documented in plaintext at the owner's request. Rotate it before publishing
this change or sharing the account. Keep the replacement in the deployment
secret manager. The application stores bcrypt password hashes, not the
submitted plaintext. Do not reuse a production password for another service.

If the account already exists as a normal user, promote it from the Render
PostgreSQL console with:

```sql
UPDATE "User"
SET "role" = 'ADMIN', "isActive" = TRUE
WHERE LOWER("email") = LOWER('admin@hackbuddy.com')
RETURNING "id", "email", "role", "isActive";
```

Then log out and log back in at the live application:

```text
https://link-pulse-5chi.onrender.com/login
```

The administrator area is:

```text
https://link-pulse-5chi.onrender.com/admin
```

The development seed is separate: `server/prisma/seed.ts` creates
`admin@linkpulse.dev` and `user@linkpulse.dev` with the development password
`password123`. Those seed credentials are for local sample data only and do not
provision the owner-supplied account above. Seed scripts should not be run
against production data.

## Redirect safety valve

Every short-link and QR redirect passes through `effectiveStatus` in
`server/src/modules/redirect/ruleEngine.ts`. The checks run in this order:

1. The alias must exist.
2. The link must not be disabled.
3. The link must not be expired by status or timestamp.
4. Its click limit must not already be reached.
5. A password-protected link must have a successful unlock.
6. The destination domain must not match an administrator blocklist entry.

Only a `REDIRECT` decision continues. Rejections lead to a status page or to the
password unlock screen. Malformed destination URLs are treated as blocked.
Administrators can maintain the platform-wide domain blocklist and suspend user
accounts. The final active super-admin cannot disable their own account or the
last active super-admin account.

### Password-protected links

- Link passwords are hashed with bcrypt (10 rounds) when stored.
- Unlock attempts are limited to five per minute per client by
  `express-rate-limit`.
- An incorrect password returns an error and queues a `WRONG_PASSWORD` blocked
  attempt for analytics visibility.
- A correct password re-runs the redirect rules before approval.
- Approval is represented by an HMAC-SHA256 signed continue token tied to the
  alias and unlock state. It expires after 120 seconds and is checked with a
  timing-safe signature comparison.
- The interstitial resolves the destination only after validating that token.
  Resolving the interstitial does not record a second click.

### Click limits and event recording

Limited links increment their counter atomically only while the count remains
below the configured limit. If simultaneous requests race for the last click,
only the request that updates the counter can proceed. Bot visits do not consume
the human click limit. Redirect decisions and blocked attempts are recorded for
analytics. Redis provides a shared 30-second cache and durable stream processing
when configured. Without Redis, local development uses an in-process LRU cache
and a best-effort event queue; in-memory events can be lost if the process stops
before they are written.

A separate immutable security audit ledger is not implemented in the current
release. The current `ClickEvent` and `BlockedAttempt` records are operational
analytics data, not a tamper-proof audit trail.

## Editing an existing link

Link editing is already available in this repository. The **Manage** action on
the Links page opens a form and saves supported changes through
`PATCH /api/links/:id`; the API verifies ownership, re-hashes a changed password, and
invalidates the redirect cache. This feature is part of the current product and
does not need to be deferred.

## Routing and recoverable page errors

The React app includes a catch-all 404 page for unknown application paths and an
app-level React error boundary for rendering failures. The boundary logs the
error for diagnosis and offers reload/dashboard recovery actions. These screens
keep a bad route or render exception from leaving users with a blank app; they
do not replace server monitoring or API error handling.

## Contributors and integration

Contributors developed their work in their own repositories and integrated it
into the final LinkPulse repository. The final repository is the source of truth
for the combined application. The integration history is preserved in Git; the
accepted unrelated-history merge is recorded as `1842263` (`merge: combine
completed LinkPulse core into main`). Contributors and their individual file
ownership should be credited from the repository history rather than inferred
from feature areas.

## Deployment reminders

- Use unique production values for `JWT_SECRET` and `SERVER_SALT`; never use the
  development fallbacks.
- Confirm that a trusted, active `ADMIN` account exists after migrations.
- Rotate the production super-admin password after the first login and keep it
  out of Git, README files, screenshots, and issue trackers.
- Never copy `.env` into source control; provide runtime secrets through the
  deployment environment.
- Keep the production database and any configured Redis service backed up.
