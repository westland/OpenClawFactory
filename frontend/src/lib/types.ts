export type Stage =
  | 'breakroom'
  | 'briefing'
  | 'research'
  | 'build'
  | 'qa'
  | 'ship'

export interface AgentState {
  name: string
  role: string
  stage: Stage
  task_id: string
  task_title: string
  model: string
  busy: boolean
}

export interface Task {
  id: string
  title: string
  description: string
  agent_name: string
  stage: Stage
  status: 'pending' | 'running' | 'completed' | 'failed'
  result: string
  created_at: string
  updated_at: string
}

export interface Message {
  task_id: string
  agent_name: string
  role: string
  content: string
  created_at: string
}

export interface WSEvent {
  type: 'init' | 'agent_moved' | 'task_created' | 'task_updated' | 'message'
  data: Record<string, unknown>
}

export const STAGE_META: Record<Stage, { label: string; icon: string; color: string; desc: string }> = {
  breakroom: { label: 'Break Room', icon: '☕', color: '#64748b', desc: 'Idle — awaiting assignment' },
  briefing:  { label: 'Briefing',   icon: '📋', color: '#22d3ee', desc: 'Receiving task' },
  research:  { label: 'Research',   icon: '🔎', color: '#a78bfa', desc: 'Gathering intelligence' },
  build:     { label: 'Build',      icon: '🔨', color: '#fbbf24', desc: 'Executing task' },
  qa:        { label: 'QA',         icon: '✓',  color: '#4ade80', desc: 'Reviewing output' },
  ship:      { label: 'Ship',       icon: '🚀', color: '#f472b6', desc: 'Delivering result' },
}

export const STAGE_ORDER: Stage[] = ['breakroom', 'briefing', 'research', 'build', 'qa', 'ship']

export const AGENT_COLORS: Record<string, string> = {
  Henry:   '#22d3ee',   // cyan
  Charlie: '#fbbf24',   // amber
  Sarah:   '#4ade80',   // green
  Max:     '#a78bfa',   // purple
}

export function agentColor(name: string): string {
  return AGENT_COLORS[name] ?? '#94a3b8'
}
