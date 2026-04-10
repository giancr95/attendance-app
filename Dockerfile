# syntax=docker/dockerfile:1.7

# Multi-stage build for Next.js 16 (standalone) + Prisma 7 + Postgres.
# Runs `prisma migrate deploy` at container start via docker-entrypoint.sh.

ARG NODE_VERSION=22-alpine

# ─────────────────────────── base ───────────────────────────
FROM node:${NODE_VERSION} AS base
# python3 + pyzk are needed at runtime by scripts/zk-bridge.py — the Node
# zklib forks all fail on this device's firmware, so we shell out to Python.
RUN apk add --no-cache libc6-compat openssl python3 py3-pip \
 && pip3 install --break-system-packages --no-cache-dir pyzk
WORKDIR /app

# ─────────────────────────── deps ───────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ────────────────────────── builder ─────────────────────────
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma 7 client is generated into src/generated/prisma (see schema.prisma)
RUN npx --yes prisma generate
RUN npm run build

# ────────────────────────── runner ──────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Next.js standalone server output (minimal node_modules + server.js)
COPY --from=builder --chown=nextjs:nodejs /app/public            ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone  ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static      ./.next/static

# Prisma CLI + all its transitive deps — install fresh to avoid missing modules.
COPY --from=builder --chown=nextjs:nodejs /app/prisma                      ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts            ./prisma.config.ts
RUN npm install --no-save prisma@latest @prisma/config dotenv tsx esbuild 2>/dev/null

# Python bridge for ZKTeco device communication. The Next.js sync server
# action spawns this script at runtime via child_process.
COPY --from=builder --chown=nextjs:nodejs /app/scripts                     ./scripts

# Entrypoint
COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
