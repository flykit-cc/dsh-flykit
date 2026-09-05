import { useEffect, useState } from 'react'
import { api } from './api.ts'
import { AgentGlyph, CloseIcon, GridIcon } from './icons.tsx'
import { setPanel, usePanel } from './panel-store.ts'
import { TerminalView } from './TerminalView.tsx'
import { ClaudeUsage } from './ClaudeUsage.tsx'

interface TermInfo { id: string; agent: string; label: string; pid: number; exited: number | null; startedAt?: number }

const AGENTS = [
  { id: 'claude', label: 'Claude Code' },
  { id: 'pi', label: 'Pi' },
  { id: 'codex', label: 'Codex' },
  { id: 'shell', label: 'Shell' },
]

/** "Claude Code 2" once more than one of that agent is running. */
function labelFor(terms: TermInfo[], t: TermInfo): string {
  const same = terms.filter(x => x.agent === t.agent)
  return same.length > 1 ? `${t.label} ${same.indexOf(t) + 1}` : t.label
}

/** Identity of a terminal list, so a poll that changed nothing does not re-render. */
const sig = (l: TermInfo[]) => l.map(t => `${t.id}:${t.label}:${t.exited}`).join('|')

export function Terminals({ sessionId }: { sessionId: string }) {
  const { grid } = usePanel()
  const [terms, setTerms] = useState<TermInfo[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)

  const refresh = () => fetch(api('terms', sessionId), { cache: 'no-store' })
    .then(r => r.json()).then((j: { terms?: TermInfo[] }) => {
      const list = j.terms ?? []
      setTerms(prev => sig(prev) === sig(list) ? prev : list)
      setActive(a => (a !== null && list.some(t => t.id === a)) ? a : (list[0]?.id ?? null))
    }).catch(() => {})
  // Polled, not fetched once: the DSH agent opens and closes terminals through
  // the flykit_agent_* tools, and the panel has to show what it did.
  useEffect(() => {
    void refresh()
    const poll = setInterval(() => void refresh(), 2_000)
    return () => clearInterval(poll)
  }, [sessionId])

  const open = (agent: string) => {
    setPicking(false)
    fetch(api('terms', sessionId, { agent }), { method: 'POST' })
      .then(r => r.json()).then((t: TermInfo) => { setTerms(l => [...l, { ...t, startedAt: Date.now() }]); setActive(t.id) })
      .catch(() => {})
  }
  const close = (id: string) => {
    fetch(api('terms', sessionId, { id }), { method: 'DELETE' }).then(() => refresh()).catch(() => {})
  }

  // One terminal has nothing to tile, so the toggle stays hidden and the grid stays off.
  const canGrid = terms.length > 1
  const showGrid = grid && canGrid

  return (
    <div className="flykit-terms">
      <div className="flykit-term-tabs" role="tablist">
        {terms.map(t => (
          <div key={t.id} role="tab" aria-selected={t.id === active} className="flykit-term-card" data-dead={t.exited !== null || undefined} onClick={() => setActive(t.id)}>
            <AgentGlyph agent={t.agent} />
            <span className="flykit-term-name">{labelFor(terms, t)}</span>
            <span className="flykit-term-state" title={t.exited === null ? 'running' : `exited ${t.exited}`} />
            <button type="button" aria-label="Close terminal" onClick={e => { e.stopPropagation(); close(t.id) }}><CloseIcon /></button>
          </div>
        ))}
        <div className="flykit-term-actions">
          {canGrid && (
            <button type="button" className="flykit-term-add flykit-term-gridbtn" title={showGrid ? 'Show only the focused agent' : 'Show every agent at once'} aria-label="Grid view" aria-pressed={showGrid} onClick={() => setPanel({ grid: !grid })}>
              <GridIcon />
            </button>
          )}
          <div className="flykit-term-new">
            <button type="button" className="flykit-term-add" title="New agent" onClick={() => setPicking(p => !p)} aria-expanded={picking}>+</button>
            {picking && (
              <ul className="flykit-menu" role="menu">
                {AGENTS.map(a => <li key={a.id}><button type="button" role="menuitem" onClick={() => open(a.id)}><AgentGlyph agent={a.id} />{a.label}</button></li>)}
              </ul>
            )}
          </div>
        </div>
      </div>
      {terms.find(t => t.id === active)?.agent === 'claude' && <ClaudeUsage />}
      {showGrid
        ? (
          <div className="flykit-term-grid">
            {terms.map(t => (
              <div
                key={t.id}
                role="tab"
                aria-selected={t.id === active}
                className="flykit-term-cell"
                // xterm focuses itself on its own screen; this also covers the caption and the card padding.
                onPointerDown={e => { setActive(t.id); e.currentTarget.querySelector('textarea')?.focus() }}
              >
                <div className="flykit-term-cell-head"><AgentGlyph agent={t.agent} /><span>{labelFor(terms, t)}</span></div>
                <TerminalView sessionId={sessionId} id={t.id} autoFocus={t.id === active} />
              </div>
            ))}
          </div>
        )
        : (
          <div className="flykit-term-body">
            {active !== null
              ? <TerminalView key={active} sessionId={sessionId} id={active} />
              : (
                <div className="flykit-term-hero">
                  <p>Run an agent in this workspace.</p>
                  <div className="flykit-term-hero-row">
                    {AGENTS.map(a => <button key={a.id} type="button" onClick={() => open(a.id)}><AgentGlyph agent={a.id} />{a.label}</button>)}
                  </div>
                </div>
              )}
          </div>
        )}
    </div>
  )
}
