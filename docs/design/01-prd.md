# LinkPulse Product Requirements Document (PRD)

## 1. Problem
Basic shorteners map a code to a URL, but teams need links, rules, analytics, and takedown to work as one cohesive flow. When sharing links, teams need to track campaign performance, enforce access controls, and understand exactly *who* and *how* their audience interacts with the link. Currently, these capabilities are either missing, disconnected, or difficult to manage securely.

## 2. Personas
- **Visitor:** The end-user clicking the short link or scanning a QR code. Needs a fast, reliable redirect or clear instructions (e.g., password prompt, status page).
- **User:** The link owner. Needs to create short links (via a 2-step wizard), organize them with campaigns and tags, and analyze traffic patterns (excluding bots). Can only access their own data.
- **Admin:** Platform administrator. Needs to monitor the entire system, identify abuse, disable malicious links instantly, and manage blocklisted domains.

## 3. Goals and Non-Goals
### Goals
- **Working Core:** Reliable link creation and fast redirection with async click tracking.
- **Actionable Analytics:** Provide insights like period-over-period change, heatmaps, and smart alerts (e.g., link expiring soon), rather than just raw data.
- **Industry Standard Stack:** Clean, modular monolith (React, Node.js, Postgres) without over-engineering.
- **Robust Governance:** Admin controls for instant takedowns and blocklisting.

### Non-Goals
- Custom domains.
- Link-in-bio pages.
- Public API keys / Workspaces.
- Real-time WebSockets (polling is acceptable).
- Microservices, Kafka, Redis, GraphQL.

## 4. MoSCoW Scope
### Must Have
- Link creation via a 2-step wizard with validation.
- Fast redirect engine enforcing status, expiry, click limit, and password.
- Async click tracking (filtering bots).
- Roles: User and Admin. Admin disable capabilities.
- Live Analytics Dashboard.

### Should Have
- QR code generation and scan tracking.
- Campaigns and Tags for organization.
- Heatmaps, Maps (Choropleth), and Insight Cards.
- CSV Import with error reporting.

### Could Have
- Device targeting rules.
- XLSX file support for import.

### Won't Have (for this phase)
- See Non-Goals.

## 5. Success Metrics
- **Performance:** Redirect latency remains consistently low (e.g., <50ms server response).
- **Reliability:** 100% accurate rule enforcement (click limits, expiry, takedowns).
- **Usability:** Users successfully complete the 2-step creation wizard without confusion.
- **Data Integrity:** Analytics exclude 100% of identified bot traffic from primary KPIs, while keeping a record for admin review.

## 6. Risks
- **Concurrency:** Click limits being exceeded under heavy concurrent traffic. (Mitigated by atomic DB updates).
- **Performance bottleneck:** DB writes blocking redirects. (Mitigated by in-memory click queueing and batch flushing).
- **Security:** Brute forcing link passwords or generating reserved aliases. (Mitigated by rate limiting and strict alias validation).

## 7. Demo Scenarios
- **Scenario A (Link creation to analytics):** Log in → Create campaign → Wizard shows taken alias warning → Fix and create → Test short URL and QR → View dashboard KPIs, live feed, and heatmap.
- **Scenario B (Bulk import to link disable):** Import a CSV (including invalid/duplicate rows) → View error report → Log in as Admin → Disable a link with a reason → Test link to see friendly disabled page → Verify analytics remain intact.
