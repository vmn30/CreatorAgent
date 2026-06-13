#!/bin/bash
set -e
echo "[Build] Starting build..."
cd /home/z/my-project

BUILD_ID="${BUILD_ID:-$(date +%s)}"
OUTPUT_PATH="/tmp/build_fullstack_${BUILD_ID}.tar.gz"

# Build the project (creates standalone output)
npm install --silent 2>/dev/null || true
npx prisma generate 2>/dev/null || true
npm run build 2>&1 | tail -5

# Create artifact
BUILD_DIR="/tmp/build_fullstack_dir"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copy the FULL project (includes source, prisma, package.json, etc.)
rsync -a \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='skills' \
  --exclude='download' \
  --exclude='tool-results' \
  --exclude='agent-ctx' \
  --exclude='mini-services' \
  --exclude='examples' \
  --exclude='.z-ai-config' \
  --exclude='db/custom.db' \
  --exclude='db/custom.db-journal' \
  --exclude='*.log' \
  --exclude='start-keepalive.sh' \
  --exclude='start-robust.sh' \
  --exclude='watchdog.sh' \
  --exclude='Caddyfile' \
  --exclude='.next/dev' \
  --exclude='.next/cache' \
  ./ "$BUILD_DIR/"

# ALSO copy standalone server files to root (for instant startup)
# The standalone server is at .next/standalone/ with its own node_modules
# We copy server.js and its node_modules to the root so dev.sh can find them
cp .next/standalone/server.js "$BUILD_DIR/server.js" 2>/dev/null || true
cp -r .next/standalone/node_modules "$BUILD_DIR/standalone_node_modules" 2>/dev/null || true

# Ensure .env
echo "DATABASE_URL=file:./db/custom.db" > "$BUILD_DIR/.env"

cd /tmp
tar -czf "$OUTPUT_PATH" -C "$BUILD_DIR" .

SIZE=$(ls -lh "$OUTPUT_PATH" | awk '{print $5}')
echo "[Build] Artifact: $OUTPUT_PATH ($SIZE)"
echo "[Build] Done!"
