# Analytics Metric Definitions

> **DESIGN PACK | 06 OF 06 | ANALYTICS METRICS**

## Contents

- [Core Rules](#core-rules)
- [Definitions](#definitions)
- [Time Series & Charts](#time-series-charts)
- [Insight Rules (Rule-based)](#insight-rules-rule-based)
- [Alerts](#alerts)
- [Filters](#filters)

This page is the intended product vocabulary for analytics. Where an item differs from current runtime behavior, the implementation note below calls that out explicitly.

## Core Rules
- **Bots Excluded:** All KPIs and charts count **only** events where `isBot = false`. Bot traffic is aggregated separately for its own specific tile or admin abuse views.
- **Timezone:** Daily time-series bucketing currently uses UTC. User timezones are stored, but reports should not be described as localized until timezone-aware bucketing is implemented.
- **Empty States:** Charts and metrics show `0` or zero-filled series; they are never left blank.

## Definitions
- **Range:** Defined as `[now - N days, now]` for 7/30/90 days, `All time`, or a Custom from/to.
- **Previous Period:** An equal-length window occurring immediately before the Range.
- **Delta (% Change):** Calculated as `(current - previous) / previous`. If previous is 0, display "New" instead of a percentage.
- **Clicks:** Total count of valid (`isBot = false`) events in the range.
- **Unique Visitors:** `COUNT(DISTINCT visitorHash)` in the range. (Documented as "unique per day", since visitorHash includes a daily salt).
- **Active Links:** Links where `effectiveStatus(link, now) === ACTIVE` evaluated right now (not tied to the date range).
- **Campaigns:** Count of non-archived campaigns. This KPI is **not** affected by filters.
- **Total Links:** Count of all links (respects campaign and tag filters).

## Time Series & Charts
- **Time Series:** Daily series are bucketed by UTC date and zero-filled so empty days appear on the chart. Verify the analytics implementation before relying on hourly buckets or user-local time.
- **Top Links:** Ranked by clicks in the range, ties broken by newest created. Each row includes a sparkline and trend vs. previous period.
- **Heatmap:** Product definition: 7 days × 24 hours. Its timezone and threshold behavior must match the live analytics query before being presented as a runtime guarantee.
- **Channels:** Derived from referrer hostname:
  - `SOCIAL`: instagram, facebook, x.com/twitter, linkedin, youtube, reddit, whatsapp, t.me, pinterest
  - `SEARCH`: google, bing, duckduckgo, yahoo
  - `EMAIL`: mail.google, outlook, mail.yahoo
  - `OTHER_SITE`: Any other referrer
  - `DIRECT`: null/empty referrer
- **Geo:** Derived via `geoip-lite`. Map aggregates by country. City bubbles aggregate by rounded lat/lng (1 decimal). Unknown locations are excluded from the map but noted in a footnote.

## Insight Rules (Rule-based)
Product insight candidates (confirm current implementation before treating each as an active feature):
- Best day-hour slot.
- Top country share.
- Mobile share above 60%.
- Leading channel vs runner-up.
- Fastest-growing link (≥ +50% growth AND ≥ 20 clicks).
- Campaign with most links but fewest clicks.
- QR share percentage.
- Bot ratio > 20% (shown as a warning).

## Alerts

The currently implemented alert rules are defined in `server/src/modules/analytics/alerts.ts`; keep this list aligned when those rules change.
- Link expiring within 7 days.
- Link at ≥ 80% of click limit.
- Traffic spike: today's traffic > 3× the 7-day average.
- Dead link: 0 clicks in the last 14 days.
- Blocked visits recorded after a takedown.

## Filters
- Filters combine with **AND**.
- Available filters: Range, Campaign, Tag, Link, Source (Link/QR), Country.
- **"Clear Filters"**: Always resets all filters to their defaults, ensuring a clean slate.
