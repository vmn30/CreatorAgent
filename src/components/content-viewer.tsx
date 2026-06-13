'use client'

import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, Calendar, Clock } from 'lucide-react'

interface ContentViewerrProps {
  content: string
  topic: string
  coverImage?: string | null
  createdAt: string
  status: string
}

export function ContentViewerr({ content, topic, coverImage, createdAt, status }: ContentViewerrProps) {
  return (
    <div className="space-y-6">
      {/* Cover Image */}
      {coverImage && (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border/50">
          <img
            src={`data:image/png;base64,${coverImage}`}
            alt={`Cover image for: ${topic}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">{topic}</h1>
          </div>
        </div>
      )}

      {/* Article metadata */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
          <FileText className="h-3 w-3 mr-1" />
          Research Article
        </Badge>
        <Badge variant="outline" className="border-border/50 text-muted-foreground">
          <Calendar className="h-3 w-3 mr-1" />
          {new Date(createdAt).toLocaleDateString()}
        </Badge>
        <Badge variant="outline" className="border-border/50 text-muted-foreground">
          <Clock className="h-3 w-3 mr-1" />
          {new Date(createdAt).toLocaleTimeString()}
        </Badge>
        {status === 'completed' && (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Published</Badge>
        )}
      </div>

      {/* Article Content */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-foreground">Article Content</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[600px]">
            <div className="prose prose-invert prose-sm max-w-none prose-headings:text-emerald-400 prose-a:text-emerald-400 prose-strong:text-foreground prose-code:text-emerald-300">
              <ReactMarkdown>{content || 'Article content will appear here once the agent completes writing...'}</ReactMarkdown>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
