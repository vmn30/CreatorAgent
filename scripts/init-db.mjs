#!/usr/bin/env node
/**
 * Initialize the database before starting the app.
 * This ensures the SQLite database and tables exist before Next.js starts.
 */

import { mkdirSync, existsSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { execSync } from 'child_process'

const cwd = process.cwd()
const dbDir = join(cwd, 'db')
const dbPath = join(dbDir, 'custom.db')

// Step 1: Ensure db directory exists
if (!existsSync(dbDir)) {
  try {
    mkdirSync(dbDir, { recursive: true })
    console.log('[init-db] Created database directory:', dbDir)
  } catch (err) {
    console.error('[init-db] Failed to create database directory:', err.message)
  }
}

// Step 2: Set DATABASE_URL with absolute path
const absoluteDbUrl = `file:${dbPath}`
process.env.DATABASE_URL = absoluteDbUrl
console.log('[init-db] DATABASE_URL set to:', absoluteDbUrl)

// Step 3: Run prisma db push to create tables
try {
  const schemaPath = join(cwd, 'prisma', 'schema.prisma')
  if (existsSync(schemaPath)) {
    console.log('[init-db] Running prisma db push...')
    execSync(`npx prisma db push --accept-data-loss --schema="${schemaPath}"`, {
      stdio: 'pipe',
      env: { ...process.env },
      cwd,
      timeout: 30000,
    })
    console.log('[init-db] Database tables ready')
  } else {
    console.warn('[init-db] Schema file not found at:', schemaPath)
  }
} catch (err) {
  console.error('[init-db] prisma db push failed:', err.message)
  // Don't fail - the app might still work if tables already exist
}

// Step 4: Also run prisma generate to ensure client is available
try {
  console.log('[init-db] Running prisma generate...')
  execSync('npx prisma generate', {
    stdio: 'pipe',
    env: { ...process.env },
    cwd,
    timeout: 30000,
  })
  console.log('[init-db] Prisma client generated')
} catch (err) {
  console.error('[init-db] prisma generate failed:', err.message)
}

console.log('[init-db] Database initialization complete')
