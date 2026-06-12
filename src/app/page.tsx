'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { io as socketIO, Socket } from 'socket.io-client'
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

export default function HomePage() {
  const [topic, setTopic] = useState('')
  const [activeSession, setActiveSession] = useState<SessionData | null>(null)
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [activeTab, setActiveTab] = useState('create')
  const [isRunning, setIsRunning] = useState(false)
  const [progressMessages, setProgressMessages] = useState<Record<string, string[]>>({})
  const [logExpanded, setLogExpanded] = useState(false)
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)

  // Fetch sessions list
  const fetchSessionsRef = useRef(async () => {
    try {
      const res = await fetch('/api/sessions')
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch (err) {
      console.error('Failed to fetch sessions:', err)
    }
  })
  const fetchSessions = useCallback(() => fetchSessionsRef.current(), [])

  // Fetch single session
  const fetchSessionRef = useRef(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`)
      const data = await res.json()
      setActiveSession(data.session)
      if (data.session.status === 'completed' || data.session.status === 'failed') {
        setIsRunning(false)
      }
    } catch (err) {
      console.error('Failed to fetch session:', err)
    }
  })
  const fetchSession = useCallback((sessionId: string) => fetchSessionRef.current(sessionId), [])

  // Connect to WebSocket
  useEffect(() => {
    const socket = socketIO('/?XTransformPort=3003', {
      path: '/',
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('WS connected')
    })

    socket.on('session-created', (data: { sessionId: string }) => {
      socket.emit('join-session', { sessionId: data.sessionId })
    })

    socket.on('step-started', (data: { sessionId: string; stepType: string }) => {
      setProgressMessages((prev) => ({
        ...prev,
        [data.stepType]: [`Starting ${STEP_LABELS[data.stepType as StepType] || data.stepType}...`],
      }))
    })

    socket.on('step-progress', (data: { sessionId: string; stepType: string; message: string }) => {
      setProgressMessages((prev) => ({
        ...prev,
        [data.stepType]: [...(prev[data.stepType] || []), data.message],
      }))
    })

    socket.on('step-completed', (data: { sessionId: string; stepType: string }) => {
      setProgressMessages((prev) => ({
        ...prev,
        [data.stepType]: [...(prev[data.stepType] || []), '✓ Completed'],
      }))
      // Refresh session data
      if (activeSession && data.sessionId === activeSession.id) {
        fetchSession(data.sessionId)
      }
    })

    socket.on('session-completed', (data: { sessionId: string }) => {
      setIsRunning(false)
      if (activeSession && data.sessionId === activeSession.id) {
        fetchSession(data.sessionId)
      }
    })

    socket.on('step-failed', (data: { sessionId: string }) => {
      setIsRunning(false)
      if (activeSession && data.sessionId === activeSession.id) {
        fetchSession(data.sessionId)
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [activeSession, fetchSession])

  // Initial load
  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Poll session data when running
  useEffect(() => {
    if (!isRunning || !activeSession) return
    const interval = setInterval(() => {
      fetchSession(activeSession.id)
      fetchSessions()
    }, 3000)
    return () => clearInterval(interval)
  }, [isRunning, activeSession, fetchSession, fetchSessions])

  // Start creation
  const handleStart = async () => {
    if (!topic.trim()) return
    setIsRunning(true)
    setProgressMessages({})
    setActiveTab('create')

    try {
      const res = await fetch('/api/agent/run-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      })
      const data = await res.json()
      if (data.sessionId) {
        // Join the WS room
        if (socketRef.current) {
          socketRef.current.emit('join-session', { sessionId: data.sessionId })
        }
        // Set initial session
        setActiveSession({
          id: data.sessionId,
          topic: topic.trim(),
          status: 'planning',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          steps: [],
        })
      }
    } catch (err) {
      console.error('Failed to start:', err)
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
    setProgressMessages({})
    setActiveTab('create')
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
                        <h3 className="text-sm font-semibold">{activeSession.topic}</h3>
                        <Badge
                          variant="outline"
                          className={
                            activeSession.status === 'completed'
                              ? 'border-emerald-500/50 text-emerald-400'
                              : activeSession.status === 'failed'
                                ? 'border-red-500/50 text-red-400'
                                : 'border-amber-500/50 text-amber-400'
                          }
                        >
                          {activeSession.status === 'completed'
                            ? 'Completed'
                            : activeSession.status === 'failed'
                              ? 'Failed'
                              : 'In Progress'}
                        </Badge>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden mb-3">
                        <motion.div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${currentProgress}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{currentProgress}% complete</p>
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
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 h-[calc(100%-60px)]">
                  {activeSession ? (
                    <AgentWorkflow
                      steps={activeSession.steps}
                      currentStatus={activeSession.status}
                      progressMessages={progressMessages}
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
