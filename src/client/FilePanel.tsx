import { useEffect, useRef, useState } from 'react'
import { Editor } from './Editor.tsx'
import { FileTree } from './FileTree.tsx'
import { CloseIcon, EyeIcon } from './icons.tsx'
import { Preview, previewKind } from './Preview.tsx'
import { setPanel, usePanel } from './panel-store.ts'

const api = (route: string, sessionId: string, path = '') =>
  `/api/flykit/${route}?sessionId=${encodeURIComponent(sessionId)}${path === '' ? '' : `&path=${encodeURIComponent(path)}`}`

function useFiles(sessionId: string): string[] {
  const [files, setFiles] = useState<string[]>([])
  useEffect(() => {
    const ac = new AbortController()
    fetch(api('files', sessionId), { cache: 'no-store', signal: ac.signal })
      .then(r => r.json()).then((j: { files?: string[] }) => setFiles(j.files ?? []))
      .catch(() => {})
    return () => { ac.abort() }
  }, [sessionId])
  return files
}

interface Doc { path: string; text: string; saved: string; error?: string }

function useDoc(sessionId: string, path: string | null) {
  const [doc, setDoc] = useState<Doc | null>(null)
  useEffect(() => {
    if (path === null) { setDoc(null); return }
    const ac = new AbortController()
    fetch(api('file', sessionId, path), { cache: 'no-store', signal: ac.signal })
      .then(r => r.json())
      .then((j: { text?: string; error?: string }) => {
        setDoc({ path, text: j.text ?? '', saved: j.text ?? '', error: j.text === undefined ? (j.error ?? 'cannot open') : undefined })
      })
      .catch(() => {})
    return () => { ac.abort() }
  }, [sessionId, path])

  const save = () => {
    if (doc === null || doc.text === doc.saved) return
    const text = doc.text
    fetch(api('file', sessionId, doc.path), { method: 'PUT', body: text })
      .then(r => { if (r.ok) setDoc(d => d === null || d.path !== doc.path ? d : { ...d, saved: text }) })
      .catch(() => {})
  }
  return { doc, setText: (text: string) => setDoc(d => d === null ? d : { ...d, text }), save }
}

function FilesTab({ sessionId }: { sessionId: string }) {
  const files = useFiles(sessionId)
  const [filter, setFilter] = useState('')
  const [path, setPath] = useState<string | null>(null)
  const { doc, setText, save } = useDoc(sessionId, path)
  const dirty = doc !== null && doc.text !== doc.saved
  const [preview, setPreview] = useState(true)
  const canPreview = doc !== null && previewKind(doc.path) !== null
  const showPreview = canPreview && preview

  return (
    <>
      <div className="flykit-files-pane">
        <input className="flykit-filter" placeholder="Filter files…" value={filter} onChange={e => setFilter(e.currentTarget.value)} />
        <FileTree files={files} filter={filter} selected={path} onSelect={setPath} />
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
export function FilePanel() {
  const { open, sessionId } = usePanel()
  if (!open || sessionId === null) return null
  return (
    <aside className="flykit-panel" aria-label="flykit panel">
      <ResizeHandle />
      <div className="flykit-panel-head">
        <div className="flykit-tabs" role="tablist">
          <button type="button" role="tab" aria-selected>Files</button>
        </div>
        <button type="button" className="flykit-close" aria-label="Close panel" onClick={() => setPanel({ open: false })}><CloseIcon /></button>
      </div>
      <div className="flykit-panel-body">
        <FilesTab sessionId={sessionId} />
      </div>
    </aside>
  )
}
