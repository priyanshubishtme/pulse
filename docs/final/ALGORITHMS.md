# Core Algorithms

> **TECHNICAL REFERENCE | CORE ALGORITHMS**

## Contents

- [Alias validation](#alias-validation)
- [Redirect decision](#redirect-decision)
- [Atomic click admission](#atomic-click-admission)
- [Continue token](#continue-token)
- [Visitor hashing](#visitor-hashing)

## Alias validation

Aliases are validated and checked for uniqueness before creation. The database's unique constraint on `Link.alias` remains the final concurrency guard. See `server/src/modules/links/aliasService.ts` and the schema for the current reserved words and format rules; do not rely on a generator retry count as a uniqueness guarantee.

## Redirect decision

`effectiveStatus(link, now, isUnlocked, isDomainBlocked)` is a pure ordered decision function:

1. Missing link → `NOT_FOUND`.
2. Disabled status → `DISABLED`.
3. Stored expired status or `expiresAt <= now` → `EXPIRED`.
4. Human click count at or above a configured limit → `LIMIT_REACHED`.
5. Protected link without a valid unlock state → `PASSWORD_REQUIRED`.
6. Blocklisted destination → `DISABLED`.
7. Otherwise → `REDIRECT`.

The redirect route separately loads link and blocklist state, records expiry when it first encounters an expired link, and maps decisions to public status or unlock pages. See the [decision table](../design/05-redirect-decision-table.md).

## Atomic click admission

For human visits to a bounded link, PostgreSQL conditionally increments the counter:

```sql
UPDATE "Link" SET "clickCount" = "clickCount" + 1
WHERE id = $1 AND "clickCount" < $2;
```

If no row is updated, another request consumed the remaining capacity first and this visit is rejected. Bots do not consume the human click limit. For unlimited links, the counter is incremented when the event persists successfully.

## Continue token

After a visit passes admission, the server signs `alias`, expiry time, and whether the visit passed password unlock with HMAC-SHA256 using `SERVER_SALT`. The token expires after 120 seconds. The resolve endpoint verifies the signature and expiry and rechecks current link status, expiry, and destination blocklist before returning the destination. It does not record another click. The already admitted visit is allowed to resolve even if it was the final click.

## Visitor hashing

The event pipeline stores a daily rotating SHA-256 hash:

```text
sha256(IP | User-Agent | UTC-date | SERVER_SALT)
```

The raw IP is used in memory for hashing and GeoIP lookup; it is not persisted in the click or blocked-attempt row. The daily date component means distinct visitors are approximate daily identities, not stable person-level identities.
