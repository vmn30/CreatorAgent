import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
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

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Failed to start session:', error)
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500 })
  }
}
