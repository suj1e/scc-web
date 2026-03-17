import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { useStore } from '@/store'

const BUILTINS = [
  { icon: '🗑️', cmd: '/clear',   desc: '清空当前对话' },
  { icon: '📋', cmd: '/snippet', desc: '插入自定义 Prompt 片段' },
]

interface Props {
  sessionId: string
  send:      (msg: any) => void
}

export function InputBar({ sessionId, send }: Props) {
  const [text, setText] = useState('')
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashIndex, setSlashIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { appendMessage, clearMessages, streams, sessions } = useStore()
  const isStreaming = !!streams[sessionId]
  const session     = sessions.find(s => s.id === sessionId)

  const snippets: Array<{ name: string; content: string }> =
    JSON.parse(localStorage.getItem('scc_snippets') ?? '[]')

  const slashQuery = text.startsWith('/') && !text.includes(' ')
    ? text.slice(1).toLowerCase()
    : ''

  const filteredCommands = slashOpen ? [
    ...BUILTINS.filter(b => b.cmd.slice(1).startsWith(slashQuery)),
    ...snippets
      .filter(s => s.name.toLowerCase().startsWith(slashQuery))
      .map(s => ({ icon: '📋', cmd: s.name, desc: s.content.slice(0, 40), isSnippet: true, content: s.content })),
  ] : []

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [text])

  function onTextChange(val: string) {
    setText(val)
    setSlashOpen(val.startsWith('/') && !val.includes(' '))
    setSlashIndex(0)
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (slashOpen && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown')  { e.preventDefault(); setSlashIndex(i => (i+1) % filteredCommands.length) }
      if (e.key === 'ArrowUp')    { e.preventDefault(); setSlashIndex(i => (i-1+filteredCommands.length) % filteredCommands.length) }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applyCommand(filteredCommands[slashIndex]); return }
      if (e.key === 'Escape')     { setSlashOpen(false); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      doSend()
    }
  }

  function applyCommand(cmd: typeof filteredCommands[0]) {
    if (!cmd) return
    if ('isSnippet' in cmd && cmd.isSnippet) {
      setText((cmd as any).content)
    } else if (cmd.cmd === '/clear') {
      clearMessages(sessionId)
    } else if (cmd.cmd === '/snippet') {
      // open snippet manager — for now just close
    }
    setText('')
    setSlashOpen(false)
    textareaRef.current?.focus()
  }

  function doSend() {
    const content = text.trim()
    if (!content || isStreaming) return

    // Client-side slash commands
    if (content.startsWith('/')) {
      const cmd = content.slice(1).trim().toLowerCase()
      if (cmd === 'clear') {
        clearMessages(sessionId)
        setText('')
        return
      }
    }

    // Save user message locally
    appendMessage(sessionId, {
      id:        crypto.randomUUID(),
      sessionId,
      role:      'user',
      content,
      ts:        Date.now(),
    })

    send({
      type:       'message.send',
      session_id: sessionId,
      content,
      ...(session?.claudeSessionId ? { resume: session.claudeSessionId } : {}),
    })

    setText('')
    setSlashOpen(false)
    textareaRef.current?.focus()
  }

  const canSend = text.trim().length > 0 && !isStreaming

  return (
    <div className="relative border-t border-div bg-cream flex-shrink-0">

      {/* Slash popup */}
      {slashOpen && filteredCommands.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 bg-cream border border-div rounded-t-2xl shadow-[0_-8px_24px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="px-4 py-2.5 text-[10px] font-bold text-tx-l tracking-widest uppercase border-b border-div">
            命令
          </div>
          {filteredCommands.map((cmd, i) => (
            <button
              key={cmd.cmd}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left border-b border-div last:border-0 ${i === slashIndex ? 'bg-orange-p' : 'hover:bg-cream-d'}`}
              onMouseEnter={() => setSlashIndex(i)}
              onClick={() => applyCommand(cmd)}
            >
              <span className="w-8 h-8 rounded-[9px] bg-cream-dd flex items-center justify-center text-base flex-shrink-0">
                {cmd.icon}
              </span>
              <div>
                <div className={`text-[13px] font-semibold ${i === slashIndex ? 'text-orange' : 'text-tx'}`}>
                  {cmd.cmd}
                </div>
                <div className="text-[11px] text-tx-l">{cmd.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Input pill */}
      <div className="flex items-end gap-1.5 px-3.5 py-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={e => onTextChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={isStreaming}
          placeholder={isStreaming ? '正在生成…' : '说点什么… (/ 触发命令)'}
          className="flex-1 bg-transparent resize-none outline-none text-[15px] text-tx placeholder:text-tx-p leading-relaxed max-h-[120px] py-1 font-sans"
        />

        {isStreaming ? (
          <button
            onClick={() => send({ type: 'message.cancel', session_id: sessionId })}
            className="w-8 h-8 rounded-full bg-tx-m flex items-center justify-center text-white flex-shrink-0 hover:bg-tx transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <rect x="1" y="1" width="8" height="8" rx="1"/>
            </svg>
          </button>
        ) : (
          <button
            onClick={doSend}
            disabled={!canSend}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 transition-colors ${canSend ? 'bg-orange hover:bg-orange-l' : 'bg-cream-dd cursor-not-allowed'}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        )}
      </div>

      {/* Footer */}
      <StatusFooter />
    </div>
  )
}

function StatusFooter() {
  const { serverURL, connState, latencyHistory } = useStore()
  const last = latencyHistory[latencyHistory.length - 1]

  const parts = [
    last !== undefined ? `${last}ms` : null,
    'claude-sonnet-4-5',
    serverURL || null,
  ].filter(Boolean).join(' · ')

  const dotColor = connState.status === 'connected'    ? '#3A7A4A'
                 : connState.status === 'reconnecting' ? '#C4922A'
                 : '#C84040'

  return (
    <div className="flex items-center gap-1.5 px-3.5 pb-1.5 -mt-0.5">
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
      <span className="font-mono text-[9.5px] text-tx-p truncate">{parts}</span>
    </div>
  )
}
