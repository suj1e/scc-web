import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '@/store'
import type { ClientMessage, ServerEvent } from '@/types/protocol'

const MAX_DELAY = 30_000
const PING_INTERVAL = 25_000

export function useWS() {
  const ws          = useRef<WebSocket | null>(null)
  const retryCount  = useRef(0)
  const retryTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingTimer   = useRef<ReturnType<typeof setInterval> | null>(null)
  const pingStart   = useRef<number | null>(null)

  const { serverURL, setConnState, recordLatency, handleEvent, sessions } = useStore()

  const send = useCallback((msg: ClientMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg))
    }
  }, [])

  const stopPing = () => {
    if (pingTimer.current) clearInterval(pingTimer.current)
    pingTimer.current = null
  }

  const startPing = useCallback(() => {
    stopPing()
    pingTimer.current = setInterval(() => {
      pingStart.current = Date.now()
      send({ type: 'ping' })
    }, PING_INTERVAL)
  }, [send])

  const connect = useCallback((url: string) => {
    if (ws.current) { ws.current.onclose = null; ws.current.close() }
    if (retryTimer.current) clearTimeout(retryTimer.current)

    setConnState({ status: 'connecting' })
    const socket = new WebSocket(url)
    ws.current = socket

    socket.onopen = () => {
      retryCount.current = 0
      setConnState({ status: 'connected' })
      startPing()
      // Re-register all persisted sessions
      const { sessions } = useStore.getState()
      sessions.forEach(s => {
        const project = useStore.getState().projects.find(p => p.id === s.projectId)
        socket.send(JSON.stringify({
          type:          'session.create',
          session_id:    s.id,
          project_id:    s.projectId,
          cwd:           project?.cwd ?? '/',
          system_prompt: project?.systemPrompt || undefined,
          allowed_tools: project?.allowedTools,
        } satisfies ClientMessage))
      })
    }

    socket.onmessage = (e) => {
      let event: ServerEvent
      try { event = JSON.parse(e.data) }
      catch { return }

      if (event.type === 'pong') {
        if (pingStart.current !== null) {
          recordLatency(Date.now() - pingStart.current)
          pingStart.current = null
        }
        return
      }

      handleEvent(event)
    }

    socket.onclose = () => {
      stopPing()
      const attempt = ++retryCount.current
      const delay   = Math.min(2 * Math.pow(2, attempt - 1) * 1000, MAX_DELAY)
      setConnState({ status: 'reconnecting', attempt, nextIn: Math.round(delay / 1000) })
      retryTimer.current = setTimeout(() => connect(url), delay)
    }

    socket.onerror = () => { /* onclose handles it */ }
  }, [setConnState, startPing, recordLatency, handleEvent])

  // Connect / reconnect when serverURL changes
  useEffect(() => {
    if (!serverURL) return
    connect(serverURL)
    return () => {
      stopPing()
      if (retryTimer.current) clearTimeout(retryTimer.current)
      ws.current?.close()
    }
  }, [serverURL, connect])

  return { send }
}
