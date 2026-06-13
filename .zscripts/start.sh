#!/bin/bash
set -e

echo "[Start] Starting CreatorAgent..."

# Setup SDK config
node scripts/setup-config.mjs 2>/dev/null || true

# Initialize database
node scripts/init-db.mjs 2>/dev/null || true

# Start Next.js
exec npx next start -p 3000
