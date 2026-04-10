# syntax=docker/dockerfile:1.7

# Multi-stage build for Next.js 16 (standalone) + Prisma 7 + Postgres.
# Runs `prisma migrate deploy` at container start via docker-entrypoint.sh.

ARG NODE_VERSION=22-alpine

# ─────────────────────────── base ───────────────────────────
FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache libc6-compat openssl
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

# Prisma CLI + schema + migrations — needed at startup for `migrate deploy`.
# We copy the already-installed prisma package from the deps stage rather than
# re-installing, to keep the image small and deterministic.
COPY --from=deps    --chown=nextjs:nodejs /app/node_modules/prisma             ./node_modules/prisma
COPY --from=deps    --chown=nextjs:nodejs /app/node_modules/@prisma            ./node_modules/@prisma
COPY --from=deps    --chown=nextjs:nodejs /app/node_modules/effect             ./node_modules/effect
COPY --from=deps    --chown=nextjs:nodejs /app/node_modules/fast-check         ./node_modules/fast-check
COPY --from=deps    --chown=nextjs:nodejs /app/node_modules/@standard-schema   ./node_modules/@standard-schema
COPY --from=deps    --chown=nextjs:nodejs /app/node_modules/tsx                ./node_modules/tsx
COPY --from=deps    --chown=nextjs:nodejs /app/node_modules/esbuild            ./node_modules/esbuild
COPY --from=deps    --chown=nextjs:nodejs /app/node_modules/@esbuild           ./node_modules/@esbuild
COPY --from=builder --chown=nextjs:nodejs /app/prisma                          ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts                ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/dotenv             ./node_modules/dotenv

# Entrypoint
COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
