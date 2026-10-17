# Analytics Queries & Data Integrity

We utilize standard Prisma logic connected directly to PostgreSQL to derive all analytics natively. No third-party reporting engine is used.

## Core Aggregations
- **Clicks**: Simple `COUNT(*)` where `isBot = false`.
- **Unique Visitors**: Handled via `Prisma.groupBy` on the `visitorHash` column. The array length of the returned distinct hashes equals the unique visitor count.
- **Time Series**: The backend queries all valid timestamps and groups them into JS date keys, ensuring days with `0` traffic are explicitly zero-filled in the returned array.

## Performance Indexes
The Prisma schema includes strategic composite indexes to keep these analytical reads fast:
- `@@index([linkId, occurredAt])` - Speeds up timeseries for single links.
- `@@index([occurredAt])` - Speeds up platform-wide queries.
- `@@index([linkId, isBot, occurredAt])` - Ensures bot filtering during aggregations is index-assisted.
