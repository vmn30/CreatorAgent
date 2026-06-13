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

# Create artifact WITH standalone output
BUILD_DIR="/tmp/build_fullstack_dir"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copy standalone server (self-contained, includes node_modules)
rsync -a .next/standalone/ "$BUILD_DIR/"

# Copy static files that standalone needs
cp -r .next/static "$BUILD_DIR/.next/static/"

# Ensure .env
echo "DATABASE_URL=file:./db/custom.db" > "$BUILD_DIR/.env"

cd /tmp
tar -czf "$OUTPUT_PATH" -C "$BUILD_DIR" .
echo "[Build] Artifact: $OUTPUT_PATH ($(ls -lh "$OUTPUT_PATH" | awk '{print $5}'))"
echo "[Build] Done!"
