// Types and constants for the agent workflow - safe for client-side import
// No Node.js or z-ai-web-dev-sdk dependencies

export type StepType = 'plan' | 'research' | 'outline' | 'write' | 'illustrate' | 'review' | 'format' | 'publish'
export type SessionStatus = 'planning' | 'researching' | 'outlining' | 'writing' | 'illustrating' | 'reviewing' | 'formatting' | 'publishing' | 'completed' | 'failed'

export const STEP_ORDER: StepType[] = ['plan', 'research', 'outline', 'write', 'illustrate', 'review', 'format', 'publish']
export const STEP_LABELS: Record<StepType, string> = {
  plan: 'Planning',
  research: 'Researching',
  outline: 'Outlining',
  write: 'Writing',
  illustrate: 'Illustrating',
  review: 'Reviewing',
  format: 'Formatting',
  publish: 'Publishing',
}
export const STATUS_AFTER_STEP: Record<StepType, SessionStatus> = {
  plan: 'researching',
  research: 'outlining',
  outline: 'writing',
  write: 'illustrating',
  illustrate: 'reviewing',
  review: 'formatting',
  format: 'publishing',
  publish: 'completed',
}
