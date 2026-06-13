#!/bin/bash

echo "[Start] ==========================================="
echo "[Start] CreatorAgent Starting..."
echo "[Start] PWD=$(pwd)"
echo "[Start] Node=$(node --version 2>/dev/null || echo N/A)"
echo "[Start] NPM=$(npm --version 2>/dev/null || echo N/A)"
echo "[Start] ==========================================="

cd "$(dirname "$0")/.." || cd /home/z/my-project || true
echo "[Start] Working dir: $(pwd)"
echo "[Start] Files: $(ls -la | head -10)"

# Step 1: Ensure .z-ai-config
if [ ! -f .z-ai-config ]; then
  if [ -f /etc/.z-ai-config ]; then
    cp /etc/.z-ai-config .z-ai-config
    echo "[Start] Copied .z-ai-config from /etc/"
  else
    echo '{"baseUrl":"https://internal-api.z.ai/v1","apiKey":"Z.ai"}' > .z-ai-config
    echo "[Start] Created default .z-ai-config"
  fi
fi

# Step 2: Install dependencies if needed
if [ ! -d node_modules ] || [ ! -d node_modules/next ]; then
  echo "[Start] Installing dependencies (this may take a minute)..."
  npm install 2>&1 | tail -3 || {
    echo "[Start] npm install failed, trying with --legacy-peer-deps..."
    npm install --legacy-peer-deps 2>&1 | tail -3 || true
  }
  echo "[Start] Dependencies installed."
fi

# Step 3: Generate Prisma client
if [ ! -f node_modules/.prisma/client/index.js ]; then
  echo "[Start] Generating Prisma client..."
  npx prisma generate 2>&1 | tail -3 || true
fi

# Step 4: Initialize database
mkdir -p db
export DATABASE_URL="file:$(pwd)/db/custom.db"
echo "[Start] DATABASE_URL=$DATABASE_URL"

if [ -f scripts/init-db.mjs ]; then
  node scripts/init-db.mjs 2>&1 | tail -5 || true
else
  npx prisma db push --accept-data-loss 2>&1 | tail -3 || true
fi

# Step 5: Build if .next doesn't exist
if [ ! -d .next ]; then
  echo "[Start] No .next build found, building now..."
  npm run build 2>&1 | tail -5 || true
fi

# Step 6: Start the app
echo "[Start] ==========================================="
if [ -d .next ]; then
  echo "[Start] Starting Next.js production server on port 3000..."
  exec npx next start -p 3000
else
  echo "[Start] Starting Next.js dev server on port 3000..."
  exec npx next dev -p 3000
fi
