import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
// Type-only: declares `ctx.webServer` on the host Context.
import type {} from '@deepseek-ai/dsh-host-webserver'
// Type-only: declares `ctx.sessions` on the host Context.
import type {} from '@deepseek-ai/dsh-session'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { gitStatus } from './git.js'
import { listFiles, readText, writeText } from './files.js'
import { streamChanges } from './watch.js'
import * as terms from './terminals.js'

export const name = 'flykit'
export const inject = ['webServer', 'sessions']

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
      const t = terms.open(q.get('sessionId')!, cwd, q.get('agent') ?? 'shell', Number(q.get('cols')) || 120, Number(q.get('rows')) || 32)
      return t === null ? null : terms.info(t)
    }
    if (req.method === 'DELETE') return terms.close(id ?? '') ? { ok: true } : null
    return { terms: terms.list(url.searchParams.get('sessionId')!) }
  })
  route('/api/flykit/term/input', async (_cwd, url, req) => {
    const t = terms.get(url.searchParams.get('id') ?? '')
    if (t === undefined || t.exited !== null) return null
    t.pty.write(await body(req))
    return { ok: true }
  })
  route('/api/flykit/term/resize', async (_cwd, url) => {
    const t = terms.get(url.searchParams.get('id') ?? '')
    const cols = Number(url.searchParams.get('cols')), rows = Number(url.searchParams.get('rows'))
    if (t === undefined || t.exited !== null || !(cols > 1 && rows > 1)) return null
    t.pty.resize(Math.min(cols, 500), Math.min(rows, 200))
    return { ok: true }
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
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/flykit/watch',
    handler: (req, res) => {
      const cwd = cwdOf(new URL(req.url ?? '', 'http://x'))
      if (cwd === undefined) { res.statusCode = 404; res.end(); return }
      streamChanges(cwd, req, res)
    },
  }), 'flykit: /api/flykit/watch')
}
