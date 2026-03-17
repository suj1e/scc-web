import { useState } from 'react'
import { useWS }       from '@/hooks/useWS'
import { useStore }    from '@/store'
import { Sidebar }     from '@/components/Sidebar'
import { MessageList } from '@/components/MessageList'
import { InputBar }    from '@/components/InputBar'
import { GeekStatus }  from '@/components/GeekStatus'
import { Onboarding, NewProjectModal, NewSessionModal } from '@/components/Modals'
import type { Project } from '@/types/app'

export function App() {
  const { send } = useWS()

  const {
    serverURL, setServerURL,
    projects, upsertProject,
    sessions, upsertSession, setActiveSession,
    activeSessionId,
  } = useStore()

  const [sidebarOpen,   setSidebarOpen]   = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)
  const [newSessionFor, setNewSessionFor] = useState<Project | undefined>(undefined)
  const [showNewSession, setShowNewSession] = useState(false)

  const activeSession = sessions.find(s => s.id === activeSessionId)

  function handleConnect(url: string) {
    setServerURL(url)
    // WSClient picks up via useEffect in useWS
  }

  function handleCreateProject(p: Project) {
    upsertProject(p)
  }

  function handleCreateSession(projectId: string, title: string) {
    const project  = projects.find(p => p.id === projectId)
    const sessionId = crypto.randomUUID()

    const session = {
      id:              sessionId,
      projectId:       projectId,
      title:           title.trim() || '新对话',
      claudeSessionId: null,
      createdAt:       Date.now(),
      updatedAt:       Date.now(),
    }
    upsertSession(session)
    setActiveSession(sessionId)
    setShowNewSession(false)

    // Register on server
    send({
      type:          'session.create',
      session_id:    sessionId,
      project_id:    projectId || sessionId,
      cwd:           project?.cwd ?? '/',
      system_prompt: project?.systemPrompt || undefined,
      allowed_tools: project?.allowedTools,
    })
  }

  if (!serverURL) {
    return <Onboarding onConnect={handleConnect} />
  }

  return (
    <div className="flex h-full bg-cream overflow-hidden">

      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewProject={() => setShowNewProject(true)}
        onNewSession={(p) => { setNewSessionFor(p); setShowNewSession(true) }}
        send={send}
      />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 h-full">

        {/* Nav */}
        <div className="flex items-center gap-2.5 px-4 pt-2 pb-2.5 border-b border-div flex-shrink-0 bg-cream">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden flex flex-col gap-1 p-1 text-tx-m"
          >
            <span className="block w-5 h-0.5 bg-current rounded" />
            <span className="block w-3.5 h-0.5 bg-current rounded" />
            <span className="block w-5 h-0.5 bg-current rounded" />
          </button>

          <div className="flex-1 text-center">
            <div className="font-serif text-[15px] font-semibold text-tx leading-tight">
              {activeSession?.title ?? 'scc'}
            </div>
            {activeSession && (() => {
              const p = projects.find(pr => pr.id === activeSession.projectId)
              return p ? (
                <div className="text-[11px] font-medium text-orange">{p.emoji} {p.name}</div>
              ) : null
            })()}
          </div>

          <button
            onClick={() => setShowNewSession(true)}
            className="w-8 h-8 rounded-xl bg-orange text-white flex items-center justify-center text-lg hover:bg-orange-l transition-colors"
          >＋</button>
        </div>

        {/* Content */}
        {activeSessionId ? (
          <>
            <MessageList sessionId={activeSessionId} />
            <GeekStatus />
            <InputBar sessionId={activeSessionId} send={send} />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-tx-p p-10">
            <div className="text-5xl opacity-25">💬</div>
            <div className="font-serif text-[17px] text-tx-l">没有活跃的对话</div>
            <button
              onClick={() => setShowNewSession(true)}
              className="text-[13px] text-orange border border-orange-p rounded-lg px-4 py-2 hover:bg-orange-p transition-colors"
            >
              ＋ 新建对话
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreate={handleCreateProject}
        />
      )}

      {showNewSession && (
        <NewSessionModal
          projects={projects}
          projectId={newSessionFor?.id}
          onClose={() => { setShowNewSession(false); setNewSessionFor(undefined) }}
          onCreate={handleCreateSession}
        />
      )}
    </div>
  )
}
