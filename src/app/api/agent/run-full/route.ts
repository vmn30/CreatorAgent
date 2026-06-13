import { NextResponse } from 'next/server'
import { db, ensureDbInitialized } from '@/lib/db'
import { runFullWorkflow } from '@/lib/agent'

export async function POST(request: Request) {
  try {
    await ensureDbInitialized()
    const { topic } = await request.json()

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    const session = await db.creationSession.create({
      data: {
        topic: topic.trim(),
        status: 'planning',
      },
    })

    // Run the full workflow in the background
    runFullWorkflow(session.id).catch((error) => {
      console.error(`Full workflow failed for session ${session.id}:`, error)
    })

    // Return immediately with the session ID
    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Failed to start full workflow:', error)
    return NextResponse.json({ error: 'Failed to start full workflow' }, { status: 500 })
  }
}
