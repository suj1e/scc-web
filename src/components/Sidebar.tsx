import { useState } from 'react'
import { useStore } from '@/store'
import type { Project, Session } from '@/types/app'

interface Props {
  open:    boolean
  onClose: () => void
  onNewProject: () => void
  onNewSession: (project?: Project) => void
  send: (msg: any) => void
}

export function Sidebar({ open, onClose, onNewProject, onNewSession, send }: Props) {
  const {
    projects, sessions, activeSessionId,
    setActiveSession, deleteSession, deleteProject,
    connState, serverURL, setServerURL, setConnState,
  } = useStore()
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null)

  function switchSession(id: string) {
    setActiveSession(id)
    onClose()
  }

  function handleDeleteSession(e: React.MouseEvent, s: Session) {
    e.stopPropagation()
    send({ type: 'session.delete', session_id: s.id })
    deleteSession(s.id)
  }

  const dot = connState.status === 'connected'    ? 'bg-sgreen'
            : connState.status === 'connecting'   ? 'bg-yellow-500'
            : connState.status === 'reconnecting' ? 'bg-yellow-500 animate-pulse'
            : 'bg-red-500 animate-pulse'

  const statusLabel =
    connState.status === 'connected'    ? connState.latencyMs ? `${connState.latencyMs}ms` : '已连接'
  : connState.status === 'connecting'   ? '连接中…'
  : connState.status === 'reconnecting' ? `重连 #${connState.attempt} · ${connState.nextIn}s`
  : '未连接'

  // Group sessions by project
  const sessionsByProject: Record<string, Session[]> = {}
  const orphanSessions: Session[] = []
  sessions.forEach(s => {
    if (s.projectId && projects.find(p => p.id === s.projectId)) {
      sessionsByProject[s.projectId] = [...(sessionsByProject[s.projectId] ?? []), s]
    } else {
      orphanSessions.push(s)
    }
  })

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/45 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <aside className={`
        fixed md:relative top-0 left-0 bottom-0 z-50
        w-[280px] flex flex-col bg-sb
        transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
        ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
          <span className="font-serif text-xl font-semibold text-sb-text tracking-tight">scc</span>
          <button
            onClick={() => onNewSession()}
            className="w-8 h-8 rounded-lg bg-orange flex items-center justify-center text-white text-lg hover:bg-orange-l transition-colors"
          >＋</button>
        </div>

        {/* Section label */}
        <div className="px-5 pb-2 text-[10px] font-bold text-sb-dim tracking-widest uppercase flex-shrink-0">
          Projects
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">

          {projects.map(project => {
            const isExpanded = expandedProjectId === project.id
            const pSessions = sessionsByProject[project.id] ?? []

            return (
              <div key={project.id}>
                {/* Project row */}
                <div
                  className="flex items-center gap-2.5 px-5 py-2.5 cursor-pointer hover:bg-white/5 transition-colors group"
                  onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}
                >
                  <span className="w-7 h-7 rounded-[7px] bg-white/8 flex items-center justify-center text-sm flex-shrink-0">
                    {project.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-sb-text truncate">{project.name}</div>
                    <div className="text-[10px] text-sb-dim mt-0.5">{pSessions.length} 次对话</div>
                  </div>
                  <span className={`text-[10px] text-sb-dim transition-transform duration-200 ${isExpanded ? 'rotate-90 !text-orange-l' : ''}`}>›</span>
                </div>

                {/* Sessions */}
                {isExpanded && (
                  <div>
                    {pSessions.map(s => (
                      <SessionRow
                        key={s.id}
                        session={s}
                        active={s.id === activeSessionId}
                        indented
                        onClick={() => switchSession(s.id)}
                        onDelete={(e) => handleDeleteSession(e, s)}
                      />
                    ))}
                    <button
                      onClick={() => { onNewSession(project); onClose() }}
                      className="w-full flex items-center gap-2 pl-[52px] pr-4 py-1.5 text-[12px] text-sb-dim hover:text-sb-text transition-colors"
                    >
                      <span className="text-[10px]">＋</span> 新建对话
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {/* New project */}
          <button
            onClick={onNewProject}
            className="w-full flex items-center gap-3 px-5 py-2.5 text-sb-dim hover:text-sb-text transition-colors"
          >
            <span className="w-[28px] h-[28px] rounded-[7px] bg-white/5 flex items-center justify-center text-lg">＋</span>
            <span className="text-[13px] font-medium">新建 Project</span>
          </button>

          {/* Divider */}
          {orphanSessions.length > 0 && (
            <div className="h-px bg-sb-div mx-0 my-2" />
          )}

          {/* Orphan sessions */}
          {orphanSessions.length > 0 && (
            <>
              <div className="px-5 pb-2 pt-1 text-[10px] font-bold text-sb-dim tracking-widest uppercase">
                无项目对话
              </div>
              {orphanSessions.map(s => (
                <SessionRow
                  key={s.id}
                  session={s}
                  active={s.id === activeSessionId}
                  onClick={() => switchSession(s.id)}
                  onDelete={(e) => handleDeleteSession(e, s)}
                />
              ))}
            </>
          )}

          <div className="h-4" />
        </div>

        {/* Bottom */}
        <div className="px-4 py-3 border-t border-sb-div flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[10px] text-sb-text truncate">
                {serverURL || '未配置'}
              </div>
              <div className="font-mono text-[9px] text-sb-dim mt-0.5">{statusLabel}</div>
            </div>
            <button
              onClick={() => {
                const url = prompt('scc server 地址', serverURL)
                if (url) {
                  setServerURL(url)
                  setConnState({ status: 'disconnected' })
                }
              }}
              className="text-sb-dim hover:text-sb-text text-sm transition-colors"
              title="修改地址"
            >⚙</button>
          </div>
        </div>
      </aside>
    </>
  )
}

function SessionRow({
  session, active, indented, onClick, onDelete,
}: {
  session:  Session
  active:   boolean
  indented?: boolean
  onClick:  () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  return (
    <div
      className={`
        relative flex items-center gap-2 py-1.5 cursor-pointer transition-colors group
        ${indented ? 'pl-[52px] pr-4' : 'px-5'}
        ${active ? 'bg-orange/14' : 'hover:bg-white/4'}
      `}
      onClick={onClick}
    >
      {active && (
        <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-orange rounded-r" />
      )}
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-orange-l' : 'bg-sb-dim'}`} />
      <span className={`text-[12px] flex-1 truncate ${active ? 'text-sb-text' : 'text-sb-dim'}`}>
        {session.title}
      </span>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-sb-dim hover:text-red-400 text-xs transition-all"
      >✕</button>
    </div>
  )
}
