# ── Stage 1: build Vue frontend ───────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ── Stage 2: Node.js backend + static frontend ────────────────────────────────
FROM node:20-alpine

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
RUN mkdir -p /app/data/db /app/data/files/attive /app/data/files/passive

EXPOSE 3000
CMD ["node", "src/index.js"]
