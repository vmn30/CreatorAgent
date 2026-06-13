#!/bin/bash

echo "[Start] CreatorAgent starting..."
cd "$(dirname "$0")/.." || cd /home/z/my-project || true
echo "[Start] PWD=$(pwd) Node=$(node --version 2>/dev/null) Bun=$(bun --version 2>/dev/null || echo N/A)"

# Ensure .z-ai-config
if [ ! -f .z-ai-config ]; then
  if [ -f /etc/.z-ai-config ]; then
    cp /etc/.z-ai-config .z-ai-config
  else
    echo '{"baseUrl":"https://internal-api.z.ai/v1","apiKey":"Z.ai"}' > .z-ai-config
  fi
fi

# Install dependencies FAST using bun (much faster than npm)
if [ ! -d node_modules ] || [ ! -f node_modules/next/package.json ]; then
  echo "[Start] Installing dependencies..."
  if command -v bun &> /dev/null; then
    bun install 2>/dev/null
  else
    npm install --silent 2>/dev/null
  fi
  echo "[Start] Dependencies installed."
fi

# Generate Prisma client if needed
if [ ! -f node_modules/.prisma/client/index.js ]; then
  npx prisma generate 2>/dev/null || true
fi

# Initialize database
mkdir -p db
export DATABASE_URL="file:$(pwd)/db/custom.db"
if [ -f scripts/init-db.mjs ]; then
  node scripts/init-db.mjs 2>/dev/null || true
else
  npx prisma db push --accept-data-loss 2>/dev/null || true
fi

# Start the app
if [ -d .next ]; then
  echo "[Start] Starting production server on :3000..."
  exec npx next start -p 3000
else
  echo "[Start] No build found, starting dev server on :3000..."
  if command -v bun &> /dev/null; then
    exec bun run dev
  else
    exec npx next dev -p 3000
  fi
fi
