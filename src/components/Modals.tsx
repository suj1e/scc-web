import { useState } from 'react'
import { useStore } from '@/store'
import type { Project } from '@/types/app'

// ── Onboarding ────────────────────────────────────────────────

interface OnboardingProps {
  onConnect: (url: string) => void
}

export function Onboarding({ onConnect }: OnboardingProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  function connect() {
    const trimmed = url.trim()
    if (!trimmed.startsWith('ws://') && !trimmed.startsWith('wss://')) {
      setError('地址需以 ws:// 或 wss:// 开头')
      return
    }
    setError('')
    onConnect(trimmed)
  }

  return (
    <div className="fixed inset-0 z-[100] bg-cream flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="font-serif text-[52px] font-semibold text-orange text-center mb-2">scc</div>
        <div className="text-center text-[15px] text-tx-l mb-9">Server-side Claude Code</div>

        <div className="text-[11px] font-bold text-tx-l tracking-[0.5px] uppercase mb-2">
          scc server 地址
        </div>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && connect()}
          placeholder="ws://192.168.1.5:8765"
          autoFocus
          className="w-full bg-cream-d border-[1.5px] border-div rounded-xl px-3.5 py-3 font-mono text-[14px] text-tx outline-none focus:border-orange transition-colors mb-2"
        />
        <div className="text-[11px] text-tx-p mb-6">
          在服务器上运行 <code className="bg-cream-dd px-1 py-0.5 rounded text-[10px]">scc</code> 后填入显示的地址
        </div>

        {error && <div className="text-[12px] text-red-500 mb-3">{error}</div>}

        <button
          onClick={connect}
          disabled={!url.trim()}
          className="w-full bg-orange hover:bg-orange-l disabled:bg-cream-dd disabled:text-tx-p text-white rounded-[13px] py-3.5 text-[16px] font-semibold transition-colors"
        >
          连接
        </button>
      </div>
    </div>
  )
}

// ── New Project modal ─────────────────────────────────────────

const EMOJIS = ['💻','📝','🔬','📊','🎨','🛠️','🚀','📱','🌐','🔒','⚡','🎯']
const DEFAULT_TOOLS = ['Read','Write','Edit','Bash','Glob','Grep','LS']

interface NewProjectProps {
  onClose:  () => void
  onCreate: (p: Project) => void
}

export function NewProjectModal({ onClose, onCreate }: NewProjectProps) {
  const [name,   setName]   = useState('')
  const [emoji,  setEmoji]  = useState('💻')
  const [cwd,    setCwd]    = useState('')
  const [prompt, setPrompt] = useState('')
  const [bash,   setBash]   = useState(true)
  const [files,  setFiles]  = useState(true)
  const [search, setSearch] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)

  function create() {
    if (!name.trim() || !cwd.trim()) return
    const tools = [
      ...(bash  ? ['Bash'] : []),
      ...(files ? ['Read','Write','Edit','Glob','Grep','LS'] : []),
      ...(search ? ['WebSearch'] : []),
    ]
    onCreate({
      id:           crypto.randomUUID(),
      name:         name.trim(),
      emoji,
      cwd:          cwd.trim(),
      systemPrompt: prompt.trim(),
      allowedTools: tools.length ? tools : DEFAULT_TOOLS,
      createdAt:    Date.now(),
      updatedAt:    Date.now(),
    })
    onClose()
  }

  return (
    <ModalShell title="新建 Project" onClose={onClose}>
      {/* Emoji */}
      <div className="flex justify-center mb-5">
        <button
          onClick={() => setShowEmoji(v => !v)}
          className="w-16 h-16 rounded-[18px] bg-cream-d border border-div flex items-center justify-center text-[32px] hover:border-orange transition-colors"
        >
          {emoji}
        </button>
      </div>
      {showEmoji && (
        <div className="grid grid-cols-6 gap-2 mb-4">
          {EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => { setEmoji(e); setShowEmoji(false) }}
              className="h-10 rounded-xl bg-cream-d hover:bg-orange-p flex items-center justify-center text-xl transition-colors"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <Label>项目名称</Label>
      <Input value={name} onChange={setName} placeholder="iOS 开发" autoFocus />

      <Label>服务器路径</Label>
      <Input value={cwd} onChange={setCwd} placeholder="/Users/me/my-project" mono />
      <div className="text-[11px] text-tx-p mb-4 -mt-2">scc server 上的绝对路径</div>

      <Label>System Prompt <span className="font-normal text-tx-p normal-case tracking-normal">(可选)</span></Label>
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="你是一个专业的…"
        rows={3}
        className="w-full bg-cream-d border border-div rounded-xl px-3.5 py-2.5 text-[14px] text-tx outline-none focus:border-orange resize-none mb-4 transition-colors"
      />

      <Label>可用工具</Label>
      <div className="space-y-2 mb-6">
        <Toggle label="Bash · 执行终端命令" icon="🖥️" checked={bash}   onChange={setBash} />
        <Toggle label="文件读写"             icon="📁" checked={files}  onChange={setFiles} />
        <Toggle label="搜索"                 icon="🔍" checked={search} onChange={setSearch} />
      </div>

      <button
        onClick={create}
        disabled={!name.trim() || !cwd.trim()}
        className="w-full bg-orange hover:bg-orange-l disabled:bg-cream-dd disabled:text-tx-p text-white rounded-xl py-3 text-[15px] font-semibold transition-colors"
      >
        创建
      </button>
    </ModalShell>
  )
}

// ── New Session modal ─────────────────────────────────────────

interface NewSessionProps {
  projects:  Project[]
  projectId?: string
  onClose:   () => void
  onCreate:  (projectId: string, title: string) => void
}

export function NewSessionModal({ projects, projectId, onClose, onCreate }: NewSessionProps) {
  const [title,     setTitle]     = useState('')
  const [selProject, setSelProject] = useState(projectId ?? projects[0]?.id ?? '')

  const project = projects.find(p => p.id === selProject)

  return (
    <ModalShell title="新建对话" onClose={onClose}>
      {projects.length > 0 && (
        <>
          <Label>Project</Label>
          <select
            value={selProject}
            onChange={e => setSelProject(e.target.value)}
            className="w-full bg-cream-d border border-div rounded-xl px-3.5 py-2.5 text-[14px] text-tx outline-none focus:border-orange mb-4 transition-colors"
          >
            <option value="">无项目</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
            ))}
          </select>
          {project && (
            <div className="font-mono text-[11px] text-tx-l bg-cream-d px-3 py-1.5 rounded-lg mb-4 truncate">
              {project.cwd}
            </div>
          )}
        </>
      )}

      <Label>对话标题 <span className="font-normal text-tx-p normal-case tracking-normal">(可选)</span></Label>
      <Input
        value={title}
        onChange={setTitle}
        placeholder="新对话"
        autoFocus
        onEnter={() => onCreate(selProject, title)}
      />

      <button
        onClick={() => onCreate(selProject, title)}
        className="w-full bg-orange hover:bg-orange-l text-white rounded-xl py-3 text-[15px] font-semibold transition-colors mt-2"
      >
        创建并开始
      </button>
    </ModalShell>
  )
}

// ── Shared UI ─────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-cream w-full sm:max-w-md rounded-t-[20px] sm:rounded-[20px] px-5 pt-1 pb-8 sm:pb-5 max-h-[90dvh] overflow-y-auto">
        <div className="w-9 h-1 bg-div rounded-full mx-auto mt-3 mb-5 sm:hidden" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-[17px] font-semibold text-tx">{title}</h2>
          <button onClick={onClose} className="text-tx-l hover:text-tx text-lg transition-colors">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-bold text-tx-l tracking-[0.5px] uppercase mb-2">{children}</div>
  )
}

function Input({ value, onChange, placeholder, mono, autoFocus, onEnter }: {
  value: string; onChange: (v: string) => void; placeholder?: string
  mono?: boolean; autoFocus?: boolean; onEnter?: () => void
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && onEnter?.()}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={`w-full bg-cream-d border border-div rounded-xl px-3.5 py-2.5 text-[14px] text-tx outline-none focus:border-orange mb-4 transition-colors ${mono ? 'font-mono text-[13px]' : ''}`}
    />
  )
}

function Toggle({ label, icon, checked, onChange }: {
  label: string; icon: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3 bg-cream-d rounded-xl px-3.5 py-2.5">
      <span className="text-lg">{icon}</span>
      <span className="flex-1 text-[14px] font-medium text-tx">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-orange' : 'bg-cream-dd'}`}
      >
        <div className={`w-[22px] h-[22px] bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${checked ? 'right-0.5' : 'left-0.5'}`} />
      </button>
    </div>
  )
}
