'use client'
import { motion } from 'framer-motion'
import type { Stage } from '@/lib/types'

// Pixel-art SVG sprites per agent name (28×40, crispEdges)
const SPRITES: Record<string, string> = {
  Henry: `<svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
    <rect x="6" y="0" width="16" height="14" fill="#22d3ee"/>
    <rect x="6" y="0" width="16" height="2" fill="#0e7490"/>
    <rect x="8" y="3" width="4" height="4" fill="#fff"/>
    <rect x="16" y="3" width="4" height="4" fill="#fff"/>
    <rect x="9" y="4" width="2" height="2" fill="#083344"/>
    <rect x="17" y="4" width="2" height="2" fill="#083344"/>
    <rect x="10" y="10" width="8" height="2" fill="#0e7490"/>
    <rect x="2" y="15" width="24" height="16" fill="#0891b2"/>
    <rect x="5" y="17" width="18" height="12" fill="#fff"/>
    <rect x="6" y="18" width="16" height="1" fill="#67e8f9"/>
    <rect x="6" y="20" width="11" height="1" fill="#67e8f9"/>
    <rect x="6" y="22" width="13" height="1" fill="#67e8f9"/>
    <rect x="6" y="24" width="8" height="1" fill="#67e8f9"/>
    <rect x="6" y="26" width="14" height="1" fill="#67e8f9"/>
    <rect x="5" y="32" width="8" height="8" fill="#0e7490"/>
    <rect x="15" y="32" width="8" height="8" fill="#0e7490"/>
  </svg>`,

  Charlie: `<svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
    <rect x="6" y="0" width="16" height="14" fill="#fbbf24"/>
    <rect x="6" y="0" width="16" height="2" fill="#b45309"/>
    <rect x="8" y="3" width="4" height="4" fill="#fff"/>
    <rect x="16" y="3" width="4" height="4" fill="#fff"/>
    <rect x="9" y="4" width="2" height="2" fill="#451a03"/>
    <rect x="17" y="4" width="2" height="2" fill="#451a03"/>
    <rect x="9" y="10" width="10" height="2" fill="#92400e"/>
    <rect x="2" y="15" width="24" height="16" fill="#d97706"/>
    <rect x="5" y="17" width="18" height="12" fill="#fef3c7"/>
    <rect x="6" y="19" width="4" height="8" fill="#fbbf24"/>
    <rect x="12" y="18" width="10" height="2" fill="#fbbf24"/>
    <rect x="12" y="21" width="10" height="2" fill="#fbbf24"/>
    <rect x="12" y="24" width="7" height="2" fill="#fbbf24"/>
    <rect x="5" y="32" width="8" height="8" fill="#b45309"/>
    <rect x="15" y="32" width="8" height="8" fill="#b45309"/>
  </svg>`,

  Sarah: `<svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
    <rect x="6" y="0" width="16" height="14" fill="#4ade80"/>
    <rect x="6" y="0" width="16" height="2" fill="#15803d"/>
    <rect x="8" y="3" width="4" height="4" fill="#fff"/>
    <rect x="16" y="3" width="4" height="4" fill="#fff"/>
    <rect x="9" y="4" width="2" height="2" fill="#14532d"/>
    <rect x="17" y="4" width="2" height="2" fill="#14532d"/>
    <rect x="10" y="10" width="8" height="2" fill="#16a34a"/>
    <rect x="2" y="15" width="24" height="16" fill="#22c55e"/>
    <rect x="5" y="17" width="18" height="12" fill="#f0fdf4"/>
    <rect x="6" y="26" width="16" height="1" fill="#22c55e"/>
    <rect x="6" y="25" width="2" height="2" fill="#4ade80"/>
    <rect x="10" y="23" width="2" height="4" fill="#4ade80"/>
    <rect x="14" y="21" width="2" height="6" fill="#4ade80"/>
    <rect x="18" y="19" width="2" height="8" fill="#ef4444"/>
    <rect x="5" y="32" width="8" height="8" fill="#15803d"/>
    <rect x="15" y="32" width="8" height="8" fill="#15803d"/>
  </svg>`,

  Max: `<svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
    <rect x="6" y="0" width="16" height="14" fill="#a78bfa"/>
    <rect x="6" y="0" width="16" height="2" fill="#6d28d9"/>
    <rect x="8" y="3" width="4" height="4" fill="#fff"/>
    <rect x="16" y="3" width="4" height="4" fill="#fff"/>
    <rect x="9" y="4" width="2" height="2" fill="#2e1065"/>
    <rect x="17" y="4" width="2" height="2" fill="#2e1065"/>
    <rect x="9" y="10" width="10" height="2" fill="#7c3aed"/>
    <rect x="2" y="15" width="24" height="16" fill="#8b5cf6"/>
    <rect x="5" y="17" width="18" height="12" fill="#ede9fe"/>
    <rect x="7" y="19" width="14" height="8" fill="#c4b5fd"/>
    <rect x="8" y="20" width="5" height="6" fill="#7c3aed"/>
    <rect x="15" y="20" width="5" height="6" fill="#7c3aed"/>
    <rect x="9" y="21" width="3" height="2" fill="#ddd6fe"/>
    <rect x="16" y="21" width="3" height="2" fill="#ddd6fe"/>
    <rect x="5" y="32" width="8" height="8" fill="#6d28d9"/>
    <rect x="15" y="32" width="8" height="8" fill="#6d28d9"/>
  </svg>`,
}

const DEFAULT_SPRITE = `<svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
  <rect x="6" y="0" width="16" height="14" fill="#94a3b8"/>
  <rect x="8" y="3" width="4" height="4" fill="#fff"/>
  <rect x="16" y="3" width="4" height="4" fill="#fff"/>
  <rect x="9" y="4" width="2" height="2" fill="#1e293b"/>
  <rect x="17" y="4" width="2" height="2" fill="#1e293b"/>
  <rect x="2" y="15" width="24" height="16" fill="#64748b"/>
  <rect x="5" y="32" width="8" height="8" fill="#475569"/>
  <rect x="15" y="32" width="8" height="8" fill="#475569"/>
</svg>`

function spriteAnimation(stage: Stage) {
  if (stage === 'build' || stage === 'research') return 'rock'
  if (stage === 'ship') return 'rock'
  return 'bob'
}

interface Props {
  name: string
  stage: Stage
  color: string
  taskTitle?: string
}

export function AgentSprite({ name, stage, color, taskTitle }: Props) {
  const svg = SPRITES[name] ?? DEFAULT_SPRITE
  const anim = spriteAnimation(stage)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.6 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="flex flex-col items-center gap-1 w-16"
    >
      {/* Sprite */}
      <motion.div
        animate={
          anim === 'rock'
            ? { rotate: [-6, 6, -6] }
            : { y: [0, -4, 0] }
        }
        transition={{ duration: anim === 'rock' ? 0.7 : 2.2, repeat: Infinity, ease: 'easeInOut' }}
        dangerouslySetInnerHTML={{ __html: svg }}
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Name badge */}
      <span
        className="text-[10px] font-bold leading-none px-1 py-0.5 rounded"
        style={{ color, background: `${color}22`, border: `1px solid ${color}44` }}
      >
        {name}
      </span>

      {/* Task title (truncated) */}
      {taskTitle && (
        <span className="text-[9px] text-slate-400 text-center leading-tight max-w-[60px] overflow-hidden line-clamp-2">
          {taskTitle}
        </span>
      )}
    </motion.div>
  )
}
