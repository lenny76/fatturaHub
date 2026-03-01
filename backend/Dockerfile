FROM node:20-alpine

# Install OpenSSL for p7m extraction
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/
COPY assets/ ./assets/

# Create data directories
RUN mkdir -p /app/data/db /app/data/files/attive /app/data/files/passive

EXPOSE 3000

CMD ["node", "src/index.js"]
