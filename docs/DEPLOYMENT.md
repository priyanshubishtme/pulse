# Deployment Guide

The app is built as a modular monolith but is designed to be deployed cleanly. The database connection and secrets are all provided via environment variables.

## Environment Variables Needed
- `DATABASE_URL`: A PostgreSQL connection string
- `JWT_SECRET`: Random long string for session security
- `SERVER_SALT`: Random long string for hashing visitor IPs
- `PUBLIC_BASE_URL`: The URL where your frontend is hosted (e.g. `https://app.linkpulse.dev`)
- `APP_URL`: Same as PUBLIC_BASE_URL for redirection links
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
4. Make sure to configure rewrites on Vercel/Netlify if you are routing `/api` traffic to the server. For example, in Vercel `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://your-server-url.com/api/$1" }
  ]
}
```
