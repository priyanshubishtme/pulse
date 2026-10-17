# LinkPulse

LinkPulse is a URL shortener and link operations dashboard. It combines governed redirects (expiry, click limits, passwords, and disable controls) with campaign organization, privacy-conscious click analytics, QR creation, CSV import, and administrator blocklisting.

## Product features

- **Accounts and roles:** Signup/login, logout, current-user session, HTTP-only JWT cookie, and role-protected administration.
- **Link management:** Create, validate, list, edit, delete, and organize short links. Aliases are checked for availability; links can have a title, campaign, tags, expiry, click limit, and password.
- **Redirect governance:** Public `/:alias` and `/qr/:alias` redirects evaluate link status, expiry, click limit, password, and destination blocklist. QR-origin visits are marked separately. Blocked visits can be recorded with a reason.
- **Campaigns and tags:** Create and manage campaigns and personal tags, archive campaigns, assign links, and bulk-move or bulk-tag selected links.
- **Analytics:** Overview KPIs, zero-filled time series, device/channel/browser breakdowns, geographic summaries, and smart alerts. Bot events are excluded from human traffic KPIs.
- **QR designer:** Generate and customize QR codes in the browser and download PNG/SVG without sending destination data to an external QR service.
- **CSV import:** Parse and commit URL rows, report added/duplicate/rejected outcomes, and download a report for rows that need correction.
- **Admin controls:** Review platform links, disable a link, and manage a global blocked-domain list.

## Technology

| Area | Stack |
|---|---|
| Runtime | Node.js (use Node 22.12+; current Vite/Vitest toolchain requires a modern Node release) |
| Monorepo | npm workspaces: root, `server`, and `web` |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 3, React Router 7, TanStack Query 5 |
| Charts and UI | Recharts, Lucide React, `qr-code-styling`, Papa Parse |
| Backend | Express 5, TypeScript, Zod |
| Database | PostgreSQL 15+ with Prisma 5 |
| Redirect and event enrichment | `lru-cache`, `isbot`, `ua-parser-js`, `geoip-lite` |
| Authentication | bcrypt password hashes and JWT in an HTTP-only cookie |

## Architecture

LinkPulse is a **modular monolith**: one Express API and one React web app share a PostgreSQL database. Backend domains are separated into modules under `server/src/modules/` (auth, links, campaigns, tags, redirect, clicks, analytics, import, and admin). Prisma schema and migrations live in `server/prisma/`.

```mermaid
flowchart LR
    Browser[React web app] -->|JSON API / auth cookie| API[Express API]
    Visitor[Link visitor] -->|GET /:alias or /qr/:alias| Redirect[Redirect rules]
    API --> DB[(PostgreSQL via Prisma)]
    Redirect --> Cache[In-process LRU link cache]
    Cache --> Redirect
    Redirect -->|allowed redirect| Visitor
    Redirect --> Queue[In-memory click queue]
    Queue -->|periodic / batch flush| DB
    Admin[Admin user] --> API
```

### Request and event workflows

**Authenticated product request:** the browser calls the API through the shared Axios client. Authentication middleware verifies the HTTP-only JWT cookie; role middleware protects admin routes. Route modules validate inputs (Zod where applicable), scope user data to the owner, call domain services/Prisma, and return JSON. React Router protects authenticated pages and TanStack Query manages server state.

**Short-link redirect:** a visitor requests `/:alias` or `/qr/:alias`. The redirect module looks up link data through the in-process LRU cache and evaluates the centralized rule engine: link existence, status, expiry, click limit, password gate, and blocked destination domain. A valid link receives an HTTP redirect. Visit metadata is enriched with bot classification, user-agent device/browser/OS, referrer/channel, and available geo-IP information, then submitted to an in-memory queue for batched persistence. Click-limit accounting is updated atomically and bots do not increment the human click count.

**Analytics:** analytics queries read persisted `ClickEvent` data, exclude bots from human KPIs, and return overview, time series, breakdown, geo, and alert results to the frontend charts and cards.

**Operational note:** the redirect event queue and link cache are process-local memory. They are not shared across multiple server instances; queued events can be lost if the process exits before a flush. A durable/shared queue or cache is not part of the current implementation.

## Backend data model

The Prisma source of truth is [`server/prisma/schema.prisma`](server/prisma/schema.prisma). `String` IDs use Prisma `cuid()` defaults unless noted. `?` means nullable; unique keys and important indexes are called out.

| Model/table | Key columns and purpose |
|---|---|
| `User` | `id`, unique `email`, `name`, `passwordHash`, `role` (`USER`/`ADMIN`, default `USER`), `timezone` (default `UTC`), `createdAt`. Owns links, campaigns, and tags. |
| `Campaign` | `id`, `ownerId`, `name`, `category`, optional `startsAt`, `endsAt`, `archivedAt`, `description`, `createdAt`. Unique `(ownerId, name)`; campaign deletion unassigns links (`Link.campaignId` uses `SetNull`). |
| `Tag` | `id`, `ownerId`, `name`. Unique `(ownerId, name)`. |
| `Link` | `id`, `ownerId`, optional `campaignId`, unique `alias`, `destinationUrl`, optional `title`, `status`, optional `disabledReason`, `expiresAt`, `clickLimit`, `passwordHash`, `clickCount` (default `0`), `createdAt`, `updatedAt`. Indexed by `(ownerId, createdAt)` and `campaignId`. |
| `LinkTag` | Composite primary key `(linkId, tagId)`; joins links to tags. Both references cascade on delete. |
| `ClickEvent` | `id`, `linkId`, `occurredAt`, `source` (`LINK`/`QR`), `isBot`, `visitorHash`, optional `referrer`, `channel`, `device`, optional `browser`, `os`, `country`, `region`, `city`, `lat`, `lng`. Indexed for link/time and bot/time analytics. |
| `BlockedAttempt` | `id`, `linkId`, `occurredAt`, `reason`, `visitorHash`, optional `country`, `isBot`. Records visits prevented by link rules; indexed by link/time and reason/time. |
| `BlockedDomain` | `id`, unique `domain`, optional `reason`, `createdAt`. Platform-wide destination blocklist managed by admins. |
| `ImportBatch` | `id`, `ownerId`, `createdAt`, `added`, `rejected`, `duplicates`. Summarizes an import operation. `ownerId` is stored as a scalar; the current Prisma schema does not declare a `User` relation for it. |
| `ImportRow` | `id`, `batchId`, `url`, optional `alias`, `outcome`. Belongs to `ImportBatch`; rows cascade when a batch is deleted. |

Enums: `Role` = `USER`, `ADMIN`; `LinkStatus` = `ACTIVE`, `DISABLED`, `EXPIRED`; `ClickSource` = `LINK`, `QR`; `DeviceType` = `DESKTOP`, `MOBILE`, `TABLET`, `OTHER`; `CampaignCategory` = `EMAIL`, `SOCIAL_MEDIA`, `PAID_ADS`, `SEO`, `PARTNERSHIPS`, `EVENTS`, `OTHER`; `Channel` = `DIRECT`, `SOCIAL`, `SEARCH`, `EMAIL`, `OTHER_SITE`; `BlockReason` = `DISABLED`, `EXPIRED`, `LIMIT_REACHED`, `WRONG_PASSWORD`.

The schema does not define a foreign-key relation from `ImportBatch.ownerId` to `User`; see the Prisma schema before changing import retention or ownership behavior.

## API overview

All application API endpoints are prefixed with `/api`, except public redirects and public unlock routes.

| Area | Routes |
|---|---|
| Auth | `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Links | `POST /links/validate`, `GET /links/check-alias`, `POST /links`, `GET /links`, `PATCH /links/:id`, `DELETE /links/:id`, `POST /links/bulk-move`, `POST /links/bulk-tag` |
| Campaigns/tags | Campaign CRUD and archive/unarchive under `/campaigns`; tag create/list under `/tags` |
| Analytics | `GET /analytics/overview`, `/timeseries`, `/breakdowns`, `/geo`, `/alerts` |
| Import | `POST /import/commit` |
| Admin | `GET /admin/overview`, `GET /admin/links`, `POST /admin/links/:id/disable`, `POST /admin/blocklist` |
| Public | `POST /public/unlock/:alias`, `GET /:alias`, `GET /qr/:alias` |

See [`docs/final/API.md`](docs/final/API.md) for the route list and [`docs/final/`](docs/final/) for algorithms, query behavior, performance notes, and requirements.

## Repository layout

```text
server/                 Express API, domain modules, Prisma schema/migrations/seed
web/                    React application, pages, shared UI, charts and QR designer
docs/design/            Product requirements, ERD, architecture and workflow specs
docs/final/             API, SRS, algorithms, queries and performance documentation
FIGMA_UI_AGENT_PROMPT.md  Ready-to-use frontend redesign brief with Figma reference image
```

## Setup and local development

Prerequisites: Node.js 22.12 or newer, npm, and PostgreSQL 15+ (or Docker Desktop for the included Compose service).

1. Install dependencies from the repository root:

   ```bash
   npm install
   ```

2. Start PostgreSQL. With Docker:

   ```bash
   docker compose up -d
   ```

   Or run a local PostgreSQL instance and make sure its credentials match `DATABASE_URL`.

3. Copy `.env.example` to `.env` and configure the values. At minimum, set `DATABASE_URL`, `JWT_SECRET`, and `SERVER_SALT`. Keep secrets private. Update `APP_URL` and `PUBLIC_BASE_URL` if the frontend uses a different local port.

4. Generate Prisma Client and apply the database migrations from the repository root:

   ```bash
   npm run prisma:generate
   cd server
   npx prisma migrate dev --schema prisma/schema.prisma
   npx prisma db seed --schema prisma/schema.prisma
   cd ..
   ```

   Prisma generation is an explicit setup step. There is no automatic `postinstall` generation: on Windows, stop the running Node server before regenerating Prisma Client so the process releases the query-engine DLL.

5. Start both workspaces:

   ```bash
   npm run dev
   ```

   The API defaults to `http://localhost:3000`; Vite defaults to `http://localhost:5173` (and may choose the next free port if occupied). Ensure the backend CORS/app URL settings match the frontend port.

The seed script creates sample users, links, campaigns, tags, and historical click events. For seeded login details, see [`docs/PROGRESS.md`](docs/PROGRESS.md) and `server/prisma/seed.ts`; change development credentials before exposing a deployment. To regenerate/reset local data, use the Prisma commands intentionally and understand that database reset operations remove existing local data.

Useful commands:

```bash
npm run prisma:generate
npm run build --workspace web
```

The server workspace currently exposes `dev`, `start`, and `test` scripts but no `build` script; use `npx tsc --project server/tsconfig.json --noEmit` for a server type check. Root `npm test` delegates to workspace test scripts; inspect workspace scripts before assuming every test command is implemented.

## Delivery phases reflected in Git history

This roadmap is reconstructed from the repository's documentation and the commits currently in Git history. The feature branch `feat-linkpulse-core` was merged into `main` in commit `1842263`.

| Phase | Work recorded | Git history |
|---|---|---|
| Design pack | Product requirements, ERD, architecture, sequence diagrams, redirect decision table, and analytics metric definitions. | `0456d16` — Documentation for LinkPulse |
| 0 — Skeleton | npm monorepo, Express/Prisma backend, React/Vite frontend, PostgreSQL schema, environment setup, seed placeholder, and local dev orchestration. | `982ea06` |
| 1 — Auth and roles | Signup/login/logout/current-user, cookie JWT and bcrypt, auth/role middleware, protected UI routes, shell, and seeded user roles. | `982ea06` |
| 2 — Link creation and CRUD | Alias service, URL validation, links API, ownership checks, rate limiting, links page, and multi-step creation wizard. | `982ea06` |
| 3 — Redirect engine | Alias redirect and rule evaluation, LRU cache, bot/device/geo enrichment, queued click persistence, status/unlock pages, click-limit accounting, deployment docs, and review fixes. | `982ea06` |
| 4 — Campaigns and tags | Campaign lifecycle, tags, link assignment, bulk move/tag, campaign UI and wizard integration. | `34c7c4c` |
| 5 — Analytics | Overview, time series, breakdowns, geo summaries, alerts, and chart UI; the progress notes say the map view used a country list in place of a choropleth. | `34c7c4c` |
| 6 — QR designer | Client-side QR customization and PNG/SVG export; redirect tracking distinguishes QR visits. | `34c7c4c` |
| 7 — CSV import and admin | CSV parsing/commit/reporting, admin link takedowns, and blocked-domain management. | `34c7c4c` |
| 8–9 — Seed and final docs | Rich demo data and historical click events, final API/SRS/algorithm/query/performance docs, and final campaign detail/review fixes. | `34c7c4c`, `ce83397` |
| Merge to main | Combined the completed `feat-linkpulse-core` work with `main`. | `1842263` |

The detailed phase log is in [`docs/PROGRESS.md`](docs/PROGRESS.md); design references are in [`docs/design/`](docs/design/).

## Figma UI redesign brief

To give an AI coding agent the frontend redesign task, start with [`FIGMA_UI_AGENT_PROMPT.md`](FIGMA_UI_AGENT_PROMPT.md). It includes the Figma foundations screenshot, exact palette, type/layout direction, route-by-route guidance, image/illustration rules, functional constraints, and implementation sequence. The current Figma file supplies foundations only, not finished product screens.
