import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project, Session, Message, StreamState, ConnState, ToolUse } from '@/types/app'
import type { ServerEvent } from '@/types/protocol'

// ── Helpers ──────────────────────────────────────────────────

function uuid() { return crypto.randomUUID() }
function now()  { return Date.now() }

const emptyStream = (): StreamState => ({
  text: '', thinkText: '', isThinking: false, thinkStart: null, tools: {},
})

// ── Store shape ──────────────────────────────────────────────

interface AppStore {
  // Connection
  serverURL:    string
  connState:    ConnState
  latencyHistory: number[]
  totalIn:      number
  totalOut:     number
  setServerURL: (url: string) => void
  setConnState: (s: ConnState) => void
  recordLatency:(ms: number) => void

  // Projects
  projects:     Project[]
  upsertProject:(p: Project) => void
  deleteProject:(id: string) => void

  // Sessions
  sessions:       Session[]
  activeSessionId: string | null
  setActiveSession:(id: string | null) => void
  upsertSession:  (s: Session) => void
  deleteSession:  (id: string) => void
  setClaudeSessionId: (sessionId: string, claudeId: string) => void

  // Messages
  messages:     Record<string, Message[]>   // sessionId → Message[]
  appendMessage:(sessionId: string, msg: Message) => void
  clearMessages:(sessionId: string) => void

  // Streaming — NOT persisted
  streams: Record<string, StreamState>       // sessionId → StreamState
  handleEvent: (event: ServerEvent) => void
  finalizeStream: (sessionId: string, claudeSessionId?: string) => void
}

// ── Store ─────────────────────────────────────────────────────

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({

      // ── Connection ──────────────────────────────────────────
      serverURL:      '',
      connState:      { status: 'disconnected' },
      latencyHistory: [],
      totalIn:        0,
      totalOut:       0,

      setServerURL: (url) => set({ serverURL: url }),
      setConnState: (s)   => set({ connState: s }),

      recordLatency: (ms) => set((state) => {
        const hist = [...state.latencyHistory, ms].slice(-12)
        return {
          latencyHistory: hist,
          connState: { status: 'connected', latencyMs: ms },
        }
      }),

      // ── Projects ────────────────────────────────────────────
      projects: [],

      upsertProject: (p) => set((state) => {
        const idx = state.projects.findIndex(x => x.id === p.id)
        const updated = idx >= 0
          ? state.projects.map((x, i) => i === idx ? p : x)
          : [...state.projects, p]
        return { projects: updated }
      }),

      deleteProject: (id) => set((state) => ({
        projects: state.projects.filter(p => p.id !== id),
        sessions: state.sessions.filter(s => s.projectId !== id),
      })),

      // ── Sessions ────────────────────────────────────────────
      sessions:        [],
      activeSessionId: null,

      setActiveSession: (id) => set({ activeSessionId: id }),

      upsertSession: (s) => set((state) => {
        const idx = state.sessions.findIndex(x => x.id === s.id)
        const updated = idx >= 0
          ? state.sessions.map((x, i) => i === idx ? s : x)
          : [s, ...state.sessions]
        return { sessions: updated }
      }),

      deleteSession: (id) => set((state) => {
        const { [id]: _, ...restMsgs }    = state.messages
        const { [id]: __, ...restStreams } = state.streams
        return {
          sessions:        state.sessions.filter(s => s.id !== id),
          messages:        restMsgs,
          streams:         restStreams,
          activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
        }
      }),

      setClaudeSessionId: (sessionId, claudeId) => set((state) => ({
        sessions: state.sessions.map(s =>
          s.id === sessionId ? { ...s, claudeSessionId: claudeId } : s
        ),
      })),

      // ── Messages ────────────────────────────────────────────
      messages: {},

      appendMessage: (sessionId, msg) => set((state) => ({
        messages: {
          ...state.messages,
          [sessionId]: [...(state.messages[sessionId] ?? []), msg],
        },
        sessions: state.sessions.map(s =>
          s.id === sessionId ? { ...s, updatedAt: now() } : s
        ),
      })),

      clearMessages: (sessionId) => set((state) => ({
        messages: { ...state.messages, [sessionId]: [] },
      })),

      // ── Streaming ───────────────────────────────────────────
      streams: {},

      handleEvent: (event) => {
        const state = get()

        if (event.type === 'pong') return  // handled by WSClient

        if (event.type === 'stream.thinking') {
          const sid = event.session_id
          const prev = state.streams[sid] ?? emptyStream()
          set({ streams: {
            ...state.streams,
            [sid]: {
              ...prev,
              isThinking: true,
              thinkStart: prev.thinkStart ?? now(),
              thinkText:  prev.thinkText + event.delta,
            },
          }})
          return
        }

        if (event.type === 'stream.text') {
          const sid = event.session_id
          const prev = state.streams[sid] ?? emptyStream()
          set({ streams: {
            ...state.streams,
            [sid]: {
              ...prev,
              isThinking: false,
              text: prev.text + event.delta,
            },
          }})
          return
        }

        if (event.type === 'stream.tool_start') {
          const sid = event.session_id
          const prev = state.streams[sid] ?? emptyStream()
          const tool: ToolUse = {
            id:        event.tool_use_id,
            toolName:  event.tool_name,
            toolLabel: event.tool_label,
            input:     event.tool_input,
            state:     'running',
          }
          set({ streams: {
            ...state.streams,
            [sid]: { ...prev, tools: { ...prev.tools, [event.tool_use_id]: tool } },
          }})
          return
        }

        if (event.type === 'stream.tool_done') {
          const sid = event.session_id
          const prev = state.streams[sid] ?? emptyStream()
          const tool = prev.tools[event.tool_use_id]
          if (!tool) return
          set({ streams: {
            ...state.streams,
            [sid]: {
              ...prev,
              tools: {
                ...prev.tools,
                [event.tool_use_id]: { ...tool, output: event.tool_output, state: 'done' },
              },
            },
          }})
          return
        }

        if (event.type === 'stream.done') {
          get().finalizeStream(event.session_id, event.session_resumed_id)
          return
        }

        if (event.type === 'stream.error') {
          const sid = event.session_id
          const prev = state.streams[sid] ?? emptyStream()
          set({ streams: {
            ...state.streams,
            [sid]: { ...prev, text: prev.text + `\n\n⚠️ ${event.message}` },
          }})
          get().finalizeStream(sid)
          return
        }

        if (event.type === 'stream.cancelled') {
          get().finalizeStream(event.session_id)
          return
        }
      },

      finalizeStream: (sessionId, claudeSessionId) => {
        const state = get()
        const stream = state.streams[sessionId]
        if (!stream) return

        // Save assistant message if there's text
        if (stream.text.trim()) {
          const toolUses = Object.values(stream.tools)
          const msg: Message = {
            id:       uuid(),
            sessionId,
            role:     'assistant',
            content:  stream.text,
            toolUses: toolUses.length > 0 ? toolUses : undefined,
            ts:       now(),
          }
          get().appendMessage(sessionId, msg)

          // Auto-title session from first user message
          const session = state.sessions.find(s => s.id === sessionId)
          if (session?.title === '新对话') {
            const msgs = state.messages[sessionId] ?? []
            const firstUser = msgs.find(m => m.role === 'user')
            if (firstUser) {
              get().upsertSession({
                ...session,
                title: firstUser.content.slice(0, 30),
              })
            }
          }
        }

        // Save claude session id for resume
        if (claudeSessionId) {
          get().setClaudeSessionId(sessionId, claudeSessionId)
        }

        // Clear stream state
        const { [sessionId]: _, ...rest } = get().streams
        set({ streams: rest })
      },
    }),

    {
      name: 'scc-store',
      // Don't persist stream state
      partialize: (state) => ({
        serverURL:      state.serverURL,
        projects:       state.projects,
        sessions:       state.sessions,
        messages:       state.messages,
        latencyHistory: state.latencyHistory,
        totalIn:        state.totalIn,
        totalOut:       state.totalOut,
      }),
    }
  )
)
