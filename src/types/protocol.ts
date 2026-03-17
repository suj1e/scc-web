// ── Client → Server ──────────────────────────────────────────

export type ClientMessage =
  | { type: 'session.create'; session_id: string; project_id: string; cwd: string; system_prompt?: string; allowed_tools?: string[]; permission_mode?: string }
  | { type: 'session.delete'; session_id: string }
  | { type: 'session.list' }
  | { type: 'history.get';    session_id: string }
  | { type: 'message.send';   session_id: string; content: string; images?: ImagePayload[] }
  | { type: 'message.cancel'; session_id: string }
  | { type: 'ping' }

export interface ImagePayload {
  base64:     string
  media_type: string
}

// ── Server → Client ──────────────────────────────────────────

export type ServerEvent =
  | { type: 'pong' }
  | { type: 'session.created';      session_id: string; cwd: string }
  | { type: 'session.deleted';      session_id: string }
  | { type: 'session.list.result';  sessions: SessionInfo[] }
  | { type: 'history.result';       session_id: string; messages: HistoryMsg[] }
  | { type: 'stream.text';          session_id: string; delta: string }
  | { type: 'stream.thinking';      session_id: string; delta: string }
  | { type: 'stream.tool_start';    session_id: string; tool_use_id: string; tool_name: string; tool_label: string; tool_input: string }
  | { type: 'stream.tool_done';     session_id: string; tool_use_id: string; tool_output: string }
  | { type: 'stream.done';          session_id: string; session_resumed_id?: string }
  | { type: 'stream.error';         session_id: string; message: string }
  | { type: 'stream.cancelled';     session_id: string }
  | { type: 'error';                code: string; message: string }

export interface SessionInfo {
  session_id: string
  project_id: string
  cwd:        string
  created_at: string
  updated_at: string
  title?:     string
}

export interface HistoryMsg {
  role:      string
  content:   string
  timestamp: string
}
