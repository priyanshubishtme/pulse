# Entity Relationship Diagram (ERD)

> **DESIGN PACK | 02 OF 06 | DATA MODEL**

## Contents

- [Entity Descriptions](#entity-descriptions)

```mermaid
erDiagram
    User ||--o{ Campaign : owns
    User ||--o{ Tag : owns
    User ||--o{ Link : owns
    Campaign ||--o{ Link : contains
    Tag ||--o{ LinkTag : applies_to
    Link ||--o{ LinkTag : has
    Link ||--o{ ClickEvent : tracks
    Link ||--o{ BlockedAttempt : records
    ImportBatch ||--o{ ImportRow : contains

    User {
        String id PK
        String email UK
        String name
        String passwordHash
        Role role "USER or ADMIN"
        Boolean isActive
        String timezone "IANA timezone"
        DateTime createdAt
    }

    Campaign {
        String id PK
        String ownerId "Scalar owner reference; no User relation in schema"
        String name
        CampaignCategory category
        DateTime startsAt
        DateTime endsAt
        DateTime archivedAt
        String description
        DateTime createdAt
    }

    Tag {
        String id PK
        String ownerId FK
        String name
    }

    Link {
        String id PK
        String ownerId FK
        String campaignId FK
        String alias UK "Stored lowercase, immutable"
        String destinationUrl
        String title
        LinkStatus status "ACTIVE, DISABLED, EXPIRED"
        String disabledReason
        DateTime expiresAt
        Int clickLimit
        Int clickCount "Human clicks only"
        String passwordHash
        DateTime createdAt
        DateTime updatedAt
    }

    LinkTag {
        String linkId PK,FK
        String tagId PK,FK
    }

    ClickEvent {
        String id PK
        String linkId FK
        DateTime occurredAt
        ClickSource source "LINK or QR"
        Boolean isBot
        String visitorHash "sha256(ip+ua+salt)"
        String referrer
        Channel channel
        DeviceType device
        String browser
        String os
        String country
        String region
        String city
        Float lat
        Float lng
    }

    BlockedAttempt {
        String id PK
        String linkId FK
        DateTime occurredAt
        BlockReason reason "DISABLED, EXPIRED, LIMIT_REACHED, WRONG_PASSWORD"
        String visitorHash
        String country
        Boolean isBot
    }

    BlockedDomain {
        String id PK
        String domain UK
        String reason
        DateTime createdAt
    }

    ImportBatch {
        String id PK
        String ownerId "Scalar; no User relation declared"
        DateTime createdAt
        Int added
        Int rejected
        Int duplicates
    }

    ImportRow {
        String id PK
        String batchId FK
        String url
        String alias
        String outcome "ADDED, DUPLICATE_ALIAS, etc."
    }
```

## Entity Descriptions

| Entity | Purpose and relationship notes |
|---|---|
| `User` | Registered account with `USER` or `ADMIN` role and active status. Owns links, campaigns, and tags. |
| `Campaign` | User-owned grouping for links; optional dates and archive timestamp. Deleting a campaign unassigns links. |
| `Tag` | User-owned label connected to links through `LinkTag`. |
| `Link` | Short URL, destination, status, access rules, and click counter. |
| `LinkTag` | Composite-key many-to-many join; either parent deletion cascades. |
| `ClickEvent` | Human or bot visit with source, daily visitor hash, and available device/referrer/geo fields. |
| `BlockedAttempt` | Visit rejected by a redirect rule; records the reason and privacy-preserving visitor hash. |
| `BlockedDomain` | Platform-wide unique destination hostname maintained by super-admins. |
| `ImportBatch` | Import summary; `ownerId` is a scalar and the current schema has no relation to `User`. |
| `ImportRow` | Per-row result belonging to a batch; rows cascade when the batch is deleted. |

> **Schema source of truth:** [`server/prisma/schema.prisma`](../../server/prisma/schema.prisma). This ERD describes declared Prisma relations; `ImportBatch.ownerId` is intentionally shown without a foreign-key edge.
