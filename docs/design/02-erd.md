# Entity Relationship Diagram (ERD)

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
        String timezone "IANA timezone"
        DateTime createdAt
    }

    Campaign {
        String id PK
        String ownerId FK
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
        String ownerId FK
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
- **User**: Represents a person registered in the system, either a standard USER or an ADMIN.
- **Campaign**: A time-bound organizational grouping for links, owned by a specific User.
- **Tag**: A label to organize links, owned by a specific User.
- **Link**: The core entity representing a short URL, storing its destination, rules, and current status.
- **LinkTag**: A many-to-many relationship mapping between Links and Tags.
- **ClickEvent**: An occurrence of a human or bot visiting a Link, enriched with geo and device data.
- **BlockedAttempt**: A record of a visit that failed to redirect due to rules (e.g., limit reached, disabled).
- **BlockedDomain**: A platform-wide list of domains that are not allowed as destinations (managed by Admin).
- **ImportBatch**: A record of a bulk CSV upload session for auditing and progress tracking.
- **ImportRow**: The outcome of an individual row processed within an ImportBatch.
