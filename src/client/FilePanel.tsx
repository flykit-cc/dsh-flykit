import { useEffect, useRef, useState } from 'react'
import { Editor } from './Editor.tsx'
import { FileTree } from './FileTree.tsx'
import { CloseIcon, EyeIcon } from './icons.tsx'
import { Preview, previewKind } from './Preview.tsx'
import { setPanel, usePanel } from './panel-store.ts'
import { Terminals } from './Terminals.tsx'
import { api } from './api.ts'

const RETRIES = 6   // right after a host restart the session is not attached yet: the route 404s once or twice

/** Workspace file list: last known list paints instantly, then the host answers; a 404 is retried with backoff. */
function useFiles(sessionId: string, tick: number): { files: string[]; loading: boolean } {
  const key = `flykit.files.${sessionId}`
  const [files, setFiles] = useState<string[]>(() => { try { return JSON.parse(sessionStorage.getItem(key) ?? '[]') as string[] } catch { return [] } })
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const ac = new AbortController()
    let attempt = 0
    const load = (): void => {
      fetch(api('files', sessionId), { cache: 'no-store', signal: ac.signal })
        .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
        .then((j: { files?: string[] }) => {
          const list = j.files ?? []
          setFiles(list); setLoading(false)
          try { sessionStorage.setItem(key, JSON.stringify(list)) } catch {}
        })
        .catch(() => {
          if (ac.signal.aborted) return
          if (++attempt < RETRIES) setTimeout(load, 300 * attempt)
          else setLoading(false)
        })
    }
    load()
    return () => { ac.abort() }
  }, [sessionId, tick])
  return { files, loading }
}

/** One SSE stream per open panel; the browser reconnects on its own. */
function useWatch(sessionId: string, onBatch: (paths: string[]) => void): void {
  const latest = useRef(onBatch)
  latest.current = onBatch
  useEffect(() => {
    const es = new EventSource(api('watch', sessionId))
    es.onmessage = e => { latest.current((JSON.parse(e.data) as { paths: string[] }).paths) }
    return () => { es.close() }
  }, [sessionId])
}

interface Doc { path: string; text: string; saved: string; error?: string; stale?: boolean }

function useDoc(sessionId: string, path: string | null) {
  const [doc, setDoc] = useState<Doc | null>(null)
  const [reloadTick, setReloadTick] = useState(0)
  useEffect(() => {
    if (path === null) { setDoc(null); return }
    const ac = new AbortController()
    fetch(api('file', sessionId, { path }), { cache: 'no-store', signal: ac.signal })
      .then(r => r.json())
      .then((j: { text?: string; error?: string }) => {
        setDoc({ path, text: j.text ?? '', saved: j.text ?? '', error: j.text === undefined ? (j.error ?? 'cannot open') : undefined })
      })
      .catch(() => {})
    return () => { ac.abort() }
  }, [sessionId, path, reloadTick])

  /** Disk changed under the open file: clean docs follow it, dirty ones keep your edits and get a notice. */
  const diskChanged = () => setDoc(d => {
    if (d === null) return d
    if (d.text === d.saved) { setReloadTick(t => t + 1); return d }
    return { ...d, stale: true }
  })
  const reload = () => setReloadTick(t => t + 1)

  const save = () => {
    if (doc === null || doc.text === doc.saved) return
    const text = doc.text
    fetch(api('file', sessionId, { path: doc.path }), { method: 'PUT', body: text })
      .then(r => { if (r.ok) setDoc(d => d === null || d.path !== doc.path ? d : { ...d, saved: text }) })
      .catch(() => {})
  }
  return { doc, setText: (text: string) => setDoc(d => d === null ? d : { ...d, text }), save, diskChanged, reload }
}

function FilesTab({ sessionId }: { sessionId: string }) {
  const [tick, setTick] = useState(0)
  const { files, loading } = useFiles(sessionId, tick)
  const [filter, setFilter] = useState('')
  const [path, setPath] = useState<string | null>(null)
  const [changed, setChanged] = useState<Set<string>>(() => new Set())
  const { doc, setText, save, diskChanged, reload } = useDoc(sessionId, path)

  useWatch(sessionId, paths => {
    setTick(t => t + 1)
    if (paths.length > 0) setChanged(c => new Set([...c, ...paths.filter(p => p !== path)]))
    if (path !== null && (paths.length === 0 || paths.includes(path))) diskChanged()
  })
  const select = (p: string) => { setPath(p); setChanged(c => { if (!c.has(p)) return c; const n = new Set(c); n.delete(p); return n }) }
  const dirty = doc !== null && doc.text !== doc.saved
  const [preview, setPreview] = useState(true)
  const canPreview = doc !== null && previewKind(doc.path) !== null
  const showPreview = canPreview && preview

  return (
    <>
      <div className="flykit-files-pane">
        <input className="flykit-filter" placeholder="Filter files…" value={filter} onChange={e => setFilter(e.currentTarget.value)} />
        <FileTree files={files} filter={filter} selected={path} changed={changed} loading={loading} onSelect={select} />
      </div>
      <div className="flykit-editor-pane">
        {doc !== null && (
          <div className="flykit-editor-bar">
            <span className="flykit-editor-path" title={doc.path}>{doc.path}{dirty ? ' ●' : ''}</span>
            {canPreview && (
              <button type="button" className="flykit-iconbtn" title={showPreview ? 'Edit source' : 'Preview'} aria-pressed={showPreview} onClick={() => setPreview(p => !p)}>
                <EyeIcon />
              </button>
            )}
            <button type="button" className="flykit-save" disabled={!dirty} onClick={save}>Save</button>
          </div>
        )}
        {doc?.stale === true && (
          <div className="flykit-notice">
            <span>Changed on disk. Your edits are kept.</span>
            <button type="button" onClick={reload}>Reload</button>
          </div>
        )}
        {doc?.error !== undefined && <p className="flykit-empty">{doc.error}</p>}
        {doc !== null && doc.error === undefined && (showPreview
          ? <Preview path={doc.path} text={doc.text} />
          : <Editor path={doc.path} text={doc.text} onChange={setText} onSave={save} />)}
        {doc === null && <p className="flykit-empty">Pick a file</p>}
      </div>
    </>
  )
}

/** Left-edge resize strip: pointer capture, width written straight to the store. */
function ResizeHandle() {
  const base = useRef({ x: 0, w: 0 })
  return (
    <div
      className="flykit-panel-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
      onPointerDown={e => {
        base.current = { x: e.clientX, w: parseFloat(getComputedStyle(document.body).getPropertyValue('--flykit-panel-w')) }
        e.currentTarget.setPointerCapture(e.pointerId)
        document.body.dataset.flykitDragging = ''
      }}
      onPointerMove={e => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
        setPanel({ width: base.current.w + (base.current.x - e.clientX) })
      }}
      onPointerUp={e => { e.currentTarget.releasePointerCapture(e.pointerId); delete document.body.dataset.flykitDragging }}
    />
  )
}

/** Root-overlay entry: the right column, rendered only while the toggle has it open. */
const TABS = [{ id: 'files', label: 'Explorer' }, { id: 'terms', label: 'Agents' }] as const

export function FilePanel() {
  const { open, sessionId } = usePanel()
  const [tab, setTab] = useState<typeof TABS[number]['id']>('files')
  if (!open || sessionId === null) return null
  return (
    <aside className="flykit-panel" aria-label="flykit panel">
      <ResizeHandle />
      <div className="flykit-panel-head">
        <div className="flykit-tabs" role="tablist">
          {TABS.map(t => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>
        <button type="button" className="flykit-close" aria-label="Close panel" onClick={() => setPanel({ open: false })}><CloseIcon /></button>
      </div>
      <div className="flykit-panel-body">
        {tab === 'files' ? <FilesTab sessionId={sessionId} /> : <Terminals sessionId={sessionId} />}
      </div>
    </aside>
  )
}
