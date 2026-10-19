# LinkPulse Sequence Diagrams

> **DESIGN PACK | 04 OF 06 | REQUEST FLOWS**

## Contents

- [Create a link](#create-a-link)
- [Redirect and deferred analytics](#redirect-and-deferred-analytics)
- [Password-protected redirect](#password-protected-redirect)
- [Super-admin status change](#super-admin-status-change)
- [CSV import](#csv-import)

> **Design pack · 04 / 06** · Current request behavior across the browser, API, and database

[← Architecture](03-architecture.md) · [Redirect decision table →](05-redirect-decision-table.md)

## Create a link

```mermaid
sequenceDiagram
    actor User
    participant Web as React wizard
    participant API as Express links API
    participant DB as PostgreSQL
    User->>Web: Enter destination, alias, and options
    Web->>API: POST /api/links/validate
    API->>DB: Check alias and ownership constraints
    API-->>Web: Validation errors and warnings
    User->>Web: Confirm creation
    Web->>API: POST /api/links
    API->>API: Validate input and owner scope
    API->>DB: Insert link and relations
    DB-->>API: Created link
    API-->>Web: 201 Created
    Web-->>User: Show link and available actions
```

## Redirect and deferred analytics

```mermaid
sequenceDiagram
    actor Visitor
    participant API as Express redirect
    participant Cache as Redis or LRU
    participant DB as PostgreSQL
    participant Q as Redis Stream or local queue
    participant Web as Continue page
    Visitor->>API: GET /:alias or /qr/:alias
    API->>Cache: Lookup alias
    opt Cache miss
        API->>DB: Read link
        DB-->>API: Link record
        API->>Cache: Store for 30 seconds
    end
    API->>DB: Check blocked destination domains
    API->>API: Evaluate status, expiry, limit, and password
    opt Bounded link and non-bot visitor
        API->>DB: Atomic conditional click increment
    end
    API->>Q: Enqueue enriched event
    API-->>Visitor: 302 to continue page with signed token
    Visitor->>Web: Load /continue/:alias
    Web->>API: GET /api/public/resolve/:alias?token=...
    API->>API: Recheck current rules and token (120 second expiry)
    API-->>Web: Destination URL, without a second event
    Web-->>Visitor: Immediate continue action and timed navigation
    Q->>DB: Persist event and any deferred unlimited-link count
```

With Redis enabled, the consumer group persists stream entries transactionally and acknowledges them after persistence. Without Redis, the in-process queue is best effort and may lose buffered events on process exit.

## Password-protected redirect

```mermaid
sequenceDiagram
    actor Visitor
    participant API as Express redirect and unlock routes
    participant DB as PostgreSQL
    participant Web as Unlock / continue pages
    Visitor->>API: GET /:alias
    API->>DB: Load link and check redirect rules
    API-->>Visitor: 302 /unlock/:alias
    Visitor->>Web: Submit password
    Web->>API: POST /api/public/unlock/:alias
    API->>API: Apply 5 attempts per minute limiter
    API->>DB: Read password hash and current link state
    API->>API: bcrypt compare, blocklist check, rule recheck
    alt Wrong password
        API->>DB: Queue blocked attempt
        API-->>Web: 401 Unauthorized
    else Valid password and link still allowed
        API->>DB: Reserve bounded human click atomically
        API->>API: Queue click and sign 120 second unlocked token
        API-->>Web: Destination plus continue token
        Web->>API: Resolve destination using token
        API-->>Web: Destination URL
    else Link is no longer allowed
        API-->>Web: 403 with rule decision
    end
```

## Super-admin status change

```mermaid
sequenceDiagram
    actor Admin as Active super-admin
    participant Web as Admin page
    participant API as Protected admin API
    participant DB as PostgreSQL
    participant Cache as Redis or local LRU
    Admin->>Web: Disable link with optional reason
    Web->>API: PATCH /api/admin/links/:id/status
    API->>API: Require authenticated ADMIN and validate body
    API->>DB: Set status and disabledReason
    DB-->>API: Updated link
    API->>Cache: Invalidate alias cache entry
    API-->>Web: Updated link
    Web-->>Admin: Refresh platform link state
```

## CSV import

```mermaid
sequenceDiagram
    actor User
    participant Web as React import page
    participant API as Express import route
    participant DB as PostgreSQL
    User->>Web: Select CSV and map columns
    Web->>Web: Parse and preview rows
    User->>Web: Confirm import
    Web->>API: POST /api/import/commit with rows
    API->>API: Validate and process rows; classify invalid and duplicate outcomes
    API->>DB: Create valid links and batch/row result records
    DB-->>API: Persisted outcomes
    API-->>Web: Added, duplicate, and rejected results
    Web-->>User: Summary and downloadable correction report
```

> **Implementation note:** import is processed by the server with per-row validation and recorded outcomes. Do not assume the entire upload is one all-or-nothing database transaction.
