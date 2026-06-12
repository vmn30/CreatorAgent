import { NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json()

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const zai = await ZAI.create()
    const response = await zai.images.generations.create({
      prompt: prompt.trim(),
      size: '1024x1024',
    })

    const imageBase64 = response.data[0]?.base64 || ''

    return NextResponse.json({ imageBase64 })
  } catch (error) {
    console.error('Failed to generate image:', error)
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 })
  }
}
