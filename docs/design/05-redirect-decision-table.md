# Redirect Decision Table & Status Rules

## Rule Engine Order
The `effectiveStatus(link, now, unlockData)` pure function evaluates these rules in exact order. It stops at the first failure.

| Order | Condition | Result / Action |
|-------|-----------|-----------------|
| 1 | Link not found in DB | Return `NOT_FOUND` |
| 2 | `link.status === DISABLED` | Return `DISABLED` |
| 3 | `link.status === EXPIRED` **OR** `link.expiresAt <= now` | Persist `EXPIRED` in DB if not already. Return `EXPIRED`. |
| 4 | `link.clickLimit != null` **AND** `link.clickCount >= link.clickLimit` | Return `LIMIT_REACHED` |
| 5 | `link.passwordHash != null` **AND** (unlock attempt invalid/missing) | Return `PASSWORD_REQUIRED` |
| 6 | Destination domain is found in `BlockedDomain` | Return `DISABLED` |
| 7 | All checks pass | Return `REDIRECT` (or `ACTIVE`) |

## Single Source of Truth
The function `effectiveStatus(link, now)` returns one of `DISABLED`, `EXPIRED`, or `ACTIVE`. This is used by:
1. The redirect handler.
2. The UI dashboard "Active links" KPI.
3. The Link detail view.

*Note on Expiry:* A link past its `expiresAt` always returns `EXPIRED`, even on the first visit.

## Status Transitions
- **Pause/Enable:** Toggles only between `ACTIVE ↔ DISABLED` (for User actions).
- **Admin Disable:** Sets status to `DISABLED` and saves a `disabledReason`. An Admin-disabled link can *only* be re-enabled by an Admin.
- **Expiry:** Re-enabling an `EXPIRED` link requires using the "Extend expiry & re-enable" action, which updates `expiresAt` to a future date or `null` (empty).

## Public Messages (Served at `/status/:reason`)
When a redirect fails, the user is sent via 302 to the appropriate app status page. The link owner's name is kept hidden.

- `NOT_FOUND`: "This short link does not exist."
- `DISABLED`: "This short link is disabled."
- `EXPIRED`: "This short link has expired."
- `LIMIT_REACHED`: "This short link has reached its click limit."
- *Password Prompt:* "Enter the correct password to continue." (Served at `/unlock/:alias`)
