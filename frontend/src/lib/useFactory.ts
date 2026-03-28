'use client'
import { useEffect, useRef, useState } from 'react'
import type { AgentState, Task, WSEvent } from './types'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws'
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export function useFactory() {
  const [agents, setAgents] = useState<AgentState[]>([])
  const [tasks, setTasks]   = useState<Task[]>([])
  const [connected, setConnected] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  const addLog = (msg: string) =>
    setLog(prev => [`${new Date().toLocaleTimeString()} ${msg}`, ...prev].slice(0, 60))

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>

    function connect() {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        addLog('Connected to factory')
      }

      ws.onclose = () => {
        setConnected(false)
        addLog('Disconnected — reconnecting in 3s…')
        reconnectTimer = setTimeout(connect, 3000)
      }

      ws.onerror = () => {
        addLog('WebSocket error')
      }

      ws.onmessage = (e) => {
        try {
          const event: WSEvent = JSON.parse(e.data)
          handleEvent(event)
        } catch { /* ignore */ }
      }
    }

    function handleEvent(event: WSEvent) {
      switch (event.type) {
        case 'init': {
          const d = event.data as { agents: AgentState[]; tasks: Task[] }
          setAgents(d.agents ?? [])
          setTasks(d.tasks ?? [])
          break
        }
        case 'agent_moved': {
          const d = event.data as { agent: string; stage: string; task_title: string }
          setAgents(prev => prev.map(a =>
            a.name === d.agent
              ? { ...a, stage: d.stage as AgentState['stage'], task_title: d.task_title }
              : a
          ))
          addLog(`${d.agent} → ${d.stage}${d.task_title ? ': ' + d.task_title : ''}`)
          break
        }
        case 'task_created': {
          const t = event.data as unknown as Task
          setTasks(prev => [t, ...prev].slice(0, 50))
          addLog(`New task: ${t.title} → ${t.agent_name}`)
          break
        }
        case 'task_updated': {
          const d = event.data as Partial<Task> & { id: string }
          setTasks(prev => prev.map(t => t.id === d.id ? { ...t, ...d } : t))
          break
        }
        case 'message': {
          const d = event.data as { agent: string; content: string }
          addLog(`${d.agent}: ${d.content.slice(0, 80)}`)
          break
        }
      }
    }

    connect()
    return () => {
      clearTimeout(reconnectTimer)
      wsRef.current?.close()
    }
  }, [])

  async function assignTask(title: string, description = '', agent = '') {
    const res = await fetch(`${API_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, agent }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'Failed to assign task')
    }
    return res.json()
  }

  return { agents, tasks, connected, log, assignTask }
}
