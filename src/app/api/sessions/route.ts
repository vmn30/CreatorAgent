import { NextResponse } from 'next/server'
import { db, ensureDbInitialized } from '@/lib/db'

export async function GET() {
  try {
    await ensureDbInitialized()
    const sessions = await db.creationSession.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        steps: { orderBy: { createdAt: 'asc' } },
      },
    })

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Failed to fetch sessions:', error)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}
