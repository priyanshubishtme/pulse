# Core Algorithms

## Alias Generation
1. Generate `N` random bytes and convert to base36.
2. Filter for alphanumeric lowercase characters only.
3. Validate against `ALIAS_REGEX` and reserved words.
4. If unavailable, try up to 5 times.
5. If still unavailable, increment length by 1 and repeat.

## Redirect Engine (`effectiveStatus`)
Evaluated in exact order (pure function, fully tested):
1. **NOT_FOUND**: Link is null.
2. **DISABLED**: Link status is `DISABLED` or destination domain is in `BlockedDomain`.
3. **EXPIRED**: Status is `EXPIRED` or `expiresAt <= now`.
4. **LIMIT_REACHED**: `clickCount >= clickLimit`.
5. **PASSWORD_REQUIRED**: Password is set and user has not passed the unlock gate.
6. **REDIRECT**: Success.

## Atomic Click Limit
To prevent race conditions, bounded links are updated strictly in PostgreSQL:
```sql
UPDATE "Link" SET "clickCount" = "clickCount" + 1
WHERE id = $1 AND "clickCount" < $2;
```
If 0 rows update, the limit was hit concurrently, and the user is routed to the limit-reached status page. Non-limited links are incremented lazily inside the batch flush.

## Visitor Hashing
Privacy-preserving hash of visitors, rolled daily.
`sha256(IP | UserAgent | YYYY-MM-DD | SALT)`
