import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
// Type-only: declares `ctx.webServer` on the host Context.
import type {} from '@deepseek-ai/dsh-host-webserver'
// Type-only: declares `ctx.sessions` on the host Context.
import type {} from '@deepseek-ai/dsh-session'
// Type-only: declares `ctx.tools` on the host Context.
import type {} from '@deepseek-ai/dsh-tools'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { gitStatus } from './git.js'
import { listFiles, readText, writeText } from './files.js'
import { streamChanges } from './watch.js'
import * as terms from './terminals.js'
import { claudeUsage } from './claude-usage.js'
import { TARGETS, discover, entryFor, extraTargets, fetchListing, type CatalogTarget } from './catalog-sync.js'
import { screenText } from './term-io.js'
// Type-only: declares `ctx.settings`.
import type {} from '@deepseek-ai/dsh-settings'
import { agentTools } from './agent-tools.js'
import { watchAnswers } from './notify.js'
import { APP_ICON_PNG, manifestFor } from './app-icon.js'
import { ensureApps } from './apps.js'

export const name = 'flykit'
export const inject = ['webServer', 'sessions', 'agents']

type Handler = (cwd: string, url: URL, req: IncomingMessage, res: ServerResponse) => Promise<unknown>

function body(req: IncomingMessage): Promise<string> {
  return new Promise((ok, fail) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => ok(Buffer.concat(chunks).toString('utf8')))
    req.on('error', fail)
  })
}

export function apply(ctx: Context): void {
  // One host-side answer detector per terminal: it rings the panel and, after an Enter,
  // queues the answer to the DSH agent as a follow-up turn. 120x32 is the tool terminals' size.
  const { arm, stop } = watchAnswers(ctx, 120, 32)
  ctx.effect(() => stop, 'flykit: answer watch')
  // cwd comes from the session header only; a caller-supplied path is never honoured.
  const cwdOf = (url: URL) => {
    const id = url.searchParams.get('sessionId')
    return id === null ? undefined : ctx.sessions.get(id as SessionId)?.header.cwd
  }
  const route = (path: string, handle: Handler) => ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path,
    handler: async (req, res) => {
      const url = new URL(req.url ?? '', 'http://x')
      const cwd = cwdOf(url)
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.setHeader('cache-control', 'no-store')
      res.setHeader('x-content-type-options', 'nosniff')
      if (cwd === undefined) { res.statusCode = 404; res.end('{}'); return }
      try {
        const out = await handle(cwd, url, req, res)
        if (out === null) { res.statusCode = 400; res.end('{}') }
        else res.end(JSON.stringify(out))
      } catch (e) {
        res.statusCode = 500
        res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }))
      }
    },
  }), `flykit: ${path}`)

  route('/api/flykit/git', cwd => gitStatus(cwd).catch(() => ({})))  // not a repo, git absent, or timeout
  route('/api/flykit/files', async cwd => ({ files: await listFiles(cwd) }))
  route('/api/flykit/file', async (cwd, url, req) => {
    const path = url.searchParams.get('path') ?? ''
    if (req.method === 'PUT') return (await writeText(cwd, path, await body(req))) ? { ok: true } : null
    const text = await readText(cwd, path)
    return text === null ? null : { text }
  })
  // Terminals: open / list / input / resize / close as JSON, output as one SSE stream per attach.
  route('/api/flykit/terms', async (cwd, url, req) => {
    const id = url.searchParams.get('id')
    if (req.method === 'POST') {
      const q = url.searchParams
      const t = terms.open(q.get('sessionId')!, cwd, q.get('agent') ?? 'shell', Number(q.get('cols')) || 120, Number(q.get('rows')) || 32, q.get('name') ?? undefined)
      return t === null ? null : terms.info(t)
    }
    if (req.method === 'DELETE') return terms.close(id ?? '') ? { ok: true } : null
    return { terms: terms.list(url.searchParams.get('sessionId')!) }
  })
  route('/api/flykit/term/input', async (_cwd, url, req) => {
    const t = terms.get(url.searchParams.get('id') ?? '')
    if (t === undefined || t.exited !== null) return null
    const keys = await body(req)
    t.pty.write(keys)
    // The user pressed Enter: their message and the agent's answer reach the orchestrator too.
    if (keys.includes('\r')) arm(t)
    return { ok: true }
  })
  route('/api/flykit/term/resize', async (_cwd, url) => {
    const t = terms.get(url.searchParams.get('id') ?? '')
    const cols = Number(url.searchParams.get('cols')), rows = Number(url.searchParams.get('rows'))
    if (t === undefined || t.exited !== null || !(cols > 1 && rows > 1)) return null
    const next = { cols: Math.min(cols, 500), rows: Math.min(rows, 200) }
    // A real size change makes a TUI redraw its whole screen (~1.4k chars on Claude Code): not an answer.
    if (next.cols !== t.cols || next.rows !== t.rows) t.activity.discard = true
    t.cols = next.cols; t.rows = next.rows
    t.pty.resize(t.cols, t.rows)
    return { ok: true }
  })
  // Plain-text tail of a terminal's screen, for the thumbnails: rendered host-side, no PTY resize.
  route('/api/flykit/term/screen', async (_cwd, url) => {
    const t = terms.get(url.searchParams.get('id') ?? '')
    if (t === undefined) return null
    const lines = (await screenText(t.buffer, t.cols, t.rows)).split('\n')
    while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
    return { lines: lines.slice(-14), seq: t.seq, exited: t.exited }
  })
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/flykit/term/stream',
    handler: (req, res) => {
      const url = new URL(req.url ?? '', 'http://x')
      const t = terms.get(url.searchParams.get('id') ?? '')
      if (t === undefined || cwdOf(url) === undefined) { res.statusCode = 404; res.end(); return }
      res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', 'connection': 'keep-alive', 'x-accel-buffering': 'no' })
      const send = (chunk: string) => res.write(`data: ${JSON.stringify(chunk)}\n\n`)
      send(t.buffer)
      t.listeners.add(send)
      const ping = setInterval(() => res.write(': ping\n\n'), 25_000)
      req.on('close', () => { clearInterval(ping); t.listeners.delete(send) })
    },
  }), 'flykit: /api/flykit/term/stream')
  ctx.effect(() => () => terms.closeAll(), 'flykit: terminals')
  // Model-facing half of the same terminals. Deferred rather than in `inject` so a
  // bundle without the tool registry still gets the panel and the status line.
  ctx.inject(['tools'], toolCtx => {
    for (const tool of agentTools(arm)) toolCtx.effect(() => toolCtx.tools.register(tool), `flykit: tool ${tool.name}`)
  })
  // Subscription usage of the Claude Code login on this machine; no session needed, token stays host-side.
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/flykit/claude-usage',
    handler: async (_req, res) => {
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.setHeader('cache-control', 'no-store')
      try { res.end(JSON.stringify(await claudeUsage())) }
      catch (e) { res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) })) }
    },
  }), 'flykit: /api/flykit/claude-usage')
  // Apps tab: machine-global local servers (WhatsApp Web in headless Chrome), started on demand.
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/flykit/apps',
    handler: async (_req, res) => {
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.setHeader('cache-control', 'no-store')
      res.end(JSON.stringify({ apps: await ensureApps() }))
    },
  }), 'flykit: /api/flykit/apps')
  // Web app manifest + icon. The shell's index links /manifest.webmanifest, a static file with the same app
  // id as ours; an exact route beats the static fallback, so Chrome sees "flykit" on every load instead of
  // flip-flopping between the two names and asking to review the rename.
  for (const path of ['/manifest.webmanifest', '/api/flykit/manifest.webmanifest']) {
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path,
      handler: (req, res) => {
        res.setHeader('content-type', 'application/manifest+json; charset=utf-8')
        res.setHeader('cache-control', 'no-store')
        res.end(JSON.stringify(manifestFor(req.headers.host)))
      },
    }), `flykit: ${path}`)
  }
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/flykit/icon.png',
    handler: (_req, res) => {
      res.setHeader('content-type', 'image/png')
      res.setHeader('cache-control', 'public, max-age=86400')
      res.end(APP_ICON_PNG)
    },
  }), 'flykit: /api/flykit/icon.png')
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/flykit/watch',
    handler: (req, res) => {
      const cwd = cwdOf(new URL(req.url ?? '', 'http://x'))
      if (cwd === undefined) { res.statusCode = 404; res.end(); return }
      streamChanges(cwd, req, res)
    },
  }), 'flykit: /api/flykit/watch')

  // Live model catalogs into the user's llm settings, one target per provider:
  // see `TARGETS`. Optional: a composition without the settings service simply
  // keeps whatever static list its adapters ship.
  ctx.inject(['settings'], (scope: Context) => {
    // The credentials service is optional, so it is fetched, not injected —
    // the same `ctx.get` the llm adapters use. The property read does NOT
    // resolve a service, so `scope.credentials` would be undefined here.
    const getService = (ctx as unknown as { get: (name: string) => unknown }).get.bind(ctx)
    const creds = getService('credentials') as { resolve: (ref: string) => Promise<{ value: string } | undefined> } | undefined

    interface Outcome { label: string; count?: number; skipped?: string }

    /**
     * Read the target's section, then its credential, then its live listing.
     *
     * A section that is absent is not ours to create — an adapter nobody
     * configured keeps its own defaults, which is what the deepseek route did
     * until its section existed. A section that cannot be listed, or that
     * answers with something too small to be a real catalog, is reported and
     * left exactly as it is.
     */
    const syncOne = async (target: CatalogTarget): Promise<Outcome> => {
      const section = scope.settings.get(target.ns) as { baseURL?: string; apiKeyEnv?: string } | undefined
      if (section === undefined) return { label: target.label, skipped: `${target.ns} not configured` }
      const ref = section.apiKeyEnv ?? target.defaultApiKeyEnv
      const resolved = ref === '' ? undefined : creds === undefined ? undefined : await creds.resolve(ref).catch(() => undefined)
      const raw = await fetchListing(section.baseURL ?? target.defaultBaseURL, resolved?.value)
      const models = discover(raw, target)
      if (models.length < target.floor) return { label: target.label, skipped: `${models.length} models returned` }
      await scope.settings.mutate(target.ns, [{ op: 'set', path: target.path, value: models.map(m => entryFor(target, m)) }])
      return { label: target.label, count: models.length }
    }

    const sync = async (): Promise<{ count: number; note?: string } | { skipped: string }> => {
      const pi = scope.settings.get('llm-pi-ai')
      const targets = [...TARGETS, ...extraTargets(pi)]
      const outcomes: Outcome[] = []
      for (const target of targets) {
        try { outcomes.push(await syncOne(target)) }
        catch (e) { outcomes.push({ label: target.label, skipped: e instanceof Error ? e.message : String(e) }) }
      }
      const count = outcomes.reduce((n, o) => n + (o.count ?? 0), 0)
      if (count === 0) return { skipped: outcomes.map(o => `${o.label}: ${o.skipped ?? 'nothing to write'}`).join('; ') }
      const failures = outcomes.filter(o => o.skipped !== undefined).map(o => `${o.label}: ${o.skipped}`)
      return failures.length === 0 ? { count } : { count, note: failures.join(' · ') }
    }
    // Once at boot, then daily; failures are logged, never thrown into the host.
    const run = () => { sync().then(r => {
      console.log('count' in r ? `[flykit] catalog sync: ${r.count} models${r.note === undefined ? '' : ` (${r.note})`}` : `[flykit] catalog sync: skipped — ${r.skipped}`)
    }).catch(e => console.warn('[flykit] catalog sync failed:', e instanceof Error ? e.message : e)) }
    const boot = setTimeout(run, 3_000)
    const daily = setInterval(run, 24 * 3600_000)
    scope.effect(() => () => { clearTimeout(boot); clearInterval(daily) }, 'flykit: catalog sync')
    scope.effect(() => scope.webServer.register({
      kind: 'exact',
      path: '/api/flykit/catalog-sync',
      handler: async (req, res) => {
        res.setHeader('content-type', 'application/json; charset=utf-8')
        if (req.method !== 'POST') { res.statusCode = 405; res.end('{}'); return }
        try { res.end(JSON.stringify(await sync())) }
        catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) })) }
      },
    }), 'flykit: /api/flykit/catalog-sync')
  })
}
