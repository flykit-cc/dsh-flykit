import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api.ts'

export interface Doc { path: string; text: string; saved: string; error?: string; stale?: boolean }

/**
 * Every open file at once, keyed by path, so unsaved text survives a tab switch.
 * `setText`, `save` and `reload` act on the active document — the only one an
 * editor is ever bound to.
 */
export function useDocs(sessionId: string) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [activePath, setActivePath] = useState<string | null>(null)

  // Handlers fire from events and SSE, long after the render that made them.
  const list = useRef(docs); list.current = docs
  const sid = useRef(sessionId); sid.current = sessionId
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  // A different session is a different workspace: nothing open carries over.
  useEffect(() => { setDocs([]); setActivePath(null) }, [sessionId])

  const patch = useCallback((path: string, f: (d: Doc) => Doc) => {
    setDocs(l => l.map(d => d.path === path ? f(d) : d))
  }, [])

  const load = useCallback((path: string) => {
    fetch(api('file', sessionId, { path }), { cache: 'no-store' })
      .then(r => r.json())
      .then((j: { text?: string; error?: string }) => {
        if (!alive.current || sid.current !== sessionId) return
        const text = j.text ?? ''
        const doc: Doc = { path, text, saved: text, error: j.text === undefined ? (j.error ?? 'cannot open') : undefined }
        setDocs(l => l.some(d => d.path === doc.path) ? l.map(d => d.path === doc.path ? doc : d) : [...l, doc])
      })
      .catch(() => {})
  }, [sessionId])

  const open = (path: string) => {
    setActivePath(path)
    if (list.current.some(d => d.path === path)) return
    setDocs(l => [...l, { path, text: '', saved: '' }])   // the tab appears now, the bytes land next
    load(path)
  }

  const close = (path: string) => {
    const l = list.current
    const i = l.findIndex(d => d.path === path)
    if (i < 0) return
    const doc = l[i]!
    if (doc.text !== doc.saved && !confirm(`Discard unsaved changes to ${path}?`)) return
    setDocs(cur => cur.filter(d => d.path !== path))
    setActivePath(p => p === path ? (l[i + 1]?.path ?? l[i - 1]?.path ?? null) : p)
  }

  const setText = (text: string) => { if (activePath !== null) patch(activePath, d => ({ ...d, text })) }
  const reload = () => { if (activePath !== null) load(activePath) }

  const save = () => {
    if (activePath === null) return
    const path = activePath
    const doc = list.current.find(d => d.path === path)
    if (doc === undefined || doc.text === doc.saved) return
    const text = doc.text
    fetch(api('file', sessionId, { path }), { method: 'PUT', body: text })
      .then(r => { if (r.ok) patch(path, d => ({ ...d, saved: text, stale: false })) })
      .catch(() => {})
  }

  /** Disk moved under open files: clean ones follow it, dirty ones keep the edits and get a notice. */
  const diskChanged = (paths: string[]) => {
    for (const d of list.current) {
      if (paths.length > 0 && !paths.includes(d.path)) continue
      if (d.text === d.saved) load(d.path)
      else patch(d.path, x => ({ ...x, stale: true }))
    }
  }

  return { docs, activePath, active: docs.find(d => d.path === activePath) ?? null, open, close, setText, save, reload, diskChanged }
}

/** File name from a workspace-relative path. */
function baseName(path: string): string { return path.slice(path.lastIndexOf('/') + 1) }

/**
 * Tab labels: the file name alone, unless two open files share it — then the
 * parent folder comes along, so `index.ts` and `index.ts` read as `src/index.ts`
 * and `client/index.ts` instead of two identical tabs.
 */
export function tabLabels(paths: string[]): Map<string, string> {
  const count = new Map<string, number>()
  for (const p of paths) count.set(baseName(p), (count.get(baseName(p)) ?? 0) + 1)
  return new Map(paths.map(p => {
    const base = baseName(p)
    if ((count.get(base) ?? 0) < 2) return [p, base]
    const cut = p.lastIndexOf('/')
    return [p, cut < 0 ? `./${base}` : `${baseName(p.slice(0, cut))}/${base}`]
  }))
}
