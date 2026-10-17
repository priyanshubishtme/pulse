# LinkPulse Software Requirements Specification (SRS)

## 1. Purpose
This document specifies the software requirements for LinkPulse, a URL shortener designed with integrated governance and analytics.

## 2. Scope
The system allows users to shorten URLs, organize them via Campaigns and Tags, and track their analytics without recording PII (such as raw IPs). It differentiates between human and bot traffic. Admins can manage the platform via blocklisting and takedown capabilities.

## 3. Users / Roles
- **Visitor:** The end user clicking links.
- **USER:** Link creators (can only access their own data).
- **ADMIN:** System managers (can disable any link and manage domain blocklists).

## 4. Functional Requirements

| ID | Requirement | Acceptance Criteria | Tests |
|---|---|---|---|
| FR-01 | Create Link via Wizard | System validates alias/url and returns specific warnings before commit. | `e2e.test.ts` / API validation |
| FR-02 | Redirect Engine | URL redirects with 302. Returns custom pages for disabled, limit-reached, expired, or wrong-password links. | `ruleEngine.test.ts` |
| FR-03 | Async Analytics | Clicks are processed asynchronously (flushed to DB every 1s or 50 items). | `clickQueue.ts` logic |
| FR-04 | Governance | Admin can disable a link instantly. Redirects stop. Analytics are preserved. | `e2e.test.ts` |
| FR-05 | CSV Import | Users can upload CSV to bulk create links. Invalid rows are returned in an error report. | Tested manually / API |
| FR-06 | Bot Filtering | System identifies bots (via `isbot`). Bots do not increment link limit/KPIs. | `clickQueue.ts` / API queries |

## 5. Non-Functional Requirements
- **Performance:** Redirects must remain fast (<50ms processing). Click events are queued in memory, and click limits use atomic DB increments.
- **Security:** Raw visitor IPs are never stored. A SHA256 salted hash is stored instead (`visitorHash`). Passwords are encrypted with `bcrypt`.
- **Reliability:** Prisma transactions and constraints prevent race conditions on aliases.
