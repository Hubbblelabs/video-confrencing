# ──────────────────────────────────────────────
# Stage 1: Builder
# ──────────────────────────────────────────────
FROM node:22-bookworm AS builder

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY prisma ./prisma

ARG DATABASE_URL=postgresql://placeholder:placeholder@placeholder/placeholder
ENV DATABASE_URL=$DATABASE_URL

RUN npx prisma generate

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

RUN npm run build

# ──────────────────────────────────────────────
# Stage 2: Production (NO REBUILDING DEPENDENCIES)
# ──────────────────────────────────────────────
FROM node:22-bookworm-slim AS production

RUN apt-get update && apt-get install -y \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# copy EVERYTHING already built
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

EXPOSE 3000
EXPOSE 40000-49999/udp
EXPOSE 40000-49999/tcp

ENV NODE_ENV=production

RUN groupadd -r appuser && useradd -r -g appuser appuser
USER appuser

CMD ["node", "dist/main.js"]