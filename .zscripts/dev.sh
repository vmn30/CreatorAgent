#!/bin/bash
cd "$(dirname "$0")/.." || true

echo "[DEV] Starting CreatorAgent..."

# Setup environment
export DATABASE_URL="file:$(pwd)/db/custom.db"
mkdir -p db

# Ensure .z-ai-config
if [ ! -f .z-ai-config ]; then
  [ -f /etc/.z-ai-config ] && cp /etc/.z-ai-config .z-ai-config
  [ ! -f .z-ai-config ] && echo '{"baseUrl":"https://internal-api.z.ai/v1","apiKey":"Z.ai"}' > .z-ai-config
fi

# Install deps for prisma CLI
if [ ! -d node_modules ] || [ ! -f node_modules/.bin/prisma ]; then
  echo "[DEV] Installing dependencies..."
  bun install 2>/dev/null || npm install --silent 2>/dev/null
fi

# Setup database
npx prisma generate 2>/dev/null || true
npx prisma db push --accept-data-loss 2>/dev/null || true

# Start standalone server (0ms startup!)
if [ -f server.js ]; then
  echo "[DEV] Starting standalone server (instant startup)..."
  # Use standalone node_modules if available
  if [ -d standalone_node_modules ]; then
    export NODE_PATH="$(pwd)/standalone_node_modules"
  fi
  PORT=3000 exec node server.js
elif [ -f .next/standalone/server.js ]; then
  echo "[DEV] Starting standalone server from .next/standalone..."
  cd .next/standalone
  PORT=3000 exec node server.js
else
  echo "[DEV] No standalone build, running next dev..."
  exec npx next dev -p 3000
fi
