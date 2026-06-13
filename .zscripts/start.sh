#!/bin/bash
set -e

echo "[Start] =========================================="
echo "[Start] CreatorAgent Starting..."
echo "[Start] =========================================="
echo "[Start] PWD: $(pwd)"
echo "[Start] Node: $(node --version 2>/dev/null || echo 'not found')"
echo "[Start] NPM: $(npm --version 2>/dev/null || echo 'not found')"
echo "[Start] =========================================="

# Ensure we're in the right directory
cd "$(dirname "$0")/.."
echo "[Start] Working directory: $(pwd)"

# Step 1: Ensure .z-ai-config exists
echo "[Start] Setting up SDK config..."
if [ ! -f .z-ai-config ]; then
  if [ -f /etc/.z-ai-config ]; then
    cp /etc/.z-ai-config .z-ai-config
    echo "[Start] Copied .z-ai-config from /etc/"
  else
    echo '{"baseUrl":"https://internal-api.z.ai/v1","apiKey":"Z.ai"}' > .z-ai-config
    echo "[Start] Created .z-ai-config from defaults"
  fi
fi

# Step 2: Install dependencies if node_modules doesn't exist
if [ ! -d node_modules ]; then
  echo "[Start] Installing dependencies..."
  npm install --omit=dev --silent 2>/dev/null || npm install --silent 2>/dev/null || true
  echo "[Start] Dependencies installed"
else
  echo "[Start] node_modules already exists, skipping install"
fi

# Step 3: Generate Prisma client if needed
if [ ! -d node_modules/.prisma/client ]; then
  echo "[Start] Generating Prisma client..."
  npx prisma generate 2>/dev/null || true
fi

# Step 4: Ensure database exists
echo "[Start] Ensuring database..."
mkdir -p db
export DATABASE_URL="file:$(pwd)/db/custom.db"

if [ -f scripts/init-db.mjs ]; then
  node scripts/init-db.mjs 2>/dev/null || true
else
  npx prisma db push --accept-data-loss 2>/dev/null || true
fi

# Step 5: Start the application
echo "[Start] =========================================="

# Check if .next build exists
if [ -d .next ]; then
  echo "[Start] Starting Next.js production server on port 3000..."
  exec npx next start -p 3000
else
  echo "[Start] No .next build found, starting dev server on port 3000..."
  exec npx next dev -p 3000
fi
