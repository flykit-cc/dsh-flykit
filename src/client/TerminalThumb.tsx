import { useEffect, useState } from 'react'
import { api } from './api.ts'

/** A live, read-only glimpse of one terminal: the host renders the screen text, the thumb polls it. */
export function TerminalThumb({ sessionId, id, interval = 1500 }: { sessionId: string; id: string; interval?: number }) {
  const [lines, setLines] = useState<string[]>([])
  useEffect(() => {
    let alive = true
    const load = () => fetch(api('term/screen', sessionId, { id }), { cache: 'no-store' })
      .then(r => r.json()).then((j: { lines?: string[] }) => { if (alive) setLines(j.lines ?? []) }).catch(() => {})
    void load()
    const t = setInterval(load, interval)
    return () => { alive = false; clearInterval(t) }
  }, [sessionId, id, interval])
  return <pre className="flykit-thumb-screen" aria-hidden>{lines.join('\n')}</pre>
}
