import { useEffect, useState } from 'react'

interface AppInfo { id: string; label: string; url: string; error?: string }

/** Until the host is restarted with the apps route, the viewer is embedded as-is (it must already be running). */
const FALLBACK: AppInfo[] = [{ id: 'whatsapp', label: 'WhatsApp', url: 'http://127.0.0.1:9223/' }]

/** Apps tab: each app is a local viewer page (headless Chrome screencast) in an iframe. */
export function Apps({ hidden }: { hidden: boolean }) {
  const [apps, setApps] = useState<AppInfo[] | null>(null)
  const [active, setActive] = useState('whatsapp')
  const [tick, setTick] = useState(0)
  // The host starts anything that is down; an error keeps the iframe up anyway, since the viewer page shows its own state.
  useEffect(() => {
    fetch('/api/flykit/apps', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(String(r.status))))
      .then((j: { apps: AppInfo[] }) => setApps(j.apps))
      .catch(() => setApps(FALLBACK))
  }, [tick])
  const app = apps?.find(a => a.id === active) ?? apps?.[0]
  return (
    <div className="flykit-apps" hidden={hidden}>
      {apps !== null && apps.length > 1 && (
        <div className="flykit-apps-tabs" role="tablist">
          {apps.map(a => <button key={a.id} type="button" role="tab" aria-selected={a.id === app?.id} onClick={() => setActive(a.id)}>{a.label}</button>)}
        </div>
      )}
      {app?.error !== undefined && (
        <div className="flykit-apps-note">{app.label}: {app.error}<button type="button" onClick={() => setTick(t => t + 1)}>retry</button></div>
      )}
      {apps === null
        ? <div className="flykit-apps-note">Starting…</div>
        : app !== undefined && <iframe key={`${app.id}:${tick}`} src={app.url} title={app.label} allow="clipboard-read; clipboard-write" />}
    </div>
  )
}
