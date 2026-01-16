FROM node:20-alpine AS base

# 1. Build Client
FROM base AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npm run build

# 2. Build Server
FROM base AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ .
RUN npm run build

# 3. Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=server-builder /app/server/package*.json ./
RUN npm ci --production

COPY --from=server-builder /app/server/dist ./dist
COPY --from=client-builder /app/client/dist ./public

ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/index.js"]
