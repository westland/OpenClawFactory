'use client'
import { useState } from 'react'
import type { AgentState } from '@/lib/types'
import { agentColor } from '@/lib/types'

interface Props {
  agents: AgentState[]
  onAssign: (title: string, description: string, agent: string) => Promise<void>
}

export function TaskInput({ agents, onAssign }: Props) {
  const [title, setTitle]       = useState('')
  const [description, setDesc]  = useState('')
  const [agent, setAgent]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true); setError('')
    try {
      await onAssign(title.trim(), description.trim(), agent)
      setTitle(''); setDesc(''); setAgent('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to assign task')
    } finally {
      setLoading(false)
    }
  }

  const idleAgents = agents.filter(a => !a.busy)

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          className="flex-1 bg-factory-bg border border-factory-border rounded px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-factory-accent transition-colors"
          placeholder="Assign a task… e.g. Research the latest LLM benchmarks"
          value={title}
          onChange={e => setTitle(e.target.value)}
          disabled={loading}
        />
        <select
          className="bg-factory-bg border border-factory-border rounded px-2 py-2 text-sm text-slate-400 focus:outline-none focus:border-factory-accent"
          value={agent}
          onChange={e => setAgent(e.target.value)}
          disabled={loading}
        >
          <option value="">Auto-assign</option>
          {idleAgents.map(a => (
            <option key={a.name} value={a.name}>
              {a.name} ({a.role})
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="px-4 py-2 rounded text-sm font-bold bg-factory-accent text-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cyan-300 transition-colors"
        >
          {loading ? '…' : '▶ Assign'}
        </button>
      </div>

      <textarea
        className="bg-factory-bg border border-factory-border rounded px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-factory-accent transition-colors resize-none"
        placeholder="Additional context (optional)"
        rows={2}
        value={description}
        onChange={e => setDesc(e.target.value)}
        disabled={loading}
      />

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {idleAgents.length === 0 && (
        <p className="text-xs text-amber-500">All agents are busy — task will queue.</p>
      )}
    </form>
  )
}
