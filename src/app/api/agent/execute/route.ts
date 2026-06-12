import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { executeStep, getNextStep } from '@/lib/agent'

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const session = await db.creationSession.findUnique({
      where: { id: sessionId },
      include: { steps: true },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.status === 'completed') {
      return NextResponse.json({ error: 'Session already completed' }, { status: 400 })
    }

    if (session.status === 'failed') {
      return NextResponse.json({ error: 'Session has failed' }, { status: 400 })
    }

    const nextStep = getNextStep(session.status)
    if (!nextStep) {
      return NextResponse.json({ error: 'No next step available' }, { status: 400 })
    }

    await executeStep(sessionId, nextStep)

    const updatedSession = await db.creationSession.findUnique({
      where: { id: sessionId },
      include: { steps: { orderBy: { createdAt: 'desc' } } },
    })

    return NextResponse.json({
      step: updatedSession?.steps[0],
      session: updatedSession,
    })
  } catch (error) {
    console.error('Failed to execute step:', error)
    return NextResponse.json({ error: 'Failed to execute step' }, { status: 500 })
  }
}
