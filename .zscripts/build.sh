#!/bin/bash
set -e

echo "[Build] Starting build..."

cd /home/z/my-project

BUILD_ID="${BUILD_ID:-$(date +%s)}"
OUTPUT_PATH="/tmp/build_fullstack_${BUILD_ID}.tar.gz"

# Install deps and build (for validation)
npm install --silent 2>/dev/null
npx prisma generate 2>/dev/null
npm run build 2>&1 | tail -3

# Clean up dev cache to reduce artifact size
rm -rf .next/dev .next/cache

# Create minimal source artifact - include .next build output
BUILD_DIR="/tmp/build_fullstack_dir"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

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
  --exclude='bun.lock' \
  --exclude='db/custom.db' \
  --exclude='db/custom.db-journal' \
  --exclude='*.log' \
  --exclude='Caddyfile' \
  --exclude='Dockerfile' \
  --exclude='.dockerignore' \
  --exclude='start-keepalive.sh' \
  --exclude='start-robust.sh' \
  --exclude='.next/dev' \
  --exclude='.next/cache' \
  ./ "$BUILD_DIR/"

# Ensure correct .env
echo "DATABASE_URL=file:./db/custom.db" > "$BUILD_DIR/.env"

# Create artifact
cd /tmp
tar -czf "$OUTPUT_PATH" -C "$BUILD_DIR" .

echo "[Build] Artifact: $OUTPUT_PATH ($(ls -lh "$OUTPUT_PATH" | awk '{print $5}'))"
echo "[Build] Done!"
