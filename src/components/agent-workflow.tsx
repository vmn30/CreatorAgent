'use client'

import { motion } from 'framer-motion'
import {
  Brain,
  Search,
  ListTree,
  PenTool,
  Image as ImageIcon,
  Eye,
  FileText,
  Rocket,
  Loader2,
  CheckCircle2,
  Circle,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { STEP_ORDER, STEP_LABELS, type StepType } from '@/lib/agent-types'

const STEP_ICONS: Record<StepType, React.ReactNode> = {
  plan: <Brain className="h-5 w-5" />,
  research: <Search className="h-5 w-5" />,
  outline: <ListTree className="h-5 w-5" />,
  write: <PenTool className="h-5 w-5" />,
  illustrate: <ImageIcon className="h-5 w-5" />,
  review: <Eye className="h-5 w-5" />,
  format: <FileText className="h-5 w-5" />,
  publish: <Rocket className="h-5 w-5" />,
}

export interface StepInfo {
  id: string
  stepType: StepType
  status: string
  output?: string | null
  toolCalls?: string | null
  startedAt?: string | null
  completedAt?: string | null
  iteration?: number
}

interface AgentWorkflowProps {
  steps: StepInfo[]
  currentStatus: string
  progressMessages: Record<string, string[]>
}

export function AgentWorkflow({ steps, currentStatus, progressMessages }: AgentWorkflowProps) {
  const stepMap = new Map(steps.map((s) => [s.stepType, s]))

  return (
    <ScrollArea className="h-full w-full">
      <div className="relative px-4 py-6">
        {/* Vertical line */}
        <div className="absolute left-[2.25rem] top-6 bottom-6 w-px bg-border" />

        <div className="space-y-6">
          {STEP_ORDER.map((stepType, index) => {
            const step = stepMap.get(stepType)
            const isRunning = step?.status === 'running'
            const isCompleted = step?.status === 'completed'
            const isFailed = step?.status === 'failed'
            const isPending = !step || step.status === 'pending'
            const messages = progressMessages[stepType] || []

            return (
              <motion.div
                key={stepType}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className="relative flex items-start gap-4"
              >
                {/* Icon circle */}
                <div
                  className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                    isCompleted
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                      : isRunning
                        ? 'border-amber-400 bg-amber-400/20 text-amber-400'
                        : isFailed
                          ? 'border-red-500 bg-red-500/20 text-red-400'
                          : 'border-muted-foreground/30 bg-muted/50 text-muted-foreground/50'
                  }`}
                >
                  {isRunning ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : isFailed ? (
                    <XCircle className="h-5 w-5" />
                  ) : (
                    STEP_ICONS[stepType]
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold text-sm ${
                        isCompleted
                          ? 'text-emerald-400'
                          : isRunning
                            ? 'text-amber-400'
                            : isFailed
                              ? 'text-red-400'
                              : 'text-muted-foreground/50'
                      }`}
                    >
                      {STEP_LABELS[stepType]}
                    </span>
                    {isRunning && (
                      <Badge
                        variant="outline"
                        className="border-amber-400/50 text-amber-400 text-[10px] px-1.5 py-0"
                      >
                        RUNNING
                      </Badge>
                    )}
                    {isCompleted && (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/50 text-emerald-400 text-[10px] px-1.5 py-0"
                      >
                        DONE
                      </Badge>
                    )}
                    {isFailed && (
                      <Badge
                        variant="outline"
                        className="border-red-500/50 text-red-400 text-[10px] px-1.5 py-0"
                      >
                        FAILED
                      </Badge>
                    )}
                  </div>

                  {/* Progress messages */}
                  {isRunning && messages.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2 space-y-1"
                    >
                      {messages.map((msg, i) => (
                        <p key={i} className="text-xs text-muted-foreground animate-pulse">
                          {msg}
                        </p>
                      ))}
                    </motion.div>
                  )}

                  {/* Completed summary */}
                  {isCompleted && step?.output && (
                    <p className="mt-1 text-xs text-muted-foreground/70 line-clamp-2">
                      {(() => {
                        try {
                          const parsed = JSON.parse(step.output)
                          if (typeof parsed === 'string') return parsed.substring(0, 120) + '...'
                          return JSON.stringify(parsed).substring(0, 120) + '...'
                        } catch {
                          return step.output.substring(0, 120) + '...'
                        }
                      })()}
                    </p>
                  )}

                  {/* Tool calls */}
                  {isCompleted && step?.toolCalls && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(() => {
                        try {
                          const calls = JSON.parse(step.toolCalls)
                          return (Array.isArray(calls) ? calls : []).map(
                            (call: { tool?: string; purpose?: string }, i: number) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              >
                                {call.tool}: {call.purpose}
                              </Badge>
                            )
                          )
                        } catch {
                          return null
                        }
                      })()}
                    </div>
                  )}

                  {/* Duration */}
                  {isCompleted && step?.startedAt && step?.completedAt && (
                    <p className="mt-1 text-[10px] text-muted-foreground/50">
                      {(() => {
                        const start = new Date(step.startedAt).getTime()
                        const end = new Date(step.completedAt).getTime()
                        const duration = Math.round((end - start) / 1000)
                        return `Completed in ${duration}s`
                      })()}
                    </p>
                  )}
                </div>

                {/* Connector for pending steps */}
                {isPending && (
                  <Circle className="h-2 w-2 text-muted-foreground/20 absolute -left-1 top-4" />
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </ScrollArea>
  )
}
