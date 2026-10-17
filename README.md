# LinkPulse

A powerful URL shortener engineered with an emphasis on **governance** and **actionable analytics**. It goes beyond simple redirection by offering full control over link lifecycles (click limits, expiries, passwords) and surfacing traffic insights without compromising user privacy.

## Features

- **Link Governance:** Set click limits, expiry dates, and password protection on individual links.
- **Admin Controls:** Platform-wide blocklisting for abusive domains and immediate link takedowns.
- **Advanced Analytics:** Zero-filled time series, device/browser/OS breakdowns, and global Geo-mapping.
- **Bot Filtering:** Automatically filters out bot traffic from KPI metrics to keep reporting accurate.
- **Campaigns & Tags:** Organize your links into campaigns to track aggregate performance across specific events.
- **QR Code Designer:** Generate and customize QR codes strictly on the client without sending link data to third parties.
- **Bulk CSV Import:** Upload spreadsheets of URLs and seamlessly bulk-generate aliases with validation handling.

## Tech Stack

This project is built as a **Clean Modular Monolith** optimized for developer familiarity and production reliability.

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, TanStack Query, Recharts.
- **Backend:** Node.js (v20), Express, TypeScript.
- **Database / ORM:** PostgreSQL + Prisma.
- **Core Libs:** `lru-cache` (in-memory lookup), `isbot` & `ua-parser-js` (event enrichment), `bcrypt` & `jsonwebtoken` (auth).

## System Architecture

LinkPulse operates on a fast, synchronous redirect path paired with an asynchronous analytics queue:
1. When a user requests a short link (`GET /:alias`), the redirect engine queries a fast **LRU Cache**.
2. A strict **Rule Engine** evaluates the link state (Status, Expiry, Click Limit, Password, Blocklist).
3. If valid, the user is redirected via HTTP 302.
4. The event is enriched (IP to Geo, User Agent parsing, Bot checking) and pushed to an **In-Memory Queue**.
5. The queue bulk-flushes to the PostgreSQL database every 1 second or 50 items, ensuring redirects are never blocked by heavy database writes.

## Repository Structure (Monorepo)

- `/web` - The React Vite Frontend application.
- `/server` - The Express API, Redirect Engine, and Prisma schemas.
- `/docs/design` - Pre-build architecture specs (PRD, ERD, Sequence Diagrams).
- `/docs/final` - Post-build technical specifications (API, Algorithms, Queries, SRS).

## Local Workflow

To run LinkPulse locally:

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start the Database:**
   Ensure Docker is running, then:
   ```bash
   docker compose up -d
   ```
   *(If you are in an environment without Docker, install PostgreSQL locally and ensure your `.env` points to it)*

3. **Migrate and Seed:**
   ```bash
   cp .env.example .env
   cp .env.example server/.env
   cd server
   npx prisma migrate dev
   npx prisma db seed
   cd ..
   ```
   *(The seed script populates the database with an Admin, Users, Campaigns, and ~3,000 realistic historical click events for the analytics dashboard).*

4. **Start the Development Server:**
   ```bash
   npm run dev &
   ```
   The backend API runs on `http://localhost:3000` and the frontend runs on `http://localhost:5173`.
