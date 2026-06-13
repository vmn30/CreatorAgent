#!/bin/bash
set -e

echo "[Start] Starting CreatorAgent..."

# Ensure .z-ai-config exists (SDK needs this)
if [ ! -f .z-ai-config ]; then
  if [ -f /etc/.z-ai-config ]; then
    cp /etc/.z-ai-config .z-ai-config
    echo "[Start] Copied .z-ai-config from /etc/"
  else
    # Create minimal config for the platform's internal API
    echo '{"baseUrl":"https://internal-api.z.ai/v1","apiKey":"Z.ai"}' > .z-ai-config
    echo "[Start] Created .z-ai-config from defaults"
  fi
fi

# Ensure database directory exists
mkdir -p db

# Ensure DATABASE_URL is set
export DATABASE_URL="file:$(pwd)/db/custom.db"

# Initialize database if needed
if [ -f scripts/init-db.mjs ]; then
  node scripts/init-db.mjs 2>/dev/null || true
else
  # If init-db.mjs is not available, try prisma directly
  npx prisma db push --accept-data-loss 2>/dev/null || true
fi

# Start Next.js production server
echo "[Start] Starting Next.js on port 3000..."
exec npx next start -p 3000
