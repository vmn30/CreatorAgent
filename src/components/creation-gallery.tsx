'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Eye, Loader2, XCircle } from 'lucide-react'

interface GallerySession {
  id: string
  topic: string
  status: string
  coverImage?: string | null
  createdAt: string
  steps: Array<{ stepType: string; status: string }>
}

interface CreationGalleryProps {
  sessions: GallerySession[]
  onSelect: (sessionId: string) => void
  selectedId?: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  planning: { label: 'Planning', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  researching: { label: 'Researching', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  outlining: { label: 'Outlining', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  writing: { label: 'Writing', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  illustrating: { label: 'Illustrating', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  reviewing: { label: 'Reviewing', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  formatting: { label: 'Formatting', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  publishing: { label: 'Publishing', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  completed: { label: 'Completed', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  failed: { label: 'Failed', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

export function CreationGallery({ sessions, onSelect, selectedId }: CreationGalleryProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Eye className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold text-muted-foreground">No creations yet</h3>
        <p className="text-sm text-muted-foreground/50 mt-1">
          Start your first creation to see it here
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sessions.map((session) => {
        const config = STATUS_CONFIG[session.status] || { label: session.status, color: 'bg-muted text-muted-foreground border-border' }
        const completedSteps = session.steps.filter((s) => s.status === 'completed').length
        const totalSteps = 8
        const progress = (completedSteps / totalSteps) * 100
        const isSelected = selectedId === session.id

        return (
          <Card
            key={session.id}
            className={`cursor-pointer transition-all duration-300 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 ${
              isSelected ? 'border-emerald-500/50 ring-1 ring-emerald-500/30' : 'border-border/50'
            } bg-card/50 backdrop-blur-sm`}
            onClick={() => onSelect(session.id)}
          >
            <CardContent className="p-4">
              {/* Cover image or placeholder */}
              <div className="relative w-full aspect-video rounded-md overflow-hidden mb-3 bg-muted/30">
                {session.coverImage ? (
                  <img
                    src={`data:image/png;base64,${session.coverImage}`}
                    alt={session.topic}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {session.status === 'failed' ? (
                      <XCircle className="h-8 w-8 text-red-400/50" />
                    ) : session.status === 'completed' ? (
                      <Eye className="h-8 w-8 text-emerald-400/50" />
                    ) : (
                      <Loader2 className="h-8 w-8 text-amber-400/50 animate-spin" />
                    )}
                  </div>
                )}
                {/* Progress bar overlay */}
                {session.status !== 'completed' && session.status !== 'failed' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/50">
                    <div
                      className="h-full bg-amber-400/70 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Topic */}
              <h3 className="font-semibold text-sm line-clamp-2 mb-2">{session.topic}</h3>

              {/* Status + Date */}
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.color}`}>
                  {config.label}
                </Badge>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                  <Clock className="h-3 w-3" />
                  {new Date(session.createdAt).toLocaleDateString()}
                </div>
              </div>

              {/* Steps progress */}
              <div className="mt-2 flex gap-1">
                {session.steps.map((step, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${
                      step.status === 'completed'
                        ? 'bg-emerald-400'
                        : step.status === 'running'
                          ? 'bg-amber-400 animate-pulse'
                          : step.status === 'failed'
                            ? 'bg-red-400'
                            : 'bg-muted/50'
                    }`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
