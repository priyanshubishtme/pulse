# LinkPulse

A URL shortener with governance and analytics.

## Setup
1. `docker compose up -d`
2. `cp .env.example .env` in the root (and subfolders as needed if you split them, but we will use the same vars)
3. `cd server && npx prisma migrate dev && npx prisma db seed`
4. `npm run dev` at the root.
