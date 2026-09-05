import { useEffect, useState } from 'react'
import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import { Editor } from './Editor.tsx'
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

function Drawer({ sessionId }: { sessionId: string }) {
  const files = useFiles(sessionId)
  const [filter, setFilter] = useState('')
  const [path, setPath] = useState<string | null>(null)
  const { doc, setText, save } = useDoc(sessionId, path)
  const dirty = doc !== null && doc.text !== doc.saved

  const q = filter.toLowerCase()
  const shown = (q === '' ? files : files.filter(f => f.toLowerCase().includes(q))).slice(0, 400)

  return (
    <aside className="flykit-drawer" aria-label="Files">
      <header className="flykit-drawer-head">
        <Input placeholder="Filter files" value={filter} onChange={e => setFilter(e.currentTarget.value)} />
        <Button size="sm" variant="primary" disabled={!dirty} onClick={save}>Save</Button>
        <Button size="sm" onClick={() => setPanel({ open: false })} aria-label="Close">✕</Button>
      </header>
      <div className="flykit-drawer-body">
        <ul className="flykit-files">
          {shown.map(f => (
            <li key={f}>
              <button type="button" aria-current={f === path} onClick={() => setPath(f)} title={f}>{f}</button>
            </li>
          ))}
          {files.length === 0 && <li className="flykit-empty">No files</li>}
        </ul>
        <div className="flykit-editor-host">
          {doc?.error !== undefined && <p className="flykit-empty">{doc.error}</p>}
          {doc !== null && doc.error === undefined && (
            <Editor path={doc.path} text={doc.text} onChange={setText} onSave={save} />
          )}
          {doc === null && <p className="flykit-empty">Pick a file</p>}
        </div>
      </div>
      <footer className="flykit-drawer-foot">{doc?.path ?? ''}{dirty ? ' ●' : ''}</footer>
    </aside>
  )
}

/** Root-overlay entry: nothing until the composer button opens it. */
export function FilePanel() {
  const { open, sessionId } = usePanel()
  return open && sessionId !== null ? <Drawer sessionId={sessionId} /> : null
}
