# Deployment Guide

The app is built as a modular monolith but is designed to be deployed cleanly. The database connection and secrets are all provided via environment variables.

## Environment Variables Needed
- `DATABASE_URL`: A PostgreSQL connection string
- `JWT_SECRET`: Random long string for session security
- `SERVER_SALT`: Random long string used with IP and user-agent data to create daily visitor hashes
- `APP_URL`: Frontend origin used for status and password-unlock redirects (e.g. `https://app.linkpulse.dev`)
- `VITE_PUBLIC_BASE_URL`: Frontend build-time value for copied short links and QR payloads; set it to the public short-link server/domain that serves `/:alias` and `/qr/:alias` (e.g. `https://go.linkpulse.dev`)
- `PORT`: (Server only) usually 3000

## Deploying the Server (e.g., Render or Railway)
1. Provide the environment variables.
2. In the platform, specify the `server/Dockerfile` path to build the container.
3. The Dockerfile will automatically build the code and run `npx prisma migrate deploy` upon startup.
4. Scale as needed.

## Deploying the Frontend (e.g., Vercel or Netlify)
1. Base Directory: `web`
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Set `VITE_PUBLIC_BASE_URL` during the frontend build to your public short-link origin. Configure rewrites/proxying for `/api` traffic and set the server's `APP_URL` to the deployed frontend origin. For example, in Vercel `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://your-server-url.com/api/$1" }
  ]
}
```
