import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { useStore } from '@/store'
import type { Message, ToolUse, StreamState } from '@/types/app'

interface Props { sessionId: string }

export function MessageList({ sessionId }: Props) {
  const messages = useStore(s => s.messages[sessionId] ?? [])
  const stream   = useStore(s => s.streams[sessionId])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, stream?.text, stream?.thinkText])

  return (
    <div className="flex-1 overflow-y-auto py-4">

      {messages.map(msg =>
        msg.role === 'user'
          ? <UserBubble key={msg.id} message={msg} />
          : <AssistantMessage key={msg.id} message={msg} />
      )}

      {/* Live stream */}
      {stream && <LiveStream stream={stream} />}

      <div ref={bottomRef} className="h-3" />
    </div>
  )
}

// ── User bubble ───────────────────────────────────────────────

function UserBubble({ message }: { message: Message }) {
  return (
    <div className="flex justify-end px-4 py-1">
      <div className="max-w-[75%] bg-orange text-white px-4 py-2.5 rounded-[18px] rounded-br-[4px] text-[15px] leading-relaxed whitespace-pre-wrap break-words">
        {message.content}
      </div>
    </div>
  )
}

// ── Assistant message (saved) ─────────────────────────────────

function AssistantMessage({ message }: { message: Message }) {
  return (
    <div className="px-4 py-1.5">
      {message.toolUses && message.toolUses.length > 0 && (
        <div className="mb-2 ml-9 space-y-1.5">
          {message.toolUses.map(t => <ToolCard key={t.id} tool={t} />)}
        </div>
      )}
      <div className="flex items-start gap-2.5">
        <Avatar />
        <div className="flex-1 min-w-0 text-[15px] text-tx prose-scc">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '')
                return match ? (
                  <SyntaxHighlighter
                    language={match[1]}
                    PreTag="div"
                    style={darkTheme}
                    customStyle={{ margin: '8px 0', borderRadius: '10px', fontSize: '12px' }}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>{children}</code>
                )
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

// ── Live stream ───────────────────────────────────────────────

function LiveStream({ stream }: { stream: StreamState }) {
  const thinkDur = stream.thinkStart
    ? ((Date.now() - stream.thinkStart) / 1000).toFixed(1)
    : null

  return (
    <div className="px-4 py-1.5">

      {/* Think block */}
      {(stream.isThinking || stream.thinkText) && (
        <div className="ml-9 mb-2 rounded-xl border border-think-br bg-think-bg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className={`w-2 h-2 rounded-full bg-think-pu flex-shrink-0 ${stream.isThinking ? 'think-pulse' : 'opacity-50'}`} />
            <span className="text-[12px] italic font-medium text-think-tx flex-1">
              {stream.isThinking ? '正在思考…' : `已思考 ${thinkDur} 秒`}
            </span>
          </div>
          {stream.thinkText && (
            <div className="border-t border-think-br px-3.5 py-2.5 font-serif italic text-[13px] text-think-tx leading-relaxed">
              {stream.thinkText}
            </div>
          )}
        </div>
      )}

      {/* Tool cards */}
      {Object.values(stream.tools).length > 0 && (
        <div className="ml-9 mb-2 space-y-1.5">
          {Object.values(stream.tools).map(t => <ToolCard key={t.id} tool={t} />)}
        </div>
      )}

      {/* Streaming text */}
      {(stream.text || stream.isThinking) && (
        <div className="flex items-start gap-2.5">
          <Avatar />
          <div className="flex-1 min-w-0 text-[15px] text-tx prose-scc">
            {stream.text ? (
              <>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{stream.text}</ReactMarkdown>
                {!stream.isThinking && (
                  <span className="inline-block w-0.5 h-4 bg-orange rounded-sm blink align-middle ml-0.5" />
                )}
              </>
            ) : (
              <TypingDots />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tool card ─────────────────────────────────────────────────

function ToolCard({ tool }: { tool: ToolUse }) {
  return (
    <details className="rounded-xl border border-tool-br bg-tool-bg overflow-hidden" open={tool.state === 'running'}>
      <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer list-none">
        <span className="w-5 h-5 rounded-[5px] bg-cream-dd flex items-center justify-center text-[11px] flex-shrink-0">🔧</span>
        <span className="text-[12px] font-semibold text-tx-m flex-1">{tool.toolLabel}</span>
        {tool.state === 'running' && (
          <span className="text-[11px] text-orange flex items-center gap-1">
            <span className="inline-block w-3 h-3 border-2 border-orange border-t-transparent rounded-full animate-spin" />
            执行中
          </span>
        )}
        {tool.state === 'done' && <span className="text-[11px] text-sgreen">✓ 完成</span>}
        {tool.state === 'error' && <span className="text-[11px] text-red-500">✗ 失败</span>}
      </summary>
      <div className="border-t border-tool-br px-3 py-2.5 space-y-2">
        <div className="font-mono text-[11.5px] text-tx-m bg-cream-dd px-2 py-1.5 rounded-md whitespace-pre-wrap break-all">
          {tool.input}
        </div>
        {tool.output && (
          <div className="font-mono text-[11px] text-tx-l leading-relaxed whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
            {tool.output}
          </div>
        )}
      </div>
    </details>
  )
}

// ── Misc ──────────────────────────────────────────────────────

function Avatar() {
  return (
    <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-orange-l to-orange flex-shrink-0 mt-0.5 flex items-center justify-center text-white text-[12px]">
      ✦
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0,1,2].map(i => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-tx-p"
          style={{ animation: `blink 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  )
}

// Minimal dark theme for code blocks
const darkTheme: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': { color: '#D4C8B8', background: 'none' },
  'token.comment':  { color: '#6A5A4A' },
  'token.keyword':  { color: '#E07A4A' },
  'token.string':   { color: '#90C880' },
  'token.number':   { color: '#A090D8' },
  'token.function': { color: '#F0C060' },
  'token.operator': { color: '#D4C8B8' },
  'token.punctuation': { color: '#9A8A7A' },
}
