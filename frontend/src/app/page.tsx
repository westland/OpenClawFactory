'use client'
import { useState } from 'react'
import { useFactory } from '@/lib/useFactory'
import { STAGE_ORDER, agentColor } from '@/lib/types'
import { PipelineStage } from '@/components/PipelineStage'
import { TaskInput } from '@/components/TaskInput'
import type { Stage } from '@/lib/types'

export default function FactoryPage() {
  const { agents, tasks, connected, log, assignTask } = useFactory()
  const [activeTab, setActiveTab] = useState<'floor' | 'tasks' | 'log'>('floor')
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())

  // Group agents by stage
  const byStage = STAGE_ORDER.reduce((acc, s) => {
    acc[s] = agents.filter(a => a.stage === s)
    return acc
  }, {} as Record<Stage, typeof agents>)

  const runningCount = agents.filter(a => a.busy).length
  const completedToday = tasks.filter(t => t.status === 'completed').length

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Top bar ── */}
      <header className="flex items-center gap-4 px-4 py-2 border-b border-factory-border bg-factory-panel">
        <div>
          <div className="text-[10px] text-slate-600 uppercase tracking-widest">OpenClawFactory</div>
          <div className="text-lg font-bold text-factory-accent leading-none">MISSION CONTROL</div>
        </div>

        <div className="flex gap-4 ml-4 text-xs">
          <div>
            <div className="text-slate-600">AGENTS</div>
            <div className="text-white font-bold">{agents.length}</div>
          </div>
          <div>
            <div className="text-slate-600">ACTIVE</div>
            <div className="font-bold" style={{ color: runningCount > 0 ? '#22d3ee' : '#475569' }}>
              {runningCount}
            </div>
          </div>
          <div>
            <div className="text-slate-600">DONE TODAY</div>
            <div className="text-factory-green font-bold">{completedToday}</div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: connected ? '#4ade80' : '#f87171',
              boxShadow: connected ? '0 0 6px #4ade80' : 'none',
            }}
          />
          <span className="text-slate-500">{connected ? 'LIVE' : 'OFFLINE'}</span>
        </div>
      </header>

      {/* ── Agent roster ── */}
      <div className="flex gap-2 px-4 py-2 border-b border-factory-border bg-factory-panel overflow-x-auto">
        {agents.map(a => (
          <div
            key={a.name}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs shrink-0"
            style={{
              border: `1px solid ${agentColor(a.name)}44`,
              background: `${agentColor(a.name)}0f`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: a.busy ? agentColor(a.name) : '#334155',
                boxShadow: a.busy ? `0 0 4px ${agentColor(a.name)}` : 'none',
              }}
            />
            <span style={{ color: agentColor(a.name) }} className="font-bold">{a.name}</span>
            <span className="text-slate-600">{a.role}</span>
            <span className="text-slate-500">→ {a.stage}</span>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-factory-border bg-factory-panel text-xs">
        {(['floor', 'tasks', 'log'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 uppercase tracking-widest transition-colors"
            style={{
              color: activeTab === tab ? '#22d3ee' : '#475569',
              borderBottom: activeTab === tab ? '2px solid #22d3ee' : '2px solid transparent',
            }}
          >
            {tab === 'floor' ? '🏭 Factory Floor'
              : tab === 'tasks' ? '📋 Tasks'
              : '📡 Activity Log'}
          </button>
        ))}
      </div>

      <main className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">

        {/* ── FACTORY FLOOR ── */}
        {activeTab === 'floor' && (
          <>
            {/* Task assignment */}
            <div className="rounded-lg border border-factory-border bg-factory-panel p-4">
              <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-2">
                Assign Task to Agent
              </div>
              <TaskInput agents={agents} onAssign={assignTask} />
            </div>

            {/* Pipeline */}
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-1 items-stretch min-w-[700px]">
                {STAGE_ORDER.map((stage, i) => (
                  <div key={stage} className="flex items-stretch gap-1 flex-1">
                    <PipelineStage stage={stage} agents={byStage[stage] ?? []} />
                    {i < STAGE_ORDER.length - 1 && (
                      <div className="pipeline-arrow">›</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── TASKS ── */}
        {activeTab === 'tasks' && (
          <div className="flex flex-col gap-3 overflow-y-auto flex-1">
            <div className="rounded-lg border border-factory-border bg-factory-panel overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-factory-border text-slate-600 uppercase tracking-widest">
                    <th className="text-left px-3 py-2">Task</th>
                    <th className="text-left px-3 py-2">Agent</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Time</th>
                    <th className="px-3 py-2 text-right">
                      <button
                        onClick={async () => {
                          await fetch('/api/tasks', { method: 'DELETE' })
                          const done = new Set(tasks.filter(t => t.status === 'completed' || t.status === 'failed').map(t => t.id))
                          setHiddenIds(done)
                          setSelectedTask(null)
                        }}
                        className="text-slate-600 hover:text-red-400 transition-colors text-[10px] uppercase tracking-widest"
                      >
                        Clear done
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-4 text-slate-600 text-center">No tasks yet</td></tr>
                  )}
                  {tasks.filter(t => !hiddenIds.has(t.id)).map(t => (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTask(selectedTask === t.id ? null : t.id)}
                      className="border-b border-factory-border hover:bg-white/5 cursor-pointer"
                    >
                      <td className="px-3 py-2 text-white max-w-[260px] truncate">{t.title}</td>
                      <td className="px-3 py-2" style={{ color: agentColor(t.agent_name) }}>{t.agent_name}</td>
                      <td className="px-3 py-2">
                        <span className={{
                          pending: 'text-slate-500',
                          running: 'text-factory-accent',
                          completed: 'text-factory-green',
                          failed: 'text-red-400',
                        }[t.status]}>
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {new Date(t.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Result panel — shown when a task row is clicked */}
            {selectedTask && (() => {
              const t = tasks.find(t => t.id === selectedTask)
              if (!t) return null
              return (
                <div className="rounded-lg border border-factory-border bg-factory-panel p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap overflow-y-auto max-h-96">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-factory-accent font-bold uppercase tracking-widest text-[10px]">
                      {t.title}
                    </span>
                    <button onClick={() => setSelectedTask(null)} className="text-slate-600 hover:text-slate-400">✕</button>
                  </div>
                  {t.result
                    ? t.result
                    : <span className="text-slate-600">{t.status === 'running' ? 'Working…' : 'No output yet.'}</span>
                  }
                </div>
              )
            })()}
          </div>
        )}

        {/* ── LOG ── */}
        {activeTab === 'log' && (
          <div className="rounded-lg border border-factory-border bg-factory-panel p-3 font-mono text-xs overflow-y-auto flex-1">
            {log.length === 0 && (
              <span className="text-slate-600">No events yet<span className="animate-blink">_</span></span>
            )}
            {log.map((line, i) => (
              <div key={i} className="text-slate-400 leading-relaxed">
                <span className="text-factory-accent">&gt; </span>{line}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
