import { useEffect, useRef, useState } from 'react'
import { api } from './api.ts'
import { AgentGlyph, CloseIcon, GridIcon } from './icons.tsx'
import { BellIcon } from './BellIcon.tsx'
import { chime } from './chime.ts'
import { setPanel, usePanel } from './panel-store.ts'
import { TerminalView } from './TerminalView.tsx'
import { TerminalThumb } from './TerminalThumb.tsx'
import { ClaudeUsage } from './ClaudeUsage.tsx'

interface TermInfo { id: string; agent: string; label: string; pid: number; exited: number | null; seq: number }

const AGENTS = [
  { id: 'claude', label: 'Claude Code' },
  { id: 'pi', label: 'Pi' },
  { id: 'codex', label: 'Codex' },
  { id: 'shell', label: 'Shell' },
]

/** An answer is a burst of at least this much output, then two quiet polls. */
const ANSWER_MIN_CHARS = 200
const QUIET_POLLS = 2
const RING_MS = 2_600

/** "Claude Code 2" once more than one of that agent is running. */
function labelFor(terms: TermInfo[], t: TermInfo): string {
  const same = terms.filter(x => x.agent === t.agent)
  return same.length > 1 ? `${t.label} ${same.indexOf(t) + 1}` : t.label
}

/** Identity of a terminal list, so a poll that changed nothing does not re-render. */
const sig = (l: TermInfo[]) => l.map(t => `${t.id}:${t.label}:${t.exited}`).join('|')

interface Activity { seq: number; burst: number; quiet: number }

export function Terminals({ sessionId }: { sessionId: string }) {
  const { grid, open: panelOpen } = usePanel()
  const [terms, setTerms] = useState<TermInfo[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [muted, setMuted] = useState<Set<string>>(() => new Set())
  const [unread, setUnread] = useState<Set<string>>(() => new Set())
  const [ringing, setRinging] = useState<Set<string>>(() => new Set())
  const activity = useRef(new Map<string, Activity>())
  const latest = useRef({ active, muted, panelOpen })
  latest.current = { active, muted, panelOpen }

  /** Output burst then silence = the agent answered. Ring every time; the unread dot only marks agents you are not on. */
  const observe = (list: TermInfo[]) => {
    for (const t of list) {
      const a = activity.current.get(t.id) ?? { seq: t.seq, burst: 0, quiet: 0 }
      if (t.seq > a.seq) { a.burst += t.seq - a.seq; a.quiet = 0 }
      else if (a.burst >= ANSWER_MIN_CHARS && ++a.quiet >= QUIET_POLLS) {
        a.burst = 0; a.quiet = 0
        const { active: cur, muted: m, panelOpen: open } = latest.current
        if (!m.has(t.id)) {
          chime()
          setRinging(r => new Set(r).add(t.id))
          setTimeout(() => setRinging(r => { const n = new Set(r); n.delete(t.id); return n }), RING_MS)
          const watching = cur === t.id && open && document.visibilityState === 'visible'
          if (!watching) setUnread(u => new Set(u).add(t.id))
        }
      }
      a.seq = t.seq
      activity.current.set(t.id, a)
    }
  }

  const refresh = () => fetch(api('terms', sessionId), { cache: 'no-store' })
    .then(r => r.json()).then((j: { terms?: TermInfo[] }) => {
      const list = j.terms ?? []
      observe(list)
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

  const select = (id: string) => { setActive(id); setUnread(u => { if (!u.has(id)) return u; const n = new Set(u); n.delete(id); return n }) }
  const open = (agent: string) => {
    setPicking(false)
    fetch(api('terms', sessionId, { agent }), { method: 'POST' })
      .then(r => r.json()).then((t: TermInfo) => { setTerms(l => [...l, t]); select(t.id) })
      .catch(() => {})
  }
  const close = (id: string) => {
    fetch(api('terms', sessionId, { id }), { method: 'DELETE' }).then(() => refresh()).catch(() => {})
  }
  const toggleMute = (id: string) => setMuted(m => { const n = new Set(m); n.has(id) ? n.delete(id) : n.add(id); return n })

  // One terminal has nothing to stage beside, so the toggle stays hidden and the stage stays off.
  const canStage = terms.length > 1
  const stage = grid && canStage
  const current = terms.find(t => t.id === active)

  return (
    <div className="flykit-terms">
      <div className="flykit-term-tabs" role="tablist">
        {terms.map(t => (
          <div
            key={t.id} role="tab" aria-selected={t.id === active} className="flykit-term-card"
            data-dead={t.exited !== null || undefined} data-unread={unread.has(t.id) || undefined} data-ring={ringing.has(t.id) || undefined}
            onClick={() => select(t.id)}
          >
            <AgentGlyph agent={t.agent} />
            <span className="flykit-term-name">{labelFor(terms, t)}</span>
            <span className="flykit-term-state" title={t.exited === null ? 'running' : `exited ${t.exited}`} />
            <button type="button" className="flykit-term-bell" aria-pressed={!muted.has(t.id)} title={muted.has(t.id) ? 'Muted: no sound when it answers' : 'Sound when it answers'} onClick={e => { e.stopPropagation(); toggleMute(t.id) }}>
              <BellIcon muted={muted.has(t.id)} />
            </button>
            <button type="button" aria-label="Close terminal" onClick={e => { e.stopPropagation(); close(t.id) }}><CloseIcon /></button>
          </div>
        ))}
        <div className="flykit-term-actions">
          {canStage && (
            <button type="button" className="flykit-term-add flykit-term-gridbtn" title={stage ? 'Show only the focused agent' : 'Focused agent with the others beside it'} aria-label="Stage view" aria-pressed={stage} onClick={() => setPanel({ grid: !grid })}>
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
      {current?.agent === 'claude' && <ClaudeUsage />}
      <div className="flykit-term-body" data-stage={stage || undefined}>
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
        {stage && (
          <div className="flykit-stage" role="tablist" aria-label="Other agents">
            {terms.filter(t => t.id !== active).map(t => (
              <div
                key={t.id} role="tab" aria-selected={false} className="flykit-thumb"
                data-dead={t.exited !== null || undefined} data-unread={unread.has(t.id) || undefined} data-ring={ringing.has(t.id) || undefined}
                title={`Focus ${labelFor(terms, t)}`} onClick={() => select(t.id)}
              >
                <div className="flykit-thumb-head"><AgentGlyph agent={t.agent} /><span>{labelFor(terms, t)}</span><span className="flykit-term-state" /></div>
                <TerminalThumb sessionId={sessionId} id={t.id} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
