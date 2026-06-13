#!/bin/bash
set -e

echo "=== CreatorAgent Build Script ==="

# Step 1: Install dependencies
echo "[Build] Installing dependencies..."
npm install

# Step 2: Setup SDK config
echo "[Build] Setting up Z.AI SDK config..."
node scripts/setup-config.mjs

# Step 3: Generate Prisma client
echo "[Build] Generating Prisma client..."
npx prisma generate

# Step 4: Initialize database
echo "[Build] Initializing database..."
node scripts/init-db.mjs

# Step 5: Build Next.js
echo "[Build] Building Next.js application..."
npm run build

echo "=== Build Complete ==="
