#!/bin/bash
cd "$(dirname "$0")/.." || true

# Setup environment
export DATABASE_URL="file:$(pwd)/db/custom.db"
mkdir -p db

# Ensure .z-ai-config
if [ ! -f .z-ai-config ]; then
  [ -f /etc/.z-ai-config ] && cp /etc/.z-ai-config .z-ai-config
  [ ! -f .z-ai-config ] && echo '{"baseUrl":"https://internal-api.z.ai/v1","apiKey":"Z.ai"}' > .z-ai-config
fi

# Install deps (use bun for speed)
if [ ! -d node_modules ]; then
  echo "[DEV] Installing dependencies with bun..."
  bun install 2>/dev/null || npm install --silent 2>/dev/null
fi

# Prisma setup
npx prisma generate 2>/dev/null || true
npx prisma db push --accept-data-loss 2>/dev/null || true

# Start Next.js (prefer production mode if .next exists)
if [ -f .next/BUILD_ID ]; then
  echo "[DEV] Starting in production mode..."
  exec npx next start -p 3000
else
  echo "[DEV] Building first, then starting..."
  npx next build 2>&1 | tail -5
  exec npx next start -p 3000
fi
