import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await db.creationSession.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Failed to fetch session:', error)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}
