export interface Project {
  id:           string
  name:         string
  emoji:        string
  cwd:          string
  systemPrompt: string
  allowedTools: string[]
  createdAt:    number
  updatedAt:    number
}

export interface Session {
  id:              string
  projectId:       string
  title:           string
  claudeSessionId: string | null
  createdAt:       number
  updatedAt:       number
}

export interface Message {
  id:        string
  sessionId: string
  role:      'user' | 'assistant'
  content:   string
  images?:   string[]   // base64 thumbnails (stored for display only)
  toolUses?: ToolUse[]
  ts:        number
}

export interface ToolUse {
  id:        string
  toolName:  string
  toolLabel: string
  input:     string
  output?:   string
  state:     'running' | 'done' | 'error'
}

export interface StreamState {
  text:       string
  thinkText:  string
  isThinking: boolean
  thinkStart: number | null
  tools:      Record<string, ToolUse>  // toolUseId → ToolUse
}

export type ConnState =
  | { status: 'disconnected' }
  | { status: 'connecting' }
  | { status: 'connected'; latencyMs?: number }
  | { status: 'reconnecting'; attempt: number; nextIn: number }
