#!/bin/sh
# Runs Prisma migrations, then hands off to the Next.js standalone server.
# Coolify injects DATABASE_URL and other secrets as env vars at runtime.

set -e

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[entrypoint] ERROR: DATABASE_URL is not set."
  exit 1
fi

echo "[entrypoint] Running prisma migrate deploy…"
node ./node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] Starting Next.js server on ${HOSTNAME:-0.0.0.0}:${PORT:-3000}"
exec "$@"
