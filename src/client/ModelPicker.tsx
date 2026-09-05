import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { ModelSelection, ModelCatalogModel, ModelProviderGroup } from '@deepseek-ai/dsh-api-session-controller/types'
import type { ModelDirectoryState } from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import { installStyle } from './css.ts'
import { MODEL_PICKER_CSS } from './model-picker-styles.ts'

/** Same face the shell's own seat receives, so `/model` and this picker stay one state. */
export interface ModelPickerInjected {
  available: boolean
  directory: SnapshotStore<ModelDirectoryState>
  load: () => void
  select: (selection: ModelSelection) => Promise<boolean>
}

interface Row { key: string; provider: ModelProviderGroup; model: ModelCatalogModel; fav?: true }

const RECENT_KEY = 'flykit.models.recent'
const FAV_KEY = 'flykit.models.fav'
const RECENT_MAX = 8

function readList(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') as string[] } catch { return [] }
}
function writeList(key: string, list: string[]): void {
  try { localStorage.setItem(key, JSON.stringify(list)) } catch {}
}

/** Every query word must appear somewhere in "provider name model id"; order-free, case-free. */
function matches(row: Row, words: string[]): boolean {
  if (words.length === 0) return true
  const hay = `${row.provider.name} ${row.model.name} ${row.model.id}`.toLowerCase()
  return words.every(w => hay.includes(w))
}

export function ModelPicker({ locked, available, directory, load, select }: ModelPickerInjected & { locked: boolean }) {
  const state = useSyncExternalStore(directory.subscribe, directory.getSnapshot, directory.getSnapshot)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<string>('all')   // 'all' | 'recent' | 'fav' | provider id
  const [cursor, setCursor] = useState(0)
  const [recent, setRecent] = useState<string[]>(() => readList(RECENT_KEY))
  const [fav, setFav] = useState<string[]>(() => readList(FAV_KEY))
  const [sync, setSync] = useState<'idle' | 'busy' | string>('idle')
  const trigger = useRef<HTMLButtonElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const listEl = useRef<HTMLDivElement>(null)

  useEffect(() => installStyle('dsh-flykit-model', MODEL_PICKER_CSS), [])
  useEffect(() => { load() }, [load])

  const rows = useMemo<Row[]>(() => state.groups.flatMap(g => g.models.map(m => ({ key: `${g.id}/${m.id}`, provider: g, model: m }))), [state.groups])
  const byKey = useMemo(() => new Map(rows.map(r => [r.key, r])), [rows])
  const currentKey = state.current === null ? null : `${state.current.provider}/${state.current.model}`
  const current = currentKey === null ? undefined : byKey.get(currentKey)

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const visible = useMemo(() => {
    let base = rows
    if (filter === 'recent') base = recent.map(k => byKey.get(k)).filter((r): r is Row => r !== undefined)
    else if (filter !== 'all') base = rows.filter(r => r.provider.id === filter)
    // Favorites lead the full list as their own group, ahead of every provider.
    const favs = filter === 'all' ? fav.map(k => byKey.get(k)).filter((r): r is Row => r !== undefined).map(r => ({ ...r, fav: true as const })) : []
    return [...favs, ...base].filter(r => matches(r, words))
  }, [rows, filter, recent, fav, byKey, words.join(' ')])

  useEffect(() => { setCursor(0) }, [query, filter])
  useEffect(() => {
    if (!open) return
    queueMicrotask(() => input.current?.focus())
    const onDoc = (e: PointerEvent) => {
      if (pop.current?.contains(e.target as Node) || trigger.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [open])
  useLayoutEffect(() => {
    listEl.current?.querySelector<HTMLElement>('[data-cursor="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [cursor, visible])

  if (!available) return null

  const pick = (row: Row, effort?: string) => {
    const sameRoute = currentKey === row.key
    const reasoningEffort = effort ?? (sameRoute ? state.current?.reasoningEffort ?? row.model.reasoning?.defaultEffort : row.model.reasoning?.defaultEffort)
    const next = [row.key, ...recent.filter(k => k !== row.key)].slice(0, RECENT_MAX)
    setRecent(next); writeList(RECENT_KEY, next)
    void select({ provider: row.provider.id, model: row.model.id, ...(reasoningEffort === undefined ? {} : { reasoningEffort }) })
    if (effort === undefined) { setOpen(false); setQuery('') }
  }
  const toggleFav = (key: string) => {
    const next = fav.includes(key) ? fav.filter(k => k !== key) : [...fav, key]
    setFav(next); writeList(FAV_KEY, next)
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(visible.length - 1, c + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(0, c - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); const r = visible[cursor]; if (r !== undefined) pick(r) }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); trigger.current?.focus() }
  }

  const reasoning = current?.model.reasoning
  const effort = state.current?.reasoningEffort ?? reasoning?.defaultEffort
  const effortName = reasoning?.efforts.find(x => x.id === effort)?.name ?? (reasoning === undefined ? undefined : 'Default')
  const providers = state.groups
  const grouped = filter === 'all'
  const showProvider = filter === 'recent' || filter === 'fav'   // a provider pill already names it

  return (
    <div className="fkm-root">
      <button
        ref={trigger} type="button" className="fkm-trigger" disabled={locked} aria-haspopup="dialog" aria-expanded={open}
        title={current === undefined ? 'Choose model' : `${current.provider.name} · ${current.model.id}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="fkm-trigger-label">{current?.model.name ?? state.current?.model ?? 'Model'}</span>
        {effortName !== undefined && <span className="fkm-trigger-effort">· {effortName}</span>}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><path d="M3 4.5l3 3 3-3" /></svg>
      </button>

      {open && (
        <div ref={pop} className="fkm-pop" role="dialog" aria-label="Choose model" onKeyDown={onKey}>
          <div className="fkm-search">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></svg>
            <input ref={input} value={query} placeholder="Search models…  (↑↓ Enter)" onChange={e => setQuery(e.currentTarget.value)} />
            {query !== '' && <button type="button" className="fkm-clear" aria-label="Clear" onClick={() => setQuery('')}>×</button>}
            <button
              type="button" className="fkm-sync" disabled={sync === 'busy'} data-busy={sync === 'busy' || undefined}
              title={sync === 'idle' || sync === 'busy' ? 'Refresh the OpenRouter catalog from openrouter.ai' : sync}
              onClick={() => {
                setSync('busy')
                fetch('/api/flykit/catalog-sync', { method: 'POST' }).then(r => r.json())
                  .then((j: { count?: number; skipped?: string; error?: string }) => { setSync(j.count !== undefined ? `Synced ${j.count} models` : (j.skipped ?? j.error ?? 'failed')); load() })
                  .catch(() => setSync('failed'))
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden><path d="M13 8a5 5 0 01-8.5 3.6M3 8a5 5 0 018.5-3.6M11.5 2v2.5H9M4.5 14v-2.5H7" /></svg>
            </button>
          </div>
          <div className="fkm-pills">
            <Pill id="all" label="All" count={rows.length} active={filter} set={setFilter} />
            {recent.length > 0 && <Pill id="recent" label="Recent" count={recent.length} active={filter} set={setFilter} />}
            {providers.map(p => <Pill key={p.id} id={p.id} label={p.name} count={p.models.length} active={filter} set={setFilter} />)}
          </div>
          <div ref={listEl} className="fkm-list" role="listbox">
            {state.status === 'loading' && rows.length === 0 && <div className="fkm-empty fkm-loading">Loading catalog…</div>}
            {state.status === 'error' && <div className="fkm-error">{state.error}<button type="button" onClick={load}>Retry</button></div>}
            {visible.length === 0 && state.status !== 'loading' && <div className="fkm-empty">No model matches “{query}”</div>}
            {visible.map((r, i) => {
              const section = r.fav === true ? '★' : r.provider.id
              const prev = visible[i - 1]
              const head = grouped && (prev === undefined || (prev.fav === true ? '★' : prev.provider.id) !== section)
              return (
                <div key={`${r.fav === true ? 'fav:' : ''}${r.key}`}>
                  {head && (
                    <div className="fkm-group" data-fav={r.fav === true || undefined}>
                      {r.fav === true ? '★ Favorites' : r.provider.name}
                      <span>{visible.filter(v => (v.fav === true ? '★' : v.provider.id) === section).length}</span>
                    </div>
                  )}
                  <div
                    role="option" aria-selected={r.key === currentKey} data-cursor={i === cursor} className="fkm-row"
                    onMouseEnter={() => setCursor(i)} onClick={() => pick(r)}
                  >
                    <span className="fkm-check">{r.key === currentKey && '✓'}</span>
                    <span className="fkm-name">{r.model.name}</span>
                    {r.model.reasoning !== undefined && <span className="fkm-badge">reasoning</span>}
                    {(showProvider || r.fav === true) && <span className="fkm-provider">{r.provider.name}</span>}
                    <span className="fkm-id">{r.model.id}</span>
                    <button type="button" className="fkm-star" data-on={fav.includes(r.key) || undefined} aria-label="Favorite" onClick={e => { e.stopPropagation(); toggleFav(r.key) }}>★</button>
                  </div>
                </div>
              )
            })}
          </div>
          {current !== undefined && reasoning !== undefined && (
            <div className="fkm-foot">
              <span className="fkm-foot-label">Effort for {current.model.name}</span>
              <div className="fkm-efforts">
                {reasoning.defaultEffort === undefined && <button type="button" data-on={effort === undefined || undefined} onClick={() => pick(current, undefined)}>Default</button>}
                {reasoning.efforts.map(x => <button key={x.id} type="button" data-on={x.id === effort || undefined} title={x.description} onClick={() => pick(current, x.id)}>{x.name}</button>)}
              </div>
            </div>
          )}
          {state.failures.length > 0 && (
            <div className="fkm-fail">{state.failures.map(f => <span key={f.id} title={f.message}>⚠ {f.name} failed to load</span>)}</div>
          )}
        </div>
      )}
    </div>
  )
}

function Pill({ id, label, count, active, set }: { id: string; label: string; count: number; active: string; set: (id: string) => void }) {
  return (
    <button type="button" className="fkm-pill" data-on={active === id || undefined} onClick={() => set(id)}>
      {label}<span>{count}</span>
    </button>
  )
}
