#!/bin/bash
cd "$(dirname "$0")/.." || true

export DATABASE_URL="file:$(pwd)/db/custom.db"
mkdir -p db

# Ensure .z-ai-config
[ ! -f .z-ai-config ] && [ -f /etc/.z-ai-config ] && cp /etc/.z-ai-config .z-ai-config
[ ! -f .z-ai-config ] && echo '{"baseUrl":"https://internal-api.z.ai/v1","apiKey":"Z.ai"}' > .z-ai-config

# Quick setup
[ ! -d node_modules ] && { echo "[DEV] Installing deps..."; npm install --silent 2>/dev/null || bun install 2>/dev/null; }
npx prisma generate 2>/dev/null || true
npx prisma db push --accept-data-loss 2>/dev/null || true

# Start Next.js - prefer production mode if .next exists
if [ -f .next/BUILD_ID ]; then
    echo "[DEV] Starting in production mode..."
    exec npx next start -p 3000
else
    echo "[DEV] No build found, starting in dev mode..."
    exec npx next dev -p 3000
fi
