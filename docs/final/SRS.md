# LinkPulse Software Requirements Specification

> **TECHNICAL REFERENCE | SOFTWARE REQUIREMENTS**

## Contents

- [Purpose and scope](#purpose-and-scope)
- [Actors and access](#actors-and-access)
- [Functional requirements](#functional-requirements)
- [Quality and security requirements](#quality-and-security-requirements)
- [Acceptance boundary](#acceptance-boundary)

## Purpose and scope

LinkPulse shortens URLs and provides link governance, campaign and tag organization, analytics, QR creation, CSV import, and platform administration. PostgreSQL is required; Redis is optional. The application is a React frontend served alongside an Express API and public redirect routes.

## Actors and access

| Actor | Capabilities |
|---|---|
| Visitor | Opens short links and QR links; sees continue, password unlock, or status flows. |
| `USER` | Manages their own links, campaigns, tags, imports, and analytics. |
| Active `ADMIN` | Platform-wide super-admin controls for users, links, recent activity, and blocked domains. The last active super-admin cannot disable themself or another final active admin. |

## Functional requirements

| ID | Requirement | Acceptance evidence |
|---|---|---|
| FR-01 | Validate and create links with unique aliases and optional governance settings. | Links route validation and API tests. |
| FR-02 | Apply status, expiry, click limit, password, and destination blocklist rules to public redirects. | Redirect rule and route tests. |
| FR-03 | Record admitted visits and distinguish `LINK` and `QR` sources. Provide a signed, short-lived token for destination resolution. | Redirect and continue-token tests. |
| FR-04 | Attribute traffic to a daily salted visitor hash; exclude classified bots from human click counts and primary KPIs. | Click queue and analytics logic. |
| FR-05 | Persist events through a best-effort local queue or optional Redis Stream consumer. | Queue implementation; Redis runtime verification is environment-dependent. |
| FR-06 | Provide owner-scoped campaign, tag, analytics, and CSV import workflows. | Workspace route and UI implementations. |
| FR-07 | Allow active super-admins to manage platform users, links, recent activity, and destination blocklist. | Admin API and UI; migration required for `User.isActive`. |

## Quality and security requirements

| Area | Requirement / current boundary |
|---|---|
| Authorization | Verify authenticated ownership for user operations; protect platform administration with active `ADMIN` accounts. |
| Password storage | Hash account and protected-link passwords with bcrypt; never store plaintext passwords. |
| Visitor privacy | Persist a salted daily hash, not raw visitor IP, in click and blocked-attempt rows. Geo lookup uses the request IP in memory. |
| Redirect admission | Reserve limited human clicks with a conditional PostgreSQL update; bots do not consume the human click limit. |
| Event delivery | Redis mode persists stream events transactionally and idempotently. No-Redis mode can lose queued events if the process stops before flush. |
| Analytics dates | Daily aggregation currently uses UTC; saved account timezones do not yet make the reports timezone-local. |
| Performance | No verified latency or throughput service-level objective is published. See [performance notes](PERFORMANCE.md). |

## Acceptance boundary

Builds and local unit/mocked route tests do not prove deployment readiness. Database-backed E2E checks require a reachable database with all migrations applied. Redis durability, container startup, and multi-instance behavior require a Redis-enabled environment. The [deployment guide](../DEPLOYMENT.md) lists the release checks and [release notes](../../Bugs.md) records known gaps.
