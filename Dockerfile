# ── Stage 1: build Vue frontend ───────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ── Stage 2: Node.js backend + static frontend ────────────────────────────────
FROM node:22-alpine

# OpenSSL needed for .p7m extraction
RUN apk add --no-cache openssl

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/src/ ./src/
COPY backend/assets/ ./assets/

# Copy built Vue app into backend/public (served as static)
COPY --from=frontend-builder /app/frontend/dist ./public

# Persistent data directories (override via volume)
# I path sono impostati qui, non solo in docker-compose: con un semplice `docker run`
# il default relativo a src/ finirebbe in /data, fuori dal volume /app/data
ENV DB_PATH=/app/data/db/fatturahub.db     FILES_PATH=/app/data/files
RUN mkdir -p /app/data/db /app/data/files

EXPOSE 5173
CMD ["node", "src/index.js"]
