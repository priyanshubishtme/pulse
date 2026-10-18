FROM node:22-alpine

WORKDIR /app

# Copy root configurations
COPY package*.json ./
COPY server/package*.json ./server/
COPY web/package*.json ./web/

# Install dependencies (only server)
RUN npm install --workspace=server --include=dev

COPY server ./server

WORKDIR /app/server

# Generate prisma and build
RUN npx prisma generate
RUN npm run build

# Only prod deps
RUN npm install --omit=dev

EXPOSE 3000

# Start script
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
