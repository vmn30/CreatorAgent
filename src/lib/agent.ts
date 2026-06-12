import ZAI from 'z-ai-web-dev-sdk'
import { db } from './db'
import { type StepType, type SessionStatus, STEP_ORDER, STATUS_AFTER_STEP } from './agent-types'

// WebSocket notification helper - uses socket.io-client to connect to WS server
import { io as socketIOClient } from 'socket.io-client'

let wsClient: ReturnType<typeof socketIOClient> | null = null

function getWSClient() {
  if (!wsClient) {
    wsClient = socketIOClient('http://localhost:3003', {
      path: '/',
      transports: ['websocket'],
    })
    wsClient.on('connect', () => {
      console.log('Agent WS client connected')
    })
    wsClient.on('disconnect', () => {
      console.log('Agent WS client disconnected')
    })
  }
  return wsClient
}

async function notifyWS(sessionId: string, event: string, data: unknown) {
  try {
    const client = getWSClient()
    client.emit('server-emit', { sessionId, event, payload: data })
  } catch {
    // WebSocket notification is best-effort
    console.log(`WS notify: ${event} for session ${sessionId}`)
  }
}

// Generate random hex string
function randomHex(length: number): string {
  const chars = '0123456789abcdef'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

// Strip markdown code blocks from LLM output
function stripCodeBlocks(text: string): string {
  // Remove ```json ... ``` or ``` ... ``` wrappers
  let result = text.trim()
  // Match code block at the start and end of the string
  const codeBlockMatch = result.match(/^```(?:json|javascript|js|typescript)?\s*\n([\s\S]*?)\n?```\s*$/)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }
  // Fallback: remove individual code fence markers
  result = result.replace(/^```(?:json|javascript|js|typescript)?\s*\n?/gm, '')
  result = result.replace(/\n?```\s*$/gm, '')
  return result.trim()
}

// Try to parse JSON from LLM output, handling code blocks
function tryParseJSON(text: string): unknown {
  const stripped = stripCodeBlocks(text)
  try {
    return JSON.parse(stripped)
  } catch {
    return null
  }
}

// Create an agent step record
async function createStep(sessionId: string, stepType: StepType, input?: unknown) {
  return db.agentStep.create({
    data: {
      sessionId,
      stepType,
      status: 'pending',
      input: input ? JSON.stringify(input) : null,
    },
  })
}

// Update an agent step
async function updateStep(
  stepId: string,
  data: { status?: string; output?: unknown; toolCalls?: unknown; completedAt?: Date }
) {
  return db.agentStep.update({
    where: { id: stepId },
    data: {
      ...data,
      output: data.output ? JSON.stringify(data.output) : undefined,
      toolCalls: data.toolCalls ? JSON.stringify(data.toolCalls) : undefined,
    },
  })
}

// Execute a single agent step
export async function executeStep(sessionId: string, stepType: StepType): Promise<void> {
  const session = await db.creationSession.findUnique({
    where: { id: sessionId },
    include: { steps: true },
  })
  if (!session) throw new Error(`Session ${sessionId} not found`)

  const step = await createStep(sessionId, stepType, { topic: session.topic })
  const stepId = step.id

  // Mark step as running
  await updateStep(stepId, { status: 'running', startedAt: new Date() })
  await db.creationSession.update({
    where: { id: sessionId },
    data: { status: stepType === 'plan' ? 'planning' : `${stepType}ing` as SessionStatus },
  })

  await notifyWS(sessionId, 'step-started', { sessionId, stepType, stepId })

  try {
    const zai = await ZAI.create()
    let output: unknown
    let toolCalls: unknown[] = []

    switch (stepType) {
      case 'plan': {
        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are a content planning agent. Given a topic, break it down into a detailed research and writing plan. Output ONLY a valid JSON object (no markdown code blocks) with: researchQueries (array of 3-5 search queries), outlineStructure (array of section titles), targetAudience, keyThemes. Be specific and thorough.',
            },
            { role: 'user', content: session.topic },
          ],
        })
        output = completion.choices[0]?.message?.content || '{}'
        toolCalls = [{ tool: 'glm-5.1-chat', purpose: 'Generate content plan' }]

        // Parse and store plan
        await db.creationSession.update({
          where: { id: sessionId },
          data: { plan: typeof output === 'string' ? output : JSON.stringify(output) },
        })
        break
      }

      case 'research': {
        const planData = session.plan ? (tryParseJSON(session.plan) as Record<string, unknown>) || {} : {}
        const queries = (planData.researchQueries as string[]) || [session.topic]
        const researchResults: Array<{ query: string; results: unknown }> = []

        for (const query of queries.slice(0, 3)) {
          try {
            const searchResult = await zai.functions.invoke('web_search', {
              query,
              num: 5,
            })
            researchResults.push({ query, results: searchResult })
            toolCalls.push({ tool: 'web_search', query, resultCount: Array.isArray(searchResult) ? searchResult.length : 0 })

            await notifyWS(sessionId, 'step-progress', {
              sessionId,
              stepType,
              message: `Researched: "${query}"`,
            })
          } catch (err) {
            console.error(`Search failed for query "${query}":`, err)
            researchResults.push({ query, results: { error: 'Search failed' } })
            toolCalls.push({ tool: 'web_search', query, error: 'Search failed' })
          }
        }

        // Summarize research
        const researchSummary = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are a research synthesis agent. Given search results, create a comprehensive research summary with key findings, statistics, and insights that will inform article writing. Be thorough and factual.',
            },
            {
              role: 'user',
              content: `Topic: ${session.topic}\n\nResearch data: ${JSON.stringify(researchResults, null, 2)}`,
            },
          ],
        })
        output = researchSummary.choices[0]?.message?.content || ''
        toolCalls.push({ tool: 'glm-5.1-chat', purpose: 'Synthesize research findings' })
        break
      }

      case 'outline': {
        const planData = session.plan ? (tryParseJSON(session.plan) as Record<string, unknown>) || {} : {}
        const latestSteps = session.steps.filter((s) => s.stepType === 'research')
        const researchOutput = latestSteps.length > 0 && latestSteps[latestSteps.length - 1].output
          ? latestSteps[latestSteps.length - 1].output
          : ''

        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are an article outlining agent. Create a detailed, structured article outline. Output ONLY valid JSON (no markdown code blocks) with: title (string), sections (array of objects with: sectionTitle, keyPoints (array of strings), estimatedWordCount). Each section should have 3-5 key points. Target 6-8 sections for a comprehensive article.',
            },
            {
              role: 'user',
              content: `Topic: ${session.topic}\nPlan: ${JSON.stringify(planData)}\nResearch findings: ${researchOutput}`,
            },
          ],
        })
        output = completion.choices[0]?.message?.content || '{}'
        toolCalls = [{ tool: 'glm-5.1-chat', purpose: 'Generate article outline' }]

        await db.creationSession.update({
          where: { id: sessionId },
          data: { outline: typeof output === 'string' ? output : JSON.stringify(output) },
        })
        break
      }

      case 'write': {
        const outlineData = session.outline ? (tryParseJSON(session.outline) as Record<string, unknown>) || {} : {}
        const researchSteps = session.steps.filter((s) => s.stepType === 'research')
        const researchOutput = researchSteps.length > 0 && researchSteps[researchSteps.length - 1].output
          ? researchSteps[researchSteps.length - 1].output
          : ''

        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are an expert article writing agent. Write a comprehensive, well-structured, and engaging research article in markdown format. The article should be detailed (800+ words per major section), include data points from research, and be written in an authoritative yet accessible tone. Include a compelling introduction and a forward-looking conclusion. Use markdown formatting with headers (##, ###), bullet points, and emphasis where appropriate.',
            },
            {
              role: 'user',
              content: `Topic: ${session.topic}\n\nOutline: ${typeof outlineData === 'string' ? outlineData : JSON.stringify(outlineData)}\n\nResearch findings: ${researchOutput}\n\nWrite the complete article now.`,
            },
          ],
        })
        output = completion.choices[0]?.message?.content || ''
        toolCalls = [{ tool: 'glm-5.1-chat', purpose: 'Write full article content' }]

        await notifyWS(sessionId, 'step-progress', {
          sessionId,
          stepType,
          message: 'Article draft completed',
        })
        break
      }

      case 'illustrate': {
        // Generate cover image
        try {
          const coverResponse = await zai.images.generations.create({
            prompt: `A stunning, professional cover image for a research article about: ${session.topic}. Modern, clean design with abstract elements. High quality, editorial style.`,
            size: '1024x1024',
          })
          const coverBase64 = coverResponse.data[0]?.base64 || ''
          toolCalls.push({ tool: 'image-generation', purpose: 'Generate cover image', size: '1024x1024' })

          await db.creationSession.update({
            where: { id: sessionId },
            data: { coverImage: coverBase64 },
          })

          await notifyWS(sessionId, 'step-progress', {
            sessionId,
            stepType,
            message: 'Cover image generated',
          })

          output = { coverImageGenerated: true, imageCount: 1 }
        } catch (err) {
          console.error('Image generation failed:', err)
          toolCalls.push({ tool: 'image-generation', purpose: 'Generate cover image', error: 'Failed' })
          output = { coverImageGenerated: false, error: 'Image generation failed' }
        }
        break
      }

      case 'review': {
        const writeSteps = session.steps.filter((s) => s.stepType === 'write')
        const articleContent = writeSteps.length > 0 && writeSteps[writeSteps.length - 1].output
          ? writeSteps[writeSteps.length - 1].output
          : ''

        const reviewCompletion = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are an article review agent. Review the given article for: 1) Quality and depth of content, 2) Logical flow and structure, 3) Factual consistency, 4) Writing quality and readability, 5) Completeness of coverage. Provide specific feedback and a quality score (1-10). If the score is below 7, suggest specific improvements. Output ONLY valid JSON (no markdown code blocks) with: score, feedback (array of strings), improvements (array of strings), approved (boolean).',
            },
            {
              role: 'user',
              content: `Review this article about "${session.topic}":\n\n${typeof articleContent === 'string' ? articleContent : JSON.stringify(articleContent)}`,
            },
          ],
        })

        const reviewResult = reviewCompletion.choices[0]?.message?.content || '{}'
        toolCalls = [{ tool: 'glm-5.1-chat', purpose: 'Review article quality' }]

        output = reviewResult
        break
      }

      case 'format': {
        const writeSteps = session.steps.filter((s) => s.stepType === 'write')
        let articleContent = writeSteps.length > 0 && writeSteps[writeSteps.length - 1].output
          ? writeSteps[writeSteps.length - 1].output
          : ''

        const formatCompletion = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are a content formatting agent. Take the given article content and format it into a polished, publication-ready markdown document. Ensure: proper heading hierarchy, consistent formatting, add a title at the top (## Title), add section dividers where appropriate, clean up any formatting issues, and add a brief author bio line at the end crediting "CreatorAgent AI". Output ONLY the formatted markdown.',
            },
            {
              role: 'user',
              content: `Format this article:\n\n${typeof articleContent === 'string' ? articleContent : JSON.stringify(articleContent)}`,
            },
          ],
        })

        const formattedContent = formatCompletion.choices[0]?.message?.content || ''
        toolCalls = [{ tool: 'glm-5.1-chat', purpose: 'Format and polish article' }]

        output = formattedContent
        await db.creationSession.update({
          where: { id: sessionId },
          data: { content: formattedContent },
        })
        break
      }

      case 'publish': {
        const contractAddr = '0x' + randomHex(40)
        const txHash = '0x' + randomHex(64)
        const nftTokenId = String(Math.floor(Math.random() * 1000000) + 1)

        await db.creationSession.update({
          where: { id: sessionId },
          data: {
            contractAddr,
            txHash,
            nftTokenId,
            status: 'completed',
          },
        })

        output = { contractAddr, txHash, nftTokenId }
        toolCalls = [{ tool: 'on-chain-publish', purpose: 'Simulate on-chain publication', contractAddr, txHash }]
        break
      }
    }

    // Mark step as completed
    await updateStep(stepId, {
      status: 'completed',
      output,
      toolCalls,
      completedAt: new Date(),
    })

    // Update session status
    const nextStatus = STATUS_AFTER_STEP[stepType]
    if (nextStatus !== 'completed') {
      await db.creationSession.update({
        where: { id: sessionId },
        data: { status: nextStatus },
      })
    }

    await notifyWS(sessionId, 'step-completed', {
      sessionId,
      stepType,
      stepId,
      outputSummary: typeof output === 'string' ? output.substring(0, 200) + '...' : JSON.stringify(output).substring(0, 200) + '...',
    })

    if (stepType === 'publish') {
      await notifyWS(sessionId, 'session-completed', {
        sessionId,
        contractAddr: (output as { contractAddr: string })?.contractAddr,
        txHash: (output as { txHash: string })?.txHash,
      })
    }
  } catch (error) {
    console.error(`Step ${stepType} failed for session ${sessionId}:`, error)

    await updateStep(stepId, {
      status: 'failed',
      output: { error: String(error) },
      completedAt: new Date(),
    })

    await db.creationSession.update({
      where: { id: sessionId },
      data: { status: 'failed' },
    })

    await notifyWS(sessionId, 'step-failed', {
      sessionId,
      stepType,
      stepId,
      error: String(error),
    })

    throw error
  }
}

// Run the full agent workflow
export async function runFullWorkflow(sessionId: string): Promise<void> {
  await notifyWS(sessionId, 'session-created', { sessionId })

  for (const stepType of STEP_ORDER) {
    try {
      await executeStep(sessionId, stepType)
      // Small delay between steps for visual effect
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (error) {
      console.error(`Workflow stopped at step ${stepType}:`, error)
      break
    }
  }
}

// Get the next step type based on current session status
export function getNextStep(currentStatus: string): StepType | null {
  const statusToStep: Record<string, StepType> = {
    planning: 'plan',
    researching: 'research',
    outlining: 'outline',
    writing: 'write',
    illustrating: 'illustrate',
    reviewing: 'review',
    formatting: 'format',
    publishing: 'publish',
  }
  return statusToStep[currentStatus] || null
}
