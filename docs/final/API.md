# API Reference

> **TECHNICAL REFERENCE | API CONTRACTS**

## Contents

- [Access model](#access-model)
- [Authentication](#authentication)
- [Links](#links)
- [Campaigns and tags](#campaigns-and-tags)
- [Analytics and import](#analytics-and-import)
- [Super-admin](#super-admin)
- [Public routes](#public-routes)
- [Health and static app](#health-and-static-app)

Application APIs use the `/api` prefix. Short-link and QR redirects are public Express routes at the service root. The server route modules and request schemas are the source of truth for exact payload fields and validation.

## Access model

| Access | Meaning |
|---|---|
| Public | No authenticated session required. |
| Signed in | Authenticated account; user-owned operations are scoped to that account. |
| `ADMIN` | Active platform super-admin role, enforced by admin route middleware. |

## Authentication

| Method | Route | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | Create account. |
| `POST` | `/api/auth/login` | Public | Start session using HTTP-only cookie. |
| `POST` | `/api/auth/logout` | Public/session | Clear session cookie. |
| `GET` | `/api/auth/me` | Public/session | Read current session identity and active status. |

## Links

All routes below require a signed-in account and are scoped to the current owner where applicable.

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/links/validate` | Validate proposed link input and return issues. |
| `GET` | `/api/links/check-alias?alias=` | Check alias availability. |
| `POST` | `/api/links` | Create a link. |
| `GET` | `/api/links` | List the current user's links. |
| `PATCH` | `/api/links/:id` | Update an owned link. |
| `DELETE` | `/api/links/:id` | Delete an owned link. |
| `POST` | `/api/links/bulk-move` | Move selected links between campaigns. |
| `POST` | `/api/links/bulk-tag` | Add/remove tags on selected links. |

## Campaigns and tags

| Method | Route | Purpose |
|---|---|---|
| `POST`, `GET` | `/api/campaigns` | Create/list campaigns. |
| `PATCH`, `DELETE` | `/api/campaigns/:id` | Update/delete campaign. |
| `POST` | `/api/campaigns/:id/archive` | Archive campaign. |
| `POST` | `/api/campaigns/:id/unarchive` | Restore campaign. |
| `POST`, `GET` | `/api/tags` | Create/list the current user's tags. |

## Analytics and import

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/analytics/overview?range=` | Overview metrics. |
| `GET` | `/api/analytics/timeseries?range=` | Zero-filled date series (UTC buckets currently). |
| `GET` | `/api/analytics/breakdowns?range=` | Traffic breakdowns. |
| `GET` | `/api/analytics/geo?range=` | Available geographic summaries. |
| `GET` | `/api/analytics/alerts` | Current rule-based alerts. |
| `POST` | `/api/import/commit` | Process submitted import rows and return row outcomes. |

## Super-admin

All routes require an authenticated active `ADMIN` account.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/admin/overview` | Platform-level user, link, and click counts. |
| `GET` | `/api/admin/users?search=&status=&role=&page=&pageSize=` | Search/filter/paginate accounts. |
| `PATCH` | `/api/admin/users/:id/status` | Set `{ "isActive": boolean }`; cannot disable self or the final active admin. |
| `GET` | `/api/admin/links?search=&status=&ownerId=&sort=&order=&page=&pageSize=` | Search/filter/sort platform links. |
| `PATCH` | `/api/admin/links/:id/status` | Set `{ "status": "ACTIVE" | "DISABLED", "reason?": string }`. |
| `POST` | `/api/admin/links/:id/disable` | Compatibility route to disable a link with an optional reason. |
| `GET` | `/api/admin/activity?limit=` | Recent click and blocked-attempt activity. This is not an admin mutation audit log. |
| `GET`, `POST` | `/api/admin/blocklist` | List/add normalized blocked hostnames. |
| `DELETE` | `/api/admin/blocklist/:id` | Remove blocked hostname. |

Blocked hostnames are normalized and matched at DNS-label boundaries, including subdomains. The schema does not include an immutable admin audit-event model.

## Public routes

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/public/unlock/:alias` | Check a protected link password and return the destination plus signed continue token after current rule checks. Limited to five attempts per minute. |
| `GET` | `/api/public/resolve/:alias?token=` | Resolve an already admitted visit; verifies the short-lived token and does not add another click. |
| `GET` | `/:alias` | Evaluate a standard short-link visit. |
| `GET` | `/qr/:alias` | Evaluate a QR-origin visit and mark the event source `QR`. |

A successful redirect returns `302` to the configured app's `/continue/:alias` route. Public status and unlock pages are frontend routes.

## Health and static app

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness response. |
| `GET` | `/` and frontend paths | Serves the compiled SPA when `web/dist` is present, subject to API/public route precedence. |
