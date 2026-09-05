import { useEffect, useState } from 'react'

interface Limit { kind: string; label: string; percent: number; resetsAt: string | null; severity: string }
interface Usage { plan: string | null; limits: Limit[] }

const POLL_MS = 60_000

function resetsIn(iso: string | null): string {
  if (iso === null) return ''
  const min = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60_000))
  if (min < 60) return `resets in ${min} min`
  const h = Math.floor(min / 60)
  return h < 48 ? `resets in ${h} h ${min % 60} min` : `resets in ${Math.round(h / 24)} d`
}

function tone(percent: number): string {
  return percent >= 95 ? 'error' : percent >= 80 ? 'warn' : 'ok'
}

/** Three small bars: 5-hour session, weekly all models, weekly top model. Hidden when there is no Claude login. */
export function ClaudeUsage() {
  const [usage, setUsage] = useState<Usage | null>(null)
  useEffect(() => {
    let alive = true
    const load = () => fetch('/api/flykit/claude-usage', { cache: 'no-store' })
      .then(r => r.json()).then((j: Usage | { error: string }) => { if (alive) setUsage('error' in j ? null : j) })
      .catch(() => {})
    void load()
    const id = setInterval(load, POLL_MS)
    return () => { alive = false; clearInterval(id) }
  }, [])
  if (usage === null || usage.limits.length === 0) return null
  return (
    <div className="flykit-usage" title={usage.plan === null ? 'Claude subscription usage' : `Claude ${usage.plan}`}>
      {usage.limits.map(l => (
        <div key={l.kind} className="flykit-usage-item" data-tone={tone(l.percent)} title={`${l.label}: ${l.percent}% used · ${resetsIn(l.resetsAt)}`}>
          <span className="flykit-usage-label">{l.label}</span>
          <span className="flykit-usage-bar"><span style={{ width: `${Math.min(100, l.percent)}%` }} /></span>
          <span className="flykit-usage-pct">{l.percent}%</span>
        </div>
      ))}
    </div>
  )
}
