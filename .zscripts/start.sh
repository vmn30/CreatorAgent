#!/bin/bash
cd "$(dirname "$0")/.." || true

# Ensure database
export DATABASE_URL="file:$(pwd)/db/custom.db"
mkdir -p db

# Ensure .z-ai-config
if [ ! -f .z-ai-config ]; then
  [ -f /etc/.z-ai-config ] && cp /etc/.z-ai-config .z-ai-config
  [ ! -f .z-ai-config ] && echo '{"baseUrl":"https://internal-api.z.ai/v1","apiKey":"Z.ai"}' > .z-ai-config
fi

# Prisma setup
if [ -f node_modules/.bin/prisma ]; then
  npx prisma generate 2>/dev/null || true
  npx prisma db push --accept-data-loss 2>/dev/null || true
fi

# Start standalone server
PORT=3000 NODE_ENV=production exec node server.js
