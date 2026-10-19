# Redirect Decision Table & Status Rules

> **DESIGN PACK | 05 OF 06 | REDIRECT RULES**

## Contents

- [Rule Engine Order](#rule-engine-order)
- [Single Source of Truth](#single-source-of-truth)
- [Status Transitions](#status-transitions)
- [Public Messages (Served at `/status/:reason`)](#public-messages-served-at-statusreason)

## Rule Engine Order

The `effectiveStatus(link, now, isUnlocked, isDomainBlocked)` pure function evaluates the ordered rules below. The redirect handler performs the domain lookup and then supplies that result to the rule engine.

| Order | Condition | Result / Action |
|-------|-----------|-----------------|
| 1 | Link not found in DB | Return `NOT_FOUND` |
| 2 | `link.status === DISABLED` | Return `DISABLED` |
| 3 | `link.status === EXPIRED` **OR** `link.expiresAt <= now` | Return `EXPIRED`; the redirect handler persists the expired status when needed. |
| 4 | `link.clickLimit != null` **AND** `link.clickCount >= link.clickLimit` | Return `LIMIT_REACHED` |
| 5 | `link.passwordHash != null` **AND** (unlock attempt invalid/missing) | Return `PASSWORD_REQUIRED` |
| 6 | Destination domain is found in `BlockedDomain` | Return `DISABLED` |
| 7 | All checks pass | Return `REDIRECT` |

## Single Source of Truth
The function returns a redirect decision: `NOT_FOUND`, `DISABLED`, `EXPIRED`, `LIMIT_REACHED`, `PASSWORD_REQUIRED`, or `REDIRECT`. It does not itself query PostgreSQL or mutate link state. Redirect and destination-resolution handlers use it; the redirect handler separately records expiry and blocked attempts.

*Note on Expiry:* A link past its `expiresAt` always returns `EXPIRED`, even on the first visit.

## Status Transitions
- **User status changes:** Users can manage their own link status through the links API, subject to the route's allowed status values.
- **Super-admin status changes:** `ADMIN` can set a platform link to `ACTIVE` or `DISABLED`; disabling may include a reason. The admin route invalidates the corresponding cache entry.
- **Expiry:** An `expiresAt` value at or before the current time makes the effective decision `EXPIRED`. The redirect handler stores `EXPIRED` when first observed.

## Public Messages (Served at `/status/:reason`)
When a redirect fails, the user is sent via 302 to the appropriate app status page. The link owner's name is kept hidden.

- `NOT_FOUND`: "This short link does not exist."
- `DISABLED`: "This short link is disabled."
- `EXPIRED`: "This short link has expired."
- `LIMIT_REACHED`: "This short link has reached its click limit."
- *Password Prompt:* The frontend asks for a password at `/unlock/:alias`; the API checks it at `POST /api/public/unlock/:alias` and returns a short-lived continue token after a successful rule recheck.

> **Admission detail:** for bounded human clicks, the handler uses a conditional PostgreSQL increment after the rule check. If simultaneous requests race for the final click, only the request whose atomic update succeeds proceeds.
