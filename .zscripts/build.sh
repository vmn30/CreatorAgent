#!/bin/bash
set -e

echo "[Build] Starting CreatorAgent build..."

cd /home/z/my-project

BUILD_ID="${BUILD_ID:-$(date +%s)}"
OUTPUT_PATH="/tmp/build_fullstack_${BUILD_ID}.tar.gz"
echo "[Build] BUILD_ID=$BUILD_ID"

# Install all dependencies
npm install --silent 2>/dev/null

# Ensure .z-ai-config
if [ ! -f .z-ai-config ]; then
  if [ -f /etc/.z-ai-config ]; then
    cp /etc/.z-ai-config .z-ai-config
  else
    echo '{"baseUrl":"https://internal-api.z.ai/v1","apiKey":"Z.ai"}' > .z-ai-config
  fi
fi

# Generate Prisma client and build
npx prisma generate 2>/dev/null
node scripts/init-db.mjs 2>/dev/null || true
npm run build 2>&1 | tail -5

# Create MINIMAL artifact - source code + build output, NO node_modules
echo "[Build] Creating minimal artifact..."
BUILD_DIR="/tmp/build_fullstack_dir"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copy everything except node_modules and large files
rsync -a --exclude='node_modules' --exclude='.git' --exclude='skills' \
  --exclude='download' --exclude='tool-results' --exclude='agent-ctx' \
  --exclude='mini-services' --exclude='examples' --exclude='.zscripts' \
  --exclude='bun.lock' \
  ./ "$BUILD_DIR/"

# Copy zscripts separately  
mkdir -p "$BUILD_DIR/.zscripts"
cp .zscripts/start.sh "$BUILD_DIR/.zscripts/start.sh"

# Create artifact
cd /tmp
tar -czf "$OUTPUT_PATH" -C "$BUILD_DIR" .

echo "[Build] Artifact: $OUTPUT_PATH ($(ls -lh "$OUTPUT_PATH" | awk '{print $5}'))"
echo "[Build] Done!"
