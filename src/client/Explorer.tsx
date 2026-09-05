import { useEffect, useRef, useState } from 'react'
import { useDocs } from './docs.ts'
import { Editor } from './Editor.tsx'
import { EditorTabs } from './EditorTabs.tsx'
import { FileTree } from './FileTree.tsx'
import { EyeIcon } from './icons.tsx'
import { Preview, previewKind } from './Preview.tsx'
import { setPanel, usePanel } from './panel-store.ts'
import { SplitPane } from './SplitPane.tsx'
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

/** Filter + file tree over a tabbed editor/preview pane, with a draggable divider between them. */
export function Explorer({ sessionId }: { sessionId: string }) {
  const { treeRatio } = usePanel()
  const [tick, setTick] = useState(0)
  const { files, loading } = useFiles(sessionId, tick)
  const [filter, setFilter] = useState('')
  const [changed, setChanged] = useState<Set<string>>(() => new Set())
  const { docs, activePath, active: doc, open, close, setText, save, reload, diskChanged } = useDocs(sessionId)

  useWatch(sessionId, paths => {
    setTick(t => t + 1)
    // A file already open is shown by its own tab; the tree only marks the ones you cannot see.
    const unseen = paths.filter(p => !docs.some(d => d.path === p))
    if (unseen.length > 0) setChanged(c => new Set([...c, ...unseen]))
    diskChanged(paths)
  })
  const select = (p: string) => { open(p); setChanged(c => { if (!c.has(p)) return c; const n = new Set(c); n.delete(p); return n }) }
  const dirty = doc !== null && doc.text !== doc.saved
  const [preview, setPreview] = useState(true)
  const canPreview = doc !== null && previewKind(doc.path) !== null
  const showPreview = canPreview && preview

  return (
    <SplitPane
      ratio={treeRatio}
      onRatio={r => setPanel({ treeRatio: r })}
      label="Resize file tree"
      top={
        <div className="flykit-files-pane">
          <input className="flykit-filter" placeholder="Filter files…" value={filter} onChange={e => setFilter(e.currentTarget.value)} />
          <FileTree files={files} filter={filter} selected={activePath} changed={changed} loading={loading} onSelect={select} />
        </div>
      }
      bottom={
        <div className="flykit-editor-pane">
          <EditorTabs docs={docs} active={activePath} onSelect={open} onClose={close} />
          {doc !== null && (
            <div className="flykit-editor-bar">
              <span className="flykit-editor-path" title={doc.path}>{doc.path}</span>
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
      }
    />
  )
}
