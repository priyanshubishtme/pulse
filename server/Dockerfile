FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Copy root configurations
COPY package*.json ./
COPY server/package*.json ./server/
COPY web/package*.json ./web/

# Install dependencies needed to build both workspaces.
RUN npm install --workspace=server --workspace=web --include=dev

COPY server ./server
COPY web ./web

# Build the SPA first so the unified Express service can serve web/dist.
RUN npm run build --workspace=web

WORKDIR /app/server

# Generate prisma and build the API.
RUN npx prisma generate
RUN npm run build

# Only prod deps
RUN npm install --omit=dev

EXPOSE 3000

# Start script
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
