# ──────────────────────────────────────────────
# Stage 1: Build
# ──────────────────────────────────────────────
FROM node:20-bookworm AS builder

# mediasoup native dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts=false

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src/ ./src/

RUN npx nest build

# ──────────────────────────────────────────────
# Stage 2: Production
# ──────────────────────────────────────────────
FROM node:20-bookworm-slim AS production

# Runtime dependencies for mediasoup
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts=false

COPY --from=builder /app/dist ./dist

# mediasoup RTC ports (UDP + TCP)
EXPOSE 3000
EXPOSE 40000-49999/udp
EXPOSE 40000-49999/tcp

ENV NODE_ENV=production

# Non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser
USER appuser

CMD ["node", "dist/main.js"]
