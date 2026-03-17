import { useState } from 'react'
import { useStore } from '@/store'

export function GeekStatus() {
  const [expanded, setExpanded] = useState(false)
  const { connState, latencyHistory, totalIn, totalOut, serverURL } = useStore()

  const last = latencyHistory[latencyHistory.length - 1]
  const avg  = latencyHistory.length
    ? Math.round(latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length)
    : null
  const p99  = latencyHistory.length ? Math.max(...latencyHistory) : null
  const max  = p99 ?? 1

  const fmt = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n)

  const dotColor = connState.status === 'connected'
    ? last !== undefined && last < 100 ? 'bg-sgreen' : last !== undefined && last < 300 ? 'bg-yellow-500' : 'bg-sgreen'
    : connState.status === 'reconnecting' ? 'bg-yellow-500'
    : 'bg-red-500'

  const latencyColor = last === undefined ? 'text-tx-m'
    : last < 100 ? 'text-sgreen' : last < 300 ? 'text-yellow-600' : 'text-red-500'

  return (
    <div className="border-t border-div flex-shrink-0 bg-cream">

      {expanded && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-3.5 py-3 border-b border-div">
          {/* Latency */}
          <div>
            <div className="text-[9px] font-bold text-tx-p tracking-widest uppercase mb-1">延迟</div>
            <div className={`font-mono text-[15px] font-semibold ${latencyColor}`}>
              {last !== undefined ? `${last} ms` : '—'}
            </div>
            {avg && <div className="font-mono text-[9px] text-tx-p">avg {avg}ms · p99 {p99}ms</div>}
          </div>

          {/* Model */}
          <div>
            <div className="text-[9px] font-bold text-tx-p tracking-widest uppercase mb-1">模型</div>
            <div className="font-mono text-[11px] font-semibold text-tx-m leading-tight">claude-sonnet-4-5</div>
            <div className="font-mono text-[9px] text-tx-p">stream · tool_use</div>
          </div>

          {/* Tokens */}
          <div>
            <div className="text-[9px] font-bold text-tx-p tracking-widest uppercase mb-1">Tokens</div>
            <div className="font-mono text-[15px] font-semibold text-orange">{fmt(totalIn + totalOut)}</div>
            <div className="font-mono text-[9px] text-tx-p">↑{fmt(totalIn)} in · ↓{fmt(totalOut)} out</div>
          </div>

          {/* Status */}
          <div>
            <div className="text-[9px] font-bold text-tx-p tracking-widest uppercase mb-1">状态</div>
            <div className="font-mono text-[11px] font-semibold text-tx-m capitalize">{connState.status}</div>
          </div>

          {/* Sparkline */}
          {latencyHistory.length > 1 && (
            <div className="col-span-2">
              <div className="text-[9px] font-bold text-tx-p tracking-widest uppercase mb-1.5">延迟历史</div>
              <div className="flex items-end gap-0.5 h-6">
                {latencyHistory.map((v, i) => {
                  const isLast = i === latencyHistory.length - 1
                  const isHigh = v === max
                  const h = Math.max(10, Math.round((v / max) * 100))
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-t-sm ${isLast ? 'bg-orange' : isHigh ? 'bg-orange-p' : 'bg-cream-dd'}`}
                      style={{ height: `${h}%` }}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compact strip */}
      <button
        className="w-full flex items-center gap-1.5 px-3.5 py-1.5 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
        <span className="font-mono text-[9.5px] text-tx-p truncate flex-1">
          {[
            last !== undefined ? `${last}ms` : null,
            'claude-sonnet-4-5',
            totalIn || totalOut ? `↑${fmt(totalIn)} ↓${fmt(totalOut)}` : null,
            serverURL || null,
          ].filter(Boolean).join(' · ')}
        </span>
        <span className={`text-tx-p text-[8px] transition-transform ${expanded ? 'rotate-180' : ''}`}>▲</span>
      </button>
    </div>
  )
}
