#!/bin/bash
set -e

echo "=== CreatorAgent Start Script ==="

# Step 1: Setup SDK config (copies from /etc/.z-ai-config or creates from env vars)
echo "[Start] Setting up Z.AI SDK config..."
node scripts/setup-config.mjs

# Step 2: Initialize database (ensures tables exist)
echo "[Start] Initializing database..."
node scripts/init-db.mjs

# Step 3: Start Next.js production server
echo "[Start] Starting Next.js on port 3000..."
exec npx next start -p 3000
