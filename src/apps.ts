import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/**
 * Web apps shown in the panel's Apps tab. Each is a local server in `apps/<id>/` that owns a
 * headless Chrome and serves an embeddable viewer. Telegram later is one more row with its own
 * dir, port and start URL.
 */
export interface App { id: string; label: string; url: string; dir: string }

export const APPS: App[] = [
  { id: 'whatsapp', label: 'WhatsApp', url: 'http://127.0.0.1:9223/', dir: fileURLToPath(new URL('../apps/whatsapp/', import.meta.url)) },
]

const up = (app: App) => fetch(new URL('json/list', app.url), { signal: AbortSignal.timeout(2000) }).then(r => r.ok, () => false)

const starting = new Map<string, Promise<string | null>>()

/** `node wa.mjs start --detach` in the app's dir; resolves to an error line, or null once the viewer answers. */
function start(app: App): Promise<string | null> {
  const pending = starting.get(app.id)
  if (pending !== undefined) return pending
  const run = new Promise<string | null>(ok => {
    execFile(process.execPath, ['wa.mjs', 'start', '--detach'], { cwd: app.dir, timeout: 40_000 }, async (err, _out, stderr) => {
      if (err !== null && !/already running/.test(stderr)) return ok((stderr.trim() || err.message).split('\n').pop() ?? 'start failed')
      ok(await up(app) ? null : 'started but the viewer did not answer')
    })
  }).finally(() => starting.delete(app.id))
  starting.set(app.id, run)
  return run
}

/** Every app with its viewer URL, started if it was down. */
export async function ensureApps(): Promise<{ id: string; label: string; url: string; error?: string }[]> {
  return Promise.all(APPS.map(async app => {
    const error = (await up(app)) ? null : await start(app)
    return { id: app.id, label: app.label, url: app.url, ...(error === null ? {} : { error }) }
  }))
}
