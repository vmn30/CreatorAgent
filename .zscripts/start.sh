#!/bin/bash
# Ultra-simple start script - just run the dev server
cd "$(dirname "$0")/.." || true
export DATABASE_URL="file:$(pwd)/db/custom.db"
mkdir -p db

# Ensure .z-ai-config exists
[ ! -f .z-ai-config ] && [ -f /etc/.z-ai-config ] && cp /etc/.z-ai-config .z-ai-config
[ ! -f .z-ai-config ] && echo '{"baseUrl":"https://internal-api.z.ai/v1","apiKey":"Z.ai"}' > .z-ai-config

# Install deps if needed and start dev server
[ ! -d node_modules ] && npm install 2>/dev/null
npx prisma generate 2>/dev/null || true
npx prisma db push --accept-data-loss 2>/dev/null || true
exec npx next dev -p 3000
