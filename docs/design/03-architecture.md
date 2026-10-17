# Architecture

## Component Diagram

```mermaid
C4Context
    title Component Diagram for LinkPulse

    Person(visitor, "Visitor", "Clicks short links or scans QRs")
    Person(user, "User", "Creates and manages links")
    Person(admin, "Admin", "Manages platform abuse and domains")

    System_Boundary(linkpulse, "LinkPulse Application (Modular Monolith)") {
        Container(web, "Frontend Web App", "React + Vite + TypeScript", "Provides the UI for Users and Admins, and public status pages.")
        
        Container_Boundary(api, "Backend API (Express + Node + TS)") {
            Component(routes, "API Routes", "Express", "Handles REST requests, validation via Zod, and rate limiting.")
            Component(redirect_module, "Redirect Engine", "TypeScript", "Evaluates business rules for every link visit.")
            Component(link_cache, "Link Cache", "lru-cache", "In-memory LRU cache (30s TTL) for fast link lookups.")
            Component(click_queue, "Click Queue", "TypeScript", "In-memory buffer for async event processing.")
            Component(services, "Business Services", "TypeScript", "Handles Link, Campaign, Analytics, and Auth logic.")
        }
        
        ContainerDb(db, "Database", "PostgreSQL", "Stores Users, Links, Clicks, etc.")
    }

    System_Ext(ua_parser, "ua-parser-js", "Local Lib: parses user agent")
    System_Ext(geoip_lite, "geoip-lite", "Local Lib/DB: IP to location")
    System_Ext(isbot, "isbot", "Local Lib: detects bots")

    Rel(visitor, redirect_module, "GET /:alias", "HTTP")
    Rel(user, web, "Uses", "HTTPS")
    Rel(admin, web, "Uses", "HTTPS")
    
    Rel(web, routes, "Makes API calls", "JSON/REST")
    
    Rel(routes, services, "Delegates logic to")
    Rel(redirect_module, link_cache, "Reads/Invalidates")
    Rel(redirect_module, db, "Reads on cache miss")
    Rel(redirect_module, click_queue, "Enqueues event")
    
    Rel(click_queue, ua_parser, "Enriches UA")
    Rel(click_queue, geoip_lite, "Enriches Geo")
    Rel(click_queue, isbot, "Checks Bot")
    Rel(click_queue, db, "Batch flushes every 1s/50 items")
    
    Rel(services, db, "Prisma ORM queries")

```

## Deployment Diagram

```mermaid
C4Deployment
    title Deployment Diagram for LinkPulse

    Deployment_Node(user_device, "User Device", "Browser") {
        Container(spa, "Single Page App", "React/Vite", "Loaded by the user's browser")
    }

    Deployment_Node(cloud, "Cloud Provider (e.g. Render/Railway)") {
        Deployment_Node(web_server, "Node.js Environment", "Docker Container") {
            Container(api_server, "LinkPulse Server", "Express/Node.js", "Serves API and redirects")
        }
        Deployment_Node(db_server, "Managed Database", "PostgreSQL") {
            ContainerDb(database, "LinkPulse DB", "PostgreSQL", "Primary data store")
        }
    }

    Rel(spa, api_server, "HTTPS/REST", "Port 443")
    Rel(api_server, database, "TCP", "Port 5432")
```

## Why This Stack
- **Frontend (React + Vite + TypeScript + Tailwind):** Fast, standard, and highly productive for building interactive UIs. Tailwind enables quick styling without writing custom CSS files. Recharts and react-simple-maps allow for offline, API-free data visualization.
- **Backend (Node 20 + Express + TypeScript):** Familiar and simple. Express is lightweight and perfect for a standard REST API.
- **ORM / DB (Prisma + PostgreSQL):** Prisma provides type-safe database access, while PostgreSQL is robust, handles unique constraints perfectly, and supports the complex analytical queries needed for the dashboard.
- **In-Memory Systems (LRU Cache & Click Queue):** Using `lru-cache` and an in-memory queue avoids the overhead of managing a Redis instance. This meets the requirement of being a "clean modular monolith" without over-engineering.
- **Local Geo & Bot Parsing:** `geoip-lite`, `isbot`, and `ua-parser-js` allow us to enrich click data quickly and entirely offline, removing the need for external API dependencies and keeping redirects fast.
