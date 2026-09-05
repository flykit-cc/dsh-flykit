import { useEffect, useState } from 'react'
import { api } from './api.ts'
import { CloseIcon } from './icons.tsx'
import { TerminalView } from './TerminalView.tsx'

interface TermInfo { id: string; agent: string; label: string; pid: number; exited: number | null }

const AGENTS = [
  { id: 'claude', label: 'Claude Code' },
  { id: 'pi', label: 'Pi' },
  { id: 'codex', label: 'Codex' },
  { id: 'shell', label: 'Shell' },
]

export function Terminals({ sessionId }: { sessionId: string }) {
  const [terms, setTerms] = useState<TermInfo[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)

  const refresh = () => fetch(api('terms', sessionId), { cache: 'no-store' })
    .then(r => r.json()).then((j: { terms?: TermInfo[] }) => {
      const list = j.terms ?? []
      setTerms(list)
      setActive(a => (a !== null && list.some(t => t.id === a)) ? a : (list[0]?.id ?? null))
    }).catch(() => {})
  useEffect(() => { void refresh() }, [sessionId])

  const open = (agent: string) => {
    setPicking(false)
    fetch(api('terms', sessionId, { agent }), { method: 'POST' })
      .then(r => r.json()).then((t: TermInfo) => { setTerms(l => [...l, t]); setActive(t.id) })
      .catch(() => {})
  }
  const close = (id: string) => {
    fetch(api('terms', sessionId, { id }), { method: 'DELETE' }).then(() => refresh()).catch(() => {})
  }

  return (
    <div className="flykit-terms">
      <div className="flykit-term-tabs" role="tablist">
        {terms.map(t => (
          <div key={t.id} role="tab" aria-selected={t.id === active} className="flykit-term-tab" onClick={() => setActive(t.id)}>
            <span className={t.exited === null ? 'flykit-term-live' : 'flykit-term-dead'} />
            <span>{t.label}</span>
            <button type="button" aria-label="Close terminal" onClick={e => { e.stopPropagation(); close(t.id) }}><CloseIcon /></button>
          </div>
        ))}
        <div className="flykit-term-new">
          <button type="button" className="flykit-term-add" onClick={() => setPicking(p => !p)} aria-expanded={picking}>+ New</button>
          {picking && (
            <ul className="flykit-menu" role="menu">
              {AGENTS.map(a => <li key={a.id}><button type="button" role="menuitem" onClick={() => open(a.id)}>{a.label}</button></li>)}
            </ul>
          )}
        </div>
      </div>
      <div className="flykit-term-body">
        {active !== null
          ? <TerminalView key={active} sessionId={sessionId} id={active} />
          : <p className="flykit-empty">No terminal yet. Click “+ New” and pick an agent.</p>}
      </div>
    </div>
  )
}
