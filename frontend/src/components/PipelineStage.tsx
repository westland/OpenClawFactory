'use client'
import { AnimatePresence } from 'framer-motion'
import type { AgentState, Stage } from '@/lib/types'
import { STAGE_META, agentColor } from '@/lib/types'
import { AgentSprite } from './AgentSprite'

interface Props {
  stage: Stage
  agents: AgentState[]
}

export function PipelineStage({ stage, agents }: Props) {
  const meta = STAGE_META[stage]
  const occupied = agents.length > 0
  const isActive = occupied && stage !== 'breakroom'

  return (
    <div
      className="flex flex-col rounded-lg overflow-hidden transition-all duration-300"
      style={{
        border: `2px solid ${isActive ? meta.color + '88' : '#1e2d4a'}`,
        background: isActive ? `${meta.color}0a` : '#0f1629',
        boxShadow: isActive ? `0 0 16px ${meta.color}22` : 'none',
        minWidth: 110,
        flex: 1,
      }}
    >
      {/* Stage header */}
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-bold uppercase tracking-widest"
        style={{
          borderBottom: `1px solid ${isActive ? meta.color + '44' : '#1e2d4a'}`,
          color: isActive ? meta.color : '#475569',
          background: isActive ? `${meta.color}15` : 'transparent',
        }}
      >
        <span className="text-base leading-none">{meta.icon}</span>
        <span className="flex-1">{meta.label}</span>
        {occupied && (
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
            style={{ background: `${meta.color}33`, color: meta.color }}
          >
            {agents.length}
          </span>
        )}
      </div>

      {/* Floor — where agents stand */}
      <div
        className="relative flex-1 flex flex-col items-center justify-start gap-2 p-2 overflow-hidden"
        style={{
          minHeight: 160,
          backgroundImage: isActive
            ? `repeating-linear-gradient(0deg,transparent,transparent 11px,${meta.color}08 11px,${meta.color}08 12px),
               repeating-linear-gradient(90deg,transparent,transparent 11px,${meta.color}08 11px,${meta.color}08 12px)`
            : 'repeating-linear-gradient(0deg,transparent,transparent 11px,#1e2d4a44 11px,#1e2d4a44 12px),repeating-linear-gradient(90deg,transparent,transparent 11px,#1e2d4a44 11px,#1e2d4a44 12px)',
        }}
      >
        {/* Scan line when active */}
        {isActive && (
          <div
            className="pointer-events-none absolute left-0 right-0 h-0.5 animate-scan opacity-40"
            style={{ background: `linear-gradient(90deg,transparent,${meta.color},transparent)` }}
          />
        )}

        <AnimatePresence>
          {agents.map(a => (
            <AgentSprite
              key={a.name}
              name={a.name}
              stage={a.stage}
              color={agentColor(a.name)}
              taskTitle={a.task_title}
            />
          ))}
        </AnimatePresence>

        {!occupied && (
          <span className="text-[10px] text-slate-700 mt-auto mb-2 select-none">empty</span>
        )}
      </div>

      {/* Stage description */}
      <div className="px-2 py-1 text-[9px] text-slate-600 border-t border-factory-border">
        {meta.desc}
      </div>
    </div>
  )
}
