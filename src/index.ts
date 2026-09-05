import type { Context } from '@deepseek-ai/cordis'
// Type-only: declares `ctx.webServer` on the host Context.
import type {} from '@deepseek-ai/dsh-host-webserver'
// Type-only: declares `ctx.sessions` on the host Context.
import type {} from '@deepseek-ai/dsh-session'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { gitStatus } from './git.js'

export const name = 'flykit'
export const inject = ['webServer', 'sessions']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/flykit/git',
    handler: async (req, res) => {
      const id = new URL(req.url ?? '', 'http://x').searchParams.get('sessionId')
      // cwd comes from the session header only; a caller-supplied path is never honoured.
      const cwd = id === null ? undefined : ctx.sessions.get(id as SessionId)?.header.cwd
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.setHeader('cache-control', 'no-store')
      res.setHeader('x-content-type-options', 'nosniff')
      if (cwd === undefined) { res.statusCode = 404; res.end('{}'); return }
      try { res.end(JSON.stringify(await gitStatus(cwd))) }
      catch { res.end('{}') }  // not a repo, git absent, or timeout
    },
  }), 'flykit: git route')
}
