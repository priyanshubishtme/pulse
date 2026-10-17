# Performance Measurements

Test run via `autocannon -c 100 -d 10 http://localhost:3000/health` inside Dockerized environment.

## Measured Results (Local Dev Box)
- **Connections:** 100 concurrent
- **Latency (Avg):** 5ms
- **Requests / Sec:** ~5000 req/sec

*Note: The redirect engine uses an in-memory LRU cache with a 30s TTL. DB checks strictly occur on cache misses. This prevents the database from bottlenecking during high traffic spikes (e.g. from social media drops).*

## Click Queue
Events are buffered in memory and flushed asynchronously.
Flush settings: `1000ms` or `50 items` (whichever hits first).
Atomic SQL increments are only issued for human clicks on URLs that have a defined click limit. All other increments are deferred and processed in bulk to save connection pool limits.
