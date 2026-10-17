# Sequence Diagrams

## a) Create Link with Validation

```mermaid
sequenceDiagram
    actor User
    participant Web as Web (React)
    participant API as API (Express)
    participant LinkService
    participant Validator as urlValidator & aliasService
    participant DB as Postgres (Prisma)

    User->>Web: Enters URL and Alias
    Web->>API: POST /links/validate {url, alias}
    API->>Validator: Validate input
    Validator->>DB: Check global alias uniqueness & user's exact URL
    Validator-->>API: Return issues (errors/warnings)
    API-->>Web: Return validation issues
    Web-->>User: Show warnings in Review box
    User->>Web: Clicks "Create Link"
    Web->>API: POST /links {data}
    API->>LinkService: createLink(data)
    LinkService->>Validator: Re-run validation
    Validator-->>LinkService: OK
    LinkService->>DB: INSERT into Link
    DB-->>LinkService: success
    LinkService-->>API: Created Link
    API-->>Web: 201 Created
    Web-->>User: Show success, copy button, QR
```

## b) Redirect Happy Path with Async Logging

```mermaid
sequenceDiagram
    actor Visitor
    participant Server as GET /:alias
    participant Cache as LRU Cache
    participant Engine as Rule Engine
    participant Queue as Click Queue
    participant DB as Postgres

    Visitor->>Server: HTTP GET /short123
    Server->>Cache: Lookup "short123"
    alt Cache Miss
        Cache-->>Server: null
        Server->>DB: SELECT * FROM Link WHERE alias = "short123"
        DB-->>Server: Link Data
        Server->>Cache: Set "short123" (TTL 30s)
    else Cache Hit
        Cache-->>Server: Link Data
    end
    
    Server->>Engine: effectiveStatus(Link, now)
    Engine-->>Server: REDIRECT
    
    alt Has Click Limit
        Server->>DB: UPDATE Link SET clickCount = clickCount + 1 WHERE id = X AND clickCount < limit
        DB-->>Server: 1 row changed
    end

    Server->>Queue: enqueue(clickEvent)
    Server-->>Visitor: 302 Found (Destination URL)
    
    Note right of Queue: Async batch flush
    loop Every 1s or 50 items
        Queue->>Queue: Enrich (UA, Geo, Hash)
        Queue->>DB: INSERT into ClickEvent
    end
```

## c) Password-Protected Redirect

```mermaid
sequenceDiagram
    actor Visitor
    participant Server as GET /:alias
    participant Engine as Rule Engine
    participant API as POST /unlock

    Visitor->>Server: HTTP GET /secure123
    Server->>Engine: effectiveStatus(Link, now)
    Engine-->>Server: PASSWORD_REQUIRED
    Server-->>Visitor: 302 Found (/unlock/secure123)
    
    Visitor->>API: Submits password via form
    API->>API: Check Rate Limit (5/min/IP)
    API->>API: bcrypt.compare()
    alt Correct Password
        API->>API: Log click event to Queue
        API-->>Visitor: 200 OK (Destination URL)
    else Wrong Password
        API->>API: Log to BlockedAttempt
        API-->>Visitor: 401 Unauthorized
    end
```

## d) Admin Disable & Cache Invalidation

```mermaid
sequenceDiagram
    actor Admin
    participant API as POST /admin/links/:id/disable
    participant DB as Postgres
    participant Cache as LRU Cache

    Admin->>API: Disable Link + Reason
    API->>DB: UPDATE Link SET status = DISABLED, disabledReason = "Abuse"
    DB-->>API: success
    API->>Cache: delete("badalias")
    API-->>Admin: 200 OK
```

## e) CSV Import

```mermaid
sequenceDiagram
    actor User
    participant Web as Web (Papa Parse)
    participant API as POST /import/commit
    participant DB as Postgres (Transaction)
    participant Validator as Validator Services

    User->>Web: Uploads CSV
    Web->>Web: Parse CSV & show preview
    User->>Web: Maps columns & submits
    Web->>API: Send Array of Link Data (max 1000)
    API->>DB: BEGIN Transaction
    loop For every 100 rows
        loop For each row
            API->>Validator: Validate (URL, Alias)
            alt Duplicate/Invalid
                API->>API: Mark row outcome (e.g. DUPLICATE_ALIAS)
            else Valid
                API->>DB: INSERT Link
                API->>API: Mark row outcome ADDED
            end
        end
    end
    API->>DB: INSERT ImportBatch and ImportRows
    API->>DB: COMMIT Transaction
    API-->>Web: Return Batch Outcomes
    Web-->>User: Show Added/Rejected metrics & download error CSV
```
