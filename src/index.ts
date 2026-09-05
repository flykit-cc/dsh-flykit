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
