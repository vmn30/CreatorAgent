#!/bin/bash
set -e

echo "[Build] Starting CreatorAgent build..."

cd /home/z/my-project

# The deploy API passes BUILD_ID env variable
BUILD_ID="${BUILD_ID:-$(date +%s)}"
OUTPUT_PATH="/tmp/build_fullstack_${BUILD_ID}.tar.gz"
echo "[Build] BUILD_ID=$BUILD_ID"

# Install all dependencies (need dev deps for build)
echo "[Build] Installing dependencies..."
npm install --silent 2>/dev/null

# Ensure .z-ai-config exists
if [ ! -f .z-ai-config ]; then
  if [ -f /etc/.z-ai-config ]; then
    cp /etc/.z-ai-config .z-ai-config
  else
    echo '{"baseUrl":"https://internal-api.z.ai/v1","apiKey":"Z.ai"}' > .z-ai-config
  fi
fi

# Generate Prisma client
npx prisma generate 2>/dev/null

# Initialize database
node scripts/init-db.mjs 2>/dev/null || true

# Build Next.js
npm run build 2>&1 | tail -5

# Create minimal deployment artifact - just source code, no node_modules
# The start.sh will install deps in the deployment container
echo "[Build] Creating minimal artifact..."
BUILD_DIR="/tmp/build_fullstack_dir"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/.zscripts"
mkdir -p "$BUILD_DIR/db"
mkdir -p "$BUILD_DIR/public"
mkdir -p "$BUILD_DIR/prisma"
mkdir -p "$BUILD_DIR/scripts"
mkdir -p "$BUILD_DIR/src/app/api/agent/execute"
mkdir -p "$BUILD_DIR/src/app/api/agent/run-full"
mkdir -p "$BUILD_DIR/src/app/api/agent/start"
mkdir -p "$BUILD_DIR/src/app/api/generate-image"
mkdir -p "$BUILD_DIR/src/app/api/sessions"
mkdir -p "$BUILD_DIR/src/components/ui"
mkdir -p "$BUILD_DIR/src/lib"
mkdir -p "$BUILD_DIR/src/hooks"

# Copy built application (essential files only)
cp -r .next "$BUILD_DIR/"
cp -r public/* "$BUILD_DIR/public/"
cp -r prisma/schema.prisma "$BUILD_DIR/prisma/"
cp scripts/setup-config.mjs "$BUILD_DIR/scripts/"
cp scripts/init-db.mjs "$BUILD_DIR/scripts/"
cp package.json "$BUILD_DIR/"
cp package-lock.json "$BUILD_DIR/"
cp next.config.ts "$BUILD_DIR/"
cp .env "$BUILD_DIR/"
cp .z-ai-config "$BUILD_DIR/"

# Copy database if exists
cp db/custom.db "$BUILD_DIR/db/" 2>/dev/null || true

# Copy start script
cp .zscripts/start.sh "$BUILD_DIR/.zscripts/start.sh"

# Copy source files (needed for dev mode fallback)
cp -r src/app "$BUILD_DIR/src/"
cp -r src/components "$BUILD_DIR/src/"
cp -r src/lib "$BUILD_DIR/src/"
cp -r src/hooks "$BUILD_DIR/src/"
cp tsconfig.json "$BUILD_DIR/" 2>/dev/null || true
cp postcss.config.mjs "$BUILD_DIR/" 2>/dev/null || true
cp components.json "$BUILD_DIR/" 2>/dev/null || true
cp globals.css "$BUILD_DIR/src/app/" 2>/dev/null || true

# Create artifact WITHOUT node_modules (start.sh will install)
cd /tmp
tar -czf "$OUTPUT_PATH" -C "$BUILD_DIR" .

echo "[Build] Artifact: $OUTPUT_PATH ($(ls -lh "$OUTPUT_PATH" | awk '{print $5}'))"
echo "[Build] Done!"
