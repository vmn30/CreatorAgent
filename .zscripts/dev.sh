#!/bin/bash
cd "$(dirname "$0")/.." || true

echo "[DEV] Starting CreatorAgent..."

# Set up database
export DATABASE_URL="file:$(pwd)/db/custom.db"
mkdir -p db

# Ensure .z-ai-config exists
[ ! -f .z-ai-config ] && [ -f /etc/.z-ai-config ] && cp /etc/.z-ai-config .z-ai-config
[ ! -f .z-ai-config ] && echo '{"baseUrl":"https://internal-api.z.ai/v1","apiKey":"Z.ai"}' > .z-ai-config

# Install deps if needed (fast if already installed)
if [ ! -d node_modules ]; then
    echo "[DEV] Installing dependencies..."
    npm install --silent 2>/dev/null || bun install 2>/dev/null
fi

# Generate Prisma client
npx prisma generate 2>/dev/null || true

# Push database schema
npx prisma db push --accept-data-loss 2>/dev/null || true

# Build if .next doesn't exist
if [ ! -d .next ] || [ ! -f .next/BUILD_ID ]; then
    echo "[DEV] Building application..."
    npx next build 2>&1 | tail -5
fi

# Start in production mode (much faster than dev mode)
echo "[DEV] Starting Next.js on port 3000..."
exec npx next start -p 3000
