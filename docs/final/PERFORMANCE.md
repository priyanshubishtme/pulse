# Performance Notes

> **TECHNICAL REFERENCE | PERFORMANCE NOTES**

## Contents

- [Measurement status](#measurement-status)
- [Redirect read path](#redirect-read-path)
- [Analytics event path](#analytics-event-path)
- [Recommended benchmark method](#recommended-benchmark-method)

## Measurement status

There is no reproducible, current performance benchmark attached to this repository. Earlier notes reported roughly 5 ms average latency and 5,000 requests per second for `/health` in a local Docker run, but the workload, machine, build, and test artifact are not available to validate those numbers. Treat them as historical observations, not a capacity claim or redirect SLO.

The web production build also emits a chunk-size advisory above Vite's default threshold; this is tracked in [`Bugs.md`](../../Bugs.md).

## Redirect read path

Link lookups use a 30-second Redis cache when Redis is ready; otherwise they use a process-local LRU cache. A miss reads the link from PostgreSQL. Destination blocklist checks query the stored blocked domains. User and admin link updates invalidate relevant cache entries; blocklist changes clear the link cache.

For limited links, human admission uses a conditional PostgreSQL update so concurrent requests cannot all consume the same final slot. This correctness check adds a database write to the bounded-link path.

## Analytics event path

With Redis, events enter a Redis Stream and are processed by a consumer group. The consumer persists each event and any unlimited-link counter update in one Prisma transaction, then acknowledges the stream message. Failed entries remain pending for retry/reclaim. Without Redis, an in-memory queue flushes at 50 queued items or after a one-second timer, persisting up to 100 entries per local flush.

## Recommended benchmark method

For a useful capacity result, record the commit, Node/PostgreSQL/Redis versions, machine or service size, and exact command. Benchmark `/health` separately from redirect hits; include cache-hit, cache-miss, bounded-link, Redis-enabled, and no-Redis scenarios. Report p50/p95/p99 latency, error rate, and sustained throughput, then verify click counts and persisted event totals after the run.

Do not use a health endpoint result as a substitute for redirect or analytics throughput. Test against disposable data and a non-production environment.
