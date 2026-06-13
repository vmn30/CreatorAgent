import { NextResponse } from 'next/server'
import { db, ensureDbInitialized } from '@/lib/db'
import { executeStep } from '@/lib/agent'
import { STEP_ORDER, STATUS_AFTER_STEP, type StepType, type SessionStatus } from '@/lib/agent-types'

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

    // Return immediately with the session ID
    // Frontend will poll /api/agent/execute to run steps one at a time
    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Failed to create session:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
