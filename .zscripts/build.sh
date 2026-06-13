#!/bin/bash
set -e

echo "[Build] Starting..."

# Install dependencies (use bun for speed, fallback to npm)
if command -v bun &> /dev/null; then
  echo "[Build] Using bun for install..."
  bun install 2>/dev/null
else
  echo "[Build] Using npm for install..."
  npm install --silent 2>/dev/null
fi

# Setup SDK config
node scripts/setup-config.mjs 2>/dev/null || true

# Generate Prisma client
npx prisma generate 2>/dev/null

# Initialize database
node scripts/init-db.mjs 2>/dev/null || true

# Build Next.js
npm run build 2>&1 | tail -5

echo "[Build] Done!"
