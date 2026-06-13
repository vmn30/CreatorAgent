#!/bin/bash
set -e

cd "$(dirname "$0")/.." || true

echo "[DEV] Starting CreatorAgent in production mode..."

# Set up database
export DATABASE_URL="file:$(pwd)/db/custom.db"
mkdir -p db

# Ensure .z-ai-config exists
[ ! -f .z-ai-config ] && [ -f /etc/.z-ai-config ] && cp /etc/.z-ai-config .z-ai-config
[ ! -f .z-ai-config ] && echo '{"baseUrl":"https://internal-api.z.ai/v1","apiKey":"Z.ai"}' > .z-ai-config

# Install deps if needed
if [ ! -d node_modules ]; then
    echo "[DEV] Installing dependencies..."
    npm install --silent 2>/dev/null || bun install 2>/dev/null
fi

# Generate Prisma client
npx prisma generate 2>/dev/null || true

# Push database schema
npx prisma db push --accept-data-loss 2>/dev/null || true

# Build if needed
if [ ! -d .next ]; then
    echo "[DEV] Building application..."
    npm run build 2>&1 | tail -5
fi

# Start in production mode (much faster than dev mode)
echo "[DEV] Starting Next.js in production mode on port 3000..."
exec npx next start -p 3000
