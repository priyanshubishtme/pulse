# API Reference

*All routes prefixed with `/api`*

## Auth
- `POST /auth/signup` - `{ name, email, password }`
- `POST /auth/login` - `{ email, password }`
- `POST /auth/logout`
- `GET /auth/me`

## Links (Requires USER)
- `POST /links/validate` - Validates a link and returns warnings/errors.
- `GET /links/check-alias?alias=`
- `POST /links` - Creates a link.
- `GET /links` - Lists user links.
- `PATCH /links/:id` - Edit a link.
- `DELETE /links/:id` - Delete a link.
- `POST /links/bulk-move`
- `POST /links/bulk-tag`

## Campaigns & Tags (Requires USER)
- `POST /campaigns`
- `GET /campaigns`
- `PATCH /campaigns/:id`
- `DELETE /campaigns/:id`
- `POST /campaigns/:id/archive`
- `POST /campaigns/:id/unarchive`
- `POST /tags`
- `GET /tags`

## Analytics (Requires USER)
- `GET /analytics/overview?range=`
- `GET /analytics/timeseries?range=`
- `GET /analytics/breakdowns?range=`
- `GET /analytics/geo?range=`
- `GET /analytics/alerts`

## Import
- `POST /import/commit` - Processes `rows[]`.

## Admin (Requires ADMIN)
- `GET /admin/overview`
- `GET /admin/links`
- `POST /admin/links/:id/disable` - `{ reason }`
- `POST /admin/blocklist` - `{ domain, reason }`

## Public
- `POST /public/unlock/:alias` - `{ password }`
- `GET /:alias` - Redirection
- `GET /qr/:alias` - Redirection (QR tagged)
