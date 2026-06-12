import ZAI from 'z-ai-web-dev-sdk'
import { db } from './db'
import { type StepType, type SessionStatus, STEP_ORDER, STATUS_AFTER_STEP } from './agent-types'

// Generate random hex string
function randomHex(length: number): string {
  const chars = '0123456789abcdef'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

// Strip markdown code blocks from LLM output - more robust version
function stripCodeBlocks(text: string): string {
  if (!text || typeof text !== 'string') return text || ''
  let result = text.trim()

  // Pattern 1: Entire response wrapped in a single code block
  const singleBlockMatch = result.match(/^```(?:json|javascript|js|typescript|text|markdown|md)?\s*\n?([\s\S]*?)\n?\s*```\s*$/)
  if (singleBlockMatch) {
    return singleBlockMatch[1].trim()
  }

  // Pattern 2: Remove opening code fences (possibly at start of string or after newlines)
  result = result.replace(/```(?:json|javascript|js|typescript|text|markdown|md)?\s*\n?/g, '')
  // Remove closing code fences
  result = result.replace(/\n?\s*```/g, '')

  return result.trim()
}

// Try to parse JSON from LLM output, handling code blocks and various edge cases
function tryParseJSON(text: string): unknown {
  if (!text || typeof text !== 'string') return null

  const stripped = stripCodeBlocks(text)

  try {
    return JSON.parse(stripped)
  } catch {
    // Try to find the first valid JSON object in the text
    const jsonMatch = stripped.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch {
        // Still failed, return null
      }
    }

    // Try to find JSON array
    const arrayMatch = stripped.match(/\[[\s\S]*\]/)
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0])
      } catch {
        // Still failed
      }
    }

    console.warn('Failed to parse JSON from LLM output, first 200 chars:', stripped.substring(0, 200))
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

  console.log(`[Agent] Step ${stepType} started for session ${sessionId}`)

  try {
    const zai = await ZAI.create()
    let output: unknown
    let toolCalls: unknown[] = []

    switch (stepType) {
      case 'plan': {
        console.log(`[Agent] Step plan: calling GLM-5.1 for topic "${session.topic}"`)
        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are a content planning agent. Given a topic, break it down into a detailed research and writing plan. Output ONLY a valid JSON object (no markdown code blocks, no backticks) with: researchQueries (array of 3-5 search queries), outlineStructure (array of section titles), targetAudience, keyThemes. Be specific and thorough. IMPORTANT: Return raw JSON only, do NOT wrap in code blocks.',
            },
            { role: 'user', content: session.topic },
          ],
        })
        const rawOutput = completion.choices[0]?.message?.content || '{}'
        // Parse and re-serialize to ensure clean JSON in DB
        const parsedPlan = tryParseJSON(rawOutput)
        output = parsedPlan ? JSON.stringify(parsedPlan) : rawOutput
        toolCalls = [{ tool: 'glm-5.1-chat', purpose: 'Generate content plan' }]

        // Store cleaned plan
        await db.creationSession.update({
          where: { id: sessionId },
          data: { plan: typeof output === 'string' ? output : JSON.stringify(output) },
        })
        console.log(`[Agent] Step plan: completed, plan stored`)
        break
      }

      case 'research': {
        const planData = session.plan ? (tryParseJSON(session.plan) as Record<string, unknown>) || {} : {}
        const queries = (planData.researchQueries as string[]) || [session.topic]
        const researchResults: Array<{ query: string; results: unknown }> = []

        console.log(`[Agent] Step research: running ${Math.min(queries.length, 3)} searches`)

        for (const query of queries.slice(0, 3)) {
          try {
            const searchResult = await zai.functions.invoke('web_search', {
              query,
              num: 5,
            })
            researchResults.push({ query, results: searchResult })
            toolCalls.push({ tool: 'web_search', query, resultCount: Array.isArray(searchResult) ? searchResult.length : 0 })
            console.log(`[Agent] Step research: completed search for "${query}"`)
          } catch (err) {
            console.error(`[Agent] Search failed for query "${query}":`, err)
            researchResults.push({ query, results: { error: 'Search failed' } })
            toolCalls.push({ tool: 'web_search', query, error: 'Search failed' })
          }
        }

        // Summarize research
        console.log(`[Agent] Step research: synthesizing findings`)
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
        console.log(`[Agent] Step research: completed`)
        break
      }

      case 'outline': {
        const planData = session.plan ? (tryParseJSON(session.plan) as Record<string, unknown>) || {} : {}
        const latestSteps = session.steps.filter((s) => s.stepType === 'research')
        const researchOutput = latestSteps.length > 0 && latestSteps[latestSteps.length - 1].output
          ? latestSteps[latestSteps.length - 1].output
          : ''

        console.log(`[Agent] Step outline: generating outline`)
        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are an article outlining agent. Create a detailed, structured article outline. Output ONLY raw JSON (no markdown code blocks, no backticks) with: title (string), sections (array of objects with: sectionTitle, keyPoints (array of strings), estimatedWordCount). Each section should have 3-5 key points. Target 6-8 sections for a comprehensive article. IMPORTANT: Return raw JSON only, do NOT wrap in code blocks.',
            },
            {
              role: 'user',
              content: `Topic: ${session.topic}\nPlan: ${JSON.stringify(planData)}\nResearch findings: ${researchOutput}`,
            },
          ],
        })
        const rawOutput = completion.choices[0]?.message?.content || '{}'
        const parsedOutline = tryParseJSON(rawOutput)
        output = parsedOutline ? JSON.stringify(parsedOutline) : rawOutput
        toolCalls = [{ tool: 'glm-5.1-chat', purpose: 'Generate article outline' }]

        await db.creationSession.update({
          where: { id: sessionId },
          data: { outline: typeof output === 'string' ? output : JSON.stringify(output) },
        })
        console.log(`[Agent] Step outline: completed, outline stored`)
        break
      }

      case 'write': {
        const outlineData = session.outline ? (tryParseJSON(session.outline) as Record<string, unknown>) || {} : {}
        const researchSteps = session.steps.filter((s) => s.stepType === 'research')
        const researchOutput = researchSteps.length > 0 && researchSteps[researchSteps.length - 1].output
          ? researchSteps[researchSteps.length - 1].output
          : ''

        console.log(`[Agent] Step write: writing full article`)
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
        console.log(`[Agent] Step write: completed, article length: ${typeof output === 'string' ? output.length : 0}`)
        break
      }

      case 'illustrate': {
        console.log(`[Agent] Step illustrate: generating cover image`)
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

          output = { coverImageGenerated: true, imageCount: 1 }
          console.log(`[Agent] Step illustrate: cover image generated`)
        } catch (err) {
          console.error('[Agent] Image generation failed:', err)
          toolCalls.push({ tool: 'image-generation', purpose: 'Generate cover image', error: 'Failed' })
          output = { coverImageGenerated: false, error: 'Image generation failed' }
        }
        break
      }

      case 'review': {
        const writeSteps = session.steps.filter((s) => s.stepType === 'write')
        const articleContent = writeSteps.length > 0 && writeSteps[writeSteps.length - 1].output
          ? writeSteps[writeSteps.length - 1].output
          : session.content || ''

        console.log(`[Agent] Step review: reviewing article`)
        const reviewCompletion = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are an article review agent. Review the given article for: 1) Quality and depth of content, 2) Logical flow and structure, 3) Factual consistency, 4) Writing quality and readability, 5) Completeness of coverage. Provide specific feedback and a quality score (1-10). If the score is below 7, suggest specific improvements. Output ONLY raw JSON (no markdown code blocks, no backticks) with: score, feedback (array of strings), improvements (array of strings), approved (boolean). IMPORTANT: Return raw JSON only, do NOT wrap in code blocks.',
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
        console.log(`[Agent] Step review: completed`)
        break
      }

      case 'format': {
        const writeSteps = session.steps.filter((s) => s.stepType === 'write')
        let articleContent = writeSteps.length > 0 && writeSteps[writeSteps.length - 1].output
          ? writeSteps[writeSteps.length - 1].output
          : session.content || ''

        console.log(`[Agent] Step format: formatting article`)
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
        console.log(`[Agent] Step format: completed`)
        break
      }

      case 'publish': {
        console.log(`[Agent] Step publish: simulating on-chain publication`)
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
        console.log(`[Agent] Step publish: completed! Contract: ${contractAddr}`)
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

    console.log(`[Agent] Step ${stepType} completed for session ${sessionId}`)
  } catch (error) {
    console.error(`[Agent] Step ${stepType} FAILED for session ${sessionId}:`, error)

    await updateStep(stepId, {
      status: 'failed',
      output: { error: String(error) },
      completedAt: new Date(),
    })

    await db.creationSession.update({
      where: { id: sessionId },
      data: { status: 'failed' },
    })

    throw error
  }
}

// Run the full agent workflow
export async function runFullWorkflow(sessionId: string): Promise<void> {
  console.log(`[Agent] Starting full workflow for session ${sessionId}`)

  for (const stepType of STEP_ORDER) {
    try {
      await executeStep(sessionId, stepType)
      // Small delay between steps
      await new Promise((resolve) => setTimeout(resolve, 300))
    } catch (error) {
      console.error(`[Agent] Workflow STOPPED at step ${stepType} for session ${sessionId}:`, error)
      break
    }
  }

  console.log(`[Agent] Full workflow finished for session ${sessionId}`)
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
