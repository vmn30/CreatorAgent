'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Brain,
  Search,
  ListTree,
  PenTool,
  Image as ImageIcon,
  Eye,
  FileText,
  Rocket,
  Loader2,
  Play,
  RotateCcw,
  BookOpen,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield,
  Lightbulb,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AgentWorkflow, type StepInfo } from '@/components/agent-workflow'
import { ContentViewerr } from '@/components/content-viewer'
import { OnChainProof } from '@/components/on-chain-proof'
import { CreationGallery } from '@/components/creation-gallery'
import { STEP_ORDER, STEP_LABELS, type StepType } from '@/lib/agent-types'

interface SessionData {
  id: string
  topic: string
  status: string
  plan?: string | null
  outline?: string | null
  content?: string | null
  coverImage?: string | null
  contractAddr?: string | null
  txHash?: string | null
  nftTokenId?: string | null
  createdAt: string
  updatedAt: string
  steps: StepInfo[]
}

const DEMO_TOPICS = [
  'The Future of AI Agents in Web3: Autonomous DeFi Strategies',
  'How GLM-5.1 Enables Long-Horizon Creative Tasks',
  'The Rise of AI-NFTs: When Artificial Intelligence Meets Digital Ownership',
]

const STEP_ICONS_MAP: Record<StepType, React.ReactNode> = {
  plan: <Brain className="h-4 w-4" />,
  research: <Search className="h-4 w-4" />,
  outline: <ListTree className="h-4 w-4" />,
  write: <PenTool className="h-4 w-4" />,
  illustrate: <ImageIcon className="h-4 w-4" />,
  review: <Eye className="h-4 w-4" />,
  format: <FileText className="h-4 w-4" />,
  publish: <Rocket className="h-4 w-4" />,
}

// Map session status to current step label for display
function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    planning: 'Planning content strategy...',
    researching: 'Searching the web for information...',
    outlining: 'Structuring article outline...',
    writing: 'Writing full article draft...',
    illustrating: 'Generating cover artwork...',
    reviewing: 'Reviewing article quality...',
    formatting: 'Polishing final content...',
    publishing: 'Publishing on-chain...',
    completed: 'Published successfully!',
    failed: 'Workflow failed',
  }
  return map[status] || status
}

// Get elapsed time display
function getElapsedTime(startTime: string): string {
  const elapsed = Date.now() - new Date(startTime).getTime()
  const seconds = Math.floor(elapsed / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

export default function HomePage() {
  const [topic, setTopic] = useState('')
  const [activeSession, setActiveSession] = useState<SessionData | null>(null)
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [activeTab, setActiveTab] = useState('create')
  const [isRunning, setIsRunning] = useState(false)
  const [logExpanded, setLogExpanded] = useState(true)
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsedTime, setElapsedTime] = useState<string>('')
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<string>('')

  // Fetch sessions list
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions')
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch (err) {
      console.error('Failed to fetch sessions:', err)
    }
  }, [])

  // Fetch single session
  const fetchSession = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`)
      const data = await res.json()
      if (data.session) {
        setActiveSession(data.session)
        if (data.session.status === 'completed' || data.session.status === 'failed') {
          setIsRunning(false)
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          // Refresh gallery when done
          fetchSessions()
          // Auto-switch to result tab on completion
          if (data.session.status === 'completed') {
            setActiveTab('result')
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch session:', err)
    }
  }, [fetchSessions])

  // Initial load
  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Auto-execute next step when running
  // This replaces the old background workflow - each step runs in its own API call
  const isExecutingRef = useRef(false)

  const executeNextStep = useCallback(async (sessionId: string) => {
    if (isExecutingRef.current) return // Prevent concurrent execution
    isExecutingRef.current = true
    try {
      const res = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json()
      if (data.error) {
        console.error('Step execution error:', data.error)
        // Don't stop - might be temporary
      }
      // Refresh session data after step completes
      await fetchSession(sessionId)
    } catch (err) {
      console.error('Failed to execute step:', err)
    } finally {
      isExecutingRef.current = false
    }
  }, [fetchSession])

  // Poll session status and auto-execute next step
  useEffect(() => {
    if (!isRunning || !activeSession?.id) return
    const sessionId = activeSession.id

    // Check if we need to execute the next step
    const status = activeSession.status
    const hasRunningStep = activeSession.steps.some(s => s.status === 'running')

    if (status !== 'completed' && status !== 'failed' && !hasRunningStep) {
      // No step is running and session is not done - execute next step
      executeNextStep(sessionId)
    }

    // Also poll for status updates
    pollIntervalRef.current = setInterval(() => {
      fetchSession(sessionId)
    }, 3000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [isRunning, activeSession?.id, activeSession?.status, activeSession?.steps, fetchSession, executeNextStep])

  // Update elapsed time when running
  useEffect(() => {
    if (!isRunning) {
      setElapsedTime('')
      return
    }
    const timer = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedTime(getElapsedTime(startTimeRef.current))
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [isRunning])

  // Start creation
  const handleStart = async () => {
    if (!topic.trim()) return
    setIsRunning(true)
    setError(null)
    setActiveTab('create')
    setLogExpanded(true)
    const now = new Date().toISOString()
    startTimeRef.current = now

    try {
      const res = await fetch('/api/agent/run-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        setIsRunning(false)
        return
      }

      if (data.sessionId) {
        // Set initial session immediately
        setActiveSession({
          id: data.sessionId,
          topic: topic.trim(),
          status: 'planning',
          createdAt: now,
          updatedAt: now,
          steps: [],
        })
        // Execute first step immediately
        executeNextStep(data.sessionId)
      }
    } catch (err) {
      console.error('Failed to start:', err)
      setError('Failed to start workflow. Please try again.')
      setIsRunning(false)
    }
  }

  // View result from gallery
  const handleGallerySelect = async (sessionId: string) => {
    setSelectedGalleryId(sessionId)
    try {
      const res = await fetch(`/api/sessions/${sessionId}`)
      const data = await res.json()
      setActiveSession(data.session)
      setActiveTab(data.session.status === 'completed' ? 'result' : 'create')
    } catch (err) {
      console.error('Failed to fetch session:', err)
    }
  }

  // Reset
  const handleReset = () => {
    setActiveSession(null)
    setTopic('')
    setIsRunning(false)
    setError(null)
    setElapsedTime('')
    setActiveTab('create')
    startTimeRef.current = ''
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }

  const currentProgress = activeSession
    ? Math.round(
        (STEP_ORDER.filter((st) =>
          activeSession.steps.some((s) => s.stepType === st && s.status === 'completed')
        ).length /
          STEP_ORDER.length) *
          100
      )
    : 0

  // Get current running step
  const runningStep = activeSession?.steps.find(s => s.status === 'running')
  const failedStep = activeSession?.steps.find(s => s.status === 'failed')

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  Creator<span className="text-emerald-400">Agent</span>
                </h1>
                <p className="text-[10px] text-muted-foreground tracking-wider uppercase">
                  AI × Creator Economy | Z.AI Hackathon
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">
                <Zap className="h-3 w-3 mr-1" />
                GLM-5.1 Powered
              </Badge>
              <Badge variant="outline" className="border-border/50 text-muted-foreground text-[10px]">
                <Shield className="h-3 w-3 mr-1" />
                Web3 Ready
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-6 bg-card/50 border border-border/50">
            <TabsTrigger value="create" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <Sparkles className="h-4 w-4 mr-2" />
              Create
            </TabsTrigger>
            <TabsTrigger value="result" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400" disabled={!activeSession}>
              <BookOpen className="h-4 w-4 mr-2" />
              Result
            </TabsTrigger>
            <TabsTrigger value="gallery" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Gallery
            </TabsTrigger>
          </TabsList>

          {/* CREATE TAB */}
          <TabsContent value="create">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Input + Controls */}
              <div className="space-y-6">
                {/* Topic Input */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Lightbulb className="h-5 w-5 text-amber-400" />
                      What would you like to create?
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter a topic for your AI research article..."
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isRunning && handleStart()}
                        disabled={isRunning}
                        className="bg-muted/50 border-border/50 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                      />
                      <Button
                        onClick={handleStart}
                        disabled={isRunning || !topic.trim()}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 px-6"
                      >
                        {isRunning ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Running
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Start
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Error display */}
                    {error && (
                      <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30">
                        <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm text-red-400 font-medium">Error</p>
                          <p className="text-xs text-red-400/70">{error}</p>
                        </div>
                      </div>
                    )}

                    {/* Demo topics */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Quick demo topics:</p>
                      <div className="flex flex-wrap gap-2">
                        {DEMO_TOPICS.map((demo) => (
                          <Button
                            key={demo}
                            variant="outline"
                            size="sm"
                            className="text-[11px] h-7 border-border/50 hover:border-emerald-500/50 hover:text-emerald-400"
                            onClick={() => setTopic(demo)}
                            disabled={isRunning}
                          >
                            {demo.substring(0, 40)}...
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Progress Overview */}
                {activeSession && (
                  <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold truncate mr-2">{activeSession.topic}</h3>
                        <Badge
                          variant="outline"
                          className={
                            activeSession.status === 'completed'
                              ? 'border-emerald-500/50 text-emerald-400 shrink-0'
                              : activeSession.status === 'failed'
                                ? 'border-red-500/50 text-red-400 shrink-0'
                                : 'border-amber-500/50 text-amber-400 shrink-0'
                          }
                        >
                          {activeSession.status === 'completed'
                            ? 'Completed'
                            : activeSession.status === 'failed'
                              ? 'Failed'
                              : 'In Progress'}
                        </Badge>
                      </div>

                      {/* Current step info */}
                      {(isRunning || activeSession.status === 'completed' || activeSession.status === 'failed') && (
                        <div className="mb-3 flex items-center gap-2 text-xs">
                          {isRunning && runningStep && (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                              <span className="text-amber-400">{getStatusLabel(activeSession.status)}</span>
                              {elapsedTime && (
                                <span className="text-muted-foreground ml-auto flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {elapsedTime}
                                </span>
                              )}
                            </>
                          )}
                          {activeSession.status === 'completed' && (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400">All 8 steps completed!</span>
                            </>
                          )}
                          {failedStep && (
                            <>
                              <AlertCircle className="h-3 w-3 text-red-400" />
                              <span className="text-red-400">Failed at {STEP_LABELS[failedStep.stepType as StepType] || failedStep.stepType} step</span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Progress bar */}
                      <div className="w-full h-2.5 bg-muted/50 rounded-full overflow-hidden mb-3">
                        <motion.div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${currentProgress}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{currentProgress}% complete ({activeSession.steps.filter(s => s.status === 'completed').length}/{STEP_ORDER.length} steps)</p>
                        <div className="flex gap-1">
                          {STEP_ORDER.map((stepType) => {
                            const step = activeSession.steps.find((s) => s.stepType === stepType)
                            const isDone = step?.status === 'completed'
                            const isRunning2 = step?.status === 'running'
                            const isFailed2 = step?.status === 'failed'
                            return (
                              <div
                                key={stepType}
                                className={`h-2 w-2 rounded-full ${
                                  isDone
                                    ? 'bg-emerald-400'
                                    : isRunning2
                                      ? 'bg-amber-400 animate-pulse'
                                      : isFailed2
                                        ? 'bg-red-400'
                                        : 'bg-muted/50'
                                }`}
                                title={STEP_LABELS[stepType]}
                              />
                            )
                          })}
                        </div>
                      </div>

                      {/* View Result button */}
                      {activeSession.status === 'completed' && (
                        <Button
                          onClick={() => setActiveTab('result')}
                          className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          View Result
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      )}

                      {/* Reset button */}
                      {(activeSession.status === 'completed' || activeSession.status === 'failed') && (
                        <Button
                          variant="outline"
                          onClick={handleReset}
                          className="w-full mt-2 border-border/50"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Create Another
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Agent Execution Log */}
                {activeSession && activeSession.steps.length > 0 && (
                  <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader
                      className="py-3 cursor-pointer"
                      onClick={() => setLogExpanded(!logExpanded)}
                    >
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Agent Execution Log</CardTitle>
                        {logExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </CardHeader>
                    {logExpanded && (
                      <CardContent className="pt-0">
                        <ScrollArea className="max-h-64">
                          <div className="space-y-2">
                            {activeSession.steps.map((step) => (
                              <div
                                key={step.id}
                                className="flex items-start gap-2 text-xs p-2 rounded-md bg-muted/30"
                              >
                                <div className="mt-0.5">{STEP_ICONS_MAP[step.stepType as StepType]}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{STEP_LABELS[step.stepType as StepType] || step.stepType}</span>
                                    <Badge
                                      variant="outline"
                                      className={`text-[9px] px-1 py-0 ${
                                        step.status === 'completed'
                                          ? 'border-emerald-500/50 text-emerald-400'
                                          : step.status === 'running'
                                            ? 'border-amber-500/50 text-amber-400'
                                            : step.status === 'failed'
                                              ? 'border-red-500/50 text-red-400'
                                              : 'border-border text-muted-foreground'
                                      }`}
                                    >
                                      {step.status}
                                    </Badge>
                                    {step.iteration > 1 && (
                                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                                        iter #{step.iteration}
                                      </Badge>
                                    )}
                                  </div>
                                  {step.toolCalls && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {(() => {
                                        try {
                                          const calls = JSON.parse(step.toolCalls)
                                          return (Array.isArray(calls) ? calls : []).map(
                                            (call: { tool?: string; purpose?: string; error?: string }, i: number) => (
                                              <span
                                                key={i}
                                                className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400"
                                              >
                                                {call.tool}{call.error ? ' (failed)' : `: ${call.purpose}`}
                                              </span>
                                            )
                                          )
                                        } catch {
                                          return null
                                        }
                                      })()}
                                    </div>
                                  )}
                                  {step.startedAt && step.completedAt && (
                                    <p className="text-[9px] text-muted-foreground/50 mt-0.5">
                                      Duration: {Math.round((new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()) / 1000)}s
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    )}
                  </Card>
                )}
              </div>

              {/* Right: Workflow Visualization */}
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-[calc(100vh-220px)] min-h-[500px]">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Brain className="h-5 w-5 text-emerald-400" />
                    Agent Workflow
                    {isRunning && (
                      <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-[10px] ml-2 animate-pulse">
                        LIVE
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 h-[calc(100%-60px)]">
                  {activeSession ? (
                    <AgentWorkflow
                      steps={activeSession.steps}
                      currentStatus={activeSession.status}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center px-8">
                      <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                        <Sparkles className="h-8 w-8 text-emerald-400/50" />
                      </div>
                      <h3 className="text-base font-semibold text-muted-foreground">Ready to Create</h3>
                      <p className="text-sm text-muted-foreground/50 mt-2 max-w-xs">
                        Enter a topic and click Start to watch the AI agent autonomously plan, research, write, and publish a research article.
                      </p>
                      <div className="mt-4 grid grid-cols-4 gap-2">
                        {STEP_ORDER.map((stepType) => (
                          <div
                            key={stepType}
                            className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/30"
                          >
                            <div className="text-muted-foreground/50">{STEP_ICONS_MAP[stepType]}</div>
                            <span className="text-[9px] text-muted-foreground/50">{STEP_LABELS[stepType]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* RESULT TAB */}
          <TabsContent value="result">
            {activeSession ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ContentViewerr
                    content={activeSession.content || ''}
                    topic={activeSession.topic}
                    coverImage={activeSession.coverImage}
                    createdAt={activeSession.createdAt}
                    status={activeSession.status}
                  />
                </div>
                <div className="space-y-4">
                  <OnChainProof
                    contractAddr={activeSession.contractAddr}
                    txHash={activeSession.txHash}
                    nftTokenId={activeSession.nftTokenId}
                    createdAt={activeSession.updatedAt}
                  />

                  {/* Quick stats */}
                  <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Session Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Total Steps</span>
                        <span className="font-medium">{activeSession.steps.length}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Completed</span>
                        <span className="font-medium text-emerald-400">
                          {activeSession.steps.filter((s) => s.status === 'completed').length}
                        </span>
                      </div>
                      <Separator className="bg-border/30" />
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">LLM Calls</span>
                        <span className="font-medium">
                          {activeSession.steps.filter((s) => {
                            try {
                              const calls = JSON.parse(s.toolCalls || '[]')
                              return Array.isArray(calls) && calls.some((c: { tool?: string }) => c.tool?.includes('glm'))
                            } catch { return false }
                          }).length}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Web Searches</span>
                        <span className="font-medium">
                          {activeSession.steps.reduce((acc, s) => {
                            try {
                              const calls = JSON.parse(s.toolCalls || '[]')
                              return acc + (Array.isArray(calls) ? calls.filter((c: { tool?: string }) => c.tool?.includes('web_search')).length : 0)
                            } catch { return acc }
                          }, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Images Generated</span>
                        <span className="font-medium">
                          {activeSession.coverImage ? 1 : 0}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Total Duration</span>
                        <span className="font-medium">
                          {(() => {
                            const completed = activeSession.steps.filter(s => s.startedAt && s.completedAt)
                            if (completed.length === 0) return 'N/A'
                            const first = new Date(completed[0].startedAt!).getTime()
                            const last = new Date(completed[completed.length - 1].completedAt!).getTime()
                            return `${Math.round((last - first) / 1000)}s`
                          })()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">No result to display</h3>
                <p className="text-sm text-muted-foreground/50 mt-1">Create something first to see the result here</p>
              </div>
            )}
          </TabsContent>

          {/* GALLERY TAB */}
          <TabsContent value="gallery">
            <CreationGallery
              sessions={sessions}
              onSelect={handleGallerySelect}
              selectedId={selectedGalleryId || undefined}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30 backdrop-blur-xl mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Built with <span className="text-emerald-400 font-medium">GLM-5.1</span> | Z.AI Hackathon 2026
            </p>
            <p className="text-xs text-muted-foreground/50">
              One Agent. Full Creative Pipeline. From Topic to On-chain Publication.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
