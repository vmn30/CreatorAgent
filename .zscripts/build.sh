#!/bin/bash
set -e

echo "[Build] Starting CreatorAgent build..."

cd /home/z/my-project

# The deploy API may pass the output path as an argument or env variable
OUTPUT_PATH="${1:-${BUILD_OUTPUT_PATH:-/tmp/build_fullstack.tar.gz}}"
echo "[Build] Output path: $OUTPUT_PATH"

# Step 1: Install all dependencies (need dev deps for build)
echo "[Build] Installing dependencies..."
npm install --silent 2>/dev/null

# Step 2: Setup SDK config
echo "[Build] Setting up SDK config..."
node scripts/setup-config.mjs 2>/dev/null || true

# Step 3: Generate Prisma client
echo "[Build] Generating Prisma client..."
npx prisma generate 2>/dev/null

# Step 4: Initialize database
echo "[Build] Initializing database..."
node scripts/init-db.mjs 2>/dev/null || true

# Step 5: Build Next.js
echo "[Build] Building Next.js..."
npm run build 2>&1 | tail -5

# Step 6: Create lean deployment artifact
echo "[Build] Creating deployment artifact..."
BUILD_DIR="/tmp/build_fullstack_dir"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/.zscripts"

# Copy built application
cp -r .next "$BUILD_DIR/"
cp -r public "$BUILD_DIR/"
cp -r prisma "$BUILD_DIR/"
cp -r scripts "$BUILD_DIR/"
mkdir -p "$BUILD_DIR/db"
cp -r db/custom.db "$BUILD_DIR/db/" 2>/dev/null || true
cp package.json "$BUILD_DIR/"
cp next.config.ts "$BUILD_DIR/"
cp .env "$BUILD_DIR/"
cp .z-ai-config "$BUILD_DIR/" 2>/dev/null || true
cp .zscripts/start.sh "$BUILD_DIR/.zscripts/start.sh"

# Install ONLY production dependencies in the build dir
cd "$BUILD_DIR"
npm install --omit=dev --silent 2>/dev/null

# Generate Prisma client in build dir
npx prisma generate 2>/dev/null

# Create the tar.gz artifact
cd /tmp
tar -czf "$OUTPUT_PATH" -C "$BUILD_DIR" .

echo "[Build] Artifact created: $OUTPUT_PATH ($(du -sh "$OUTPUT_PATH" | cut -f1))"
echo "[Build] Done!"
