import { PrismaClient } from '@prisma/client'
import { mkdirSync, existsSync } from 'fs'
import { join, dirname, resolve } from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Resolve the database path dynamically based on the current working directory
// This ensures the database file is always created in the right location
// regardless of where the server is started from (dev vs standalone production)
function resolveDatabasePath(): string {
  const cwd = process.cwd()
  const dbDir = join(cwd, 'db')
  const dbPath = join(dbDir, 'custom.db')

  // Ensure the db directory exists
  if (!existsSync(dbDir)) {
    try {
      mkdirSync(dbDir, { recursive: true })
      console.log(`[DB] Created database directory: ${dbDir}`)
    } catch (err) {
      console.error(`[DB] Failed to create database directory: ${dbDir}`, err)
    }
  }

  return dbPath
}

// Set DATABASE_URL before creating PrismaClient if not already set
// This overrides the .env value with a correctly resolved absolute path
function ensureDatabaseUrl() {
  const dbPath = resolveDatabasePath()
  const dbUrl = `file:${dbPath}`

  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('./')) {
    process.env.DATABASE_URL = dbUrl
    console.log(`[DB] DATABASE_URL set to: ${dbUrl}`)
  }
}

// Ensure the URL is set before creating the client
ensureDatabaseUrl()

// Create PrismaClient
function createPrismaClient() {
  return new PrismaClient({
    log: ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Verify database connection
let dbInitialized = false

export async function ensureDbInitialized() {
  if (dbInitialized) return
  try {
    await db.creationSession.count()
    dbInitialized = true
    console.log('[DB] Database connection verified')
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[DB] Database connection error:', errorMsg)

    // If the error is about missing tables, we need to initialize the database
    if (errorMsg.includes('no such table') || errorMsg.includes('does not exist')) {
      console.log('[DB] Tables not found, running prisma db push...')
      try {
        const { execSync } = await import('child_process')
        const cwd = process.cwd()
        // Find schema.prisma - it could be in prisma/ or in node_modules/.prisma/client/
        let schemaPath = join(cwd, 'prisma', 'schema.prisma')
        if (!existsSync(schemaPath)) {
          schemaPath = join(cwd, 'node_modules', '.prisma', 'client', 'schema.prisma')
        }
        console.log(`[DB] Using schema at: ${schemaPath}`)
        execSync(`npx prisma db push --accept-data-loss --schema="${schemaPath}"`, {
          stdio: 'pipe',
          env: { ...process.env },
          cwd,
          timeout: 30000,
        })
        console.log('[DB] Database tables created successfully')
      } catch (pushError) {
        console.error('[DB] prisma db push failed:', pushError)
      }
    }
    // Mark as initialized to avoid retry loops
    dbInitialized = true
  }
}
