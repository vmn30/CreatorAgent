#!/bin/bash
set -e

echo "[Build] Starting CreatorAgent build..."

cd /home/z/my-project

# The deploy API passes BUILD_ID env variable
BUILD_ID="${BUILD_ID:-$(date +%s)}"
OUTPUT_PATH="/tmp/build_fullstack_${BUILD_ID}.tar.gz"
echo "[Build] BUILD_ID=$BUILD_ID, Output: $OUTPUT_PATH"

# Step 1: Install all dependencies
echo "[Build] Installing dependencies..."
npm install --silent 2>/dev/null

# Step 2: Ensure .z-ai-config exists (copy from /etc/ if needed)
if [ ! -f .z-ai-config ]; then
  if [ -f /etc/.z-ai-config ]; then
    cp /etc/.z-ai-config .z-ai-config
  else
    echo '{"baseUrl":"https://internal-api.z.ai/v1","apiKey":"Z.ai"}' > .z-ai-config
  fi
fi

# Step 3: Generate Prisma client
echo "[Build] Generating Prisma client..."
npx prisma generate 2>/dev/null

# Step 4: Initialize database
echo "[Build] Initializing database..."
node scripts/init-db.mjs 2>/dev/null || true

# Step 5: Build Next.js
echo "[Build] Building Next.js..."
npm run build 2>&1 | tail -5

# Step 6: Create deployment artifact
echo "[Build] Creating deployment artifact..."
BUILD_DIR="/tmp/build_fullstack_dir"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/.zscripts"
mkdir -p "$BUILD_DIR/db"

# Copy built application
cp -r .next "$BUILD_DIR/"
cp -r public "$BUILD_DIR/"
cp -r prisma "$BUILD_DIR/"
cp -r scripts "$BUILD_DIR/"
cp package.json "$BUILD_DIR/"
cp next.config.ts "$BUILD_DIR/"
cp .env "$BUILD_DIR/"
cp .z-ai-config "$BUILD_DIR/"

# Copy database if exists
cp db/custom.db "$BUILD_DIR/db/" 2>/dev/null || true

# Copy start script
cp .zscripts/start.sh "$BUILD_DIR/.zscripts/start.sh"

# Install ONLY production dependencies
cd "$BUILD_DIR"
npm install --omit=dev --silent 2>/dev/null

# Generate Prisma client
npx prisma generate 2>/dev/null

# Create artifact
cd /tmp
tar -czf "$OUTPUT_PATH" -C "$BUILD_DIR" .

echo "[Build] Artifact: $OUTPUT_PATH ($(ls -lh "$OUTPUT_PATH" | awk '{print $5}'))"
echo "[Build] Done!"
