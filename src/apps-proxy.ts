import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Duplex } from 'node:stream'
import { WebSocket, WebSocketServer } from 'ws'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'        // types ctx.webServer
import type {} from '@deepseek-ai/dsh-client-connection'      // types ctx.connection
import { APPS, type App } from './apps.js'

/**
 * Reverse proxy that serves each app's viewer under `/apps/<id>/` on the harness origin.
 *
 * The viewer page and its `/json/list` are forwarded to the app's local viewer server; the
 * screencast websocket is forwarded to Chrome's CDP page target. Because the browser only ever
 * talks to the harness origin, the apps ride the harness's own auth fence instead of exposing a
 * raw, tokenless CDP port — and the same URLs work whether the panel is opened locally or through
 * the tunnel. Adding an app is a row in `APPS`; nothing here is provider-specific.
 */

/** Resolve the CDP page target (the app's tab) from the local Chrome. */
async function pageTarget(app: App): Promise<string | null> {
  const list = await fetch(`${app.cdp}json`, { signal: AbortSignal.timeout(2000) })
    .then(r => r.ok ? r.json() : null).catch(() => null)
  if (!Array.isArray(list)) return null
  const target = list.find((t: { type?: string; url?: string; webSocketDebuggerUrl?: string }) =>
    t.type === 'page' && typeof t.url === 'string' && t.url.startsWith(app.pageUrlPrefix) && typeof t.webSocketDebuggerUrl === 'string')
  return typeof target?.webSocketDebuggerUrl === 'string' ? target.webSocketDebuggerUrl : null
}

/**
 * The harness's own request guard (Host/Origin fence + browser cookie), the same one
 * dsh-client-connection applies to `/api`. A returned status must reject the request;
 * undefined means it may proceed.
 */
type AppGuard = (req: IncomingMessage) => 401 | 403 | undefined

/** Forward `/apps/<id>/<rest>` to the app's viewer (`http://127.0.0.1:<viewer>/<rest>`). */
function httpProxy(app: App, guard: AppGuard) {
  const prefix = `/apps/${app.id}`
  return async (req: IncomingMessage, res: ServerResponse) => {
    const rejection = guard(req)
    if (rejection !== undefined) { res.writeHead(rejection); res.end(); return }
    const rest = (req.url ?? '/').slice(prefix.length) || '/'
    const upstream = await fetch(app.viewer.replace(/\/$/, '') + rest, { signal: AbortSignal.timeout(5000) }).catch(() => null)
    if (upstream === null) { res.writeHead(502); res.end(); return }
    res.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') ?? 'application/octet-stream' })
    res.end(Buffer.from(await upstream.arrayBuffer()))
  }
}

/** Relay the browser's `/apps/<id>/cdp` websocket to Chrome's CDP page target. */
function cdpProxy(app: App, guard: AppGuard) {
  const wss = new WebSocketServer({ noServer: true })
  const origin = app.viewer.replace(/\/$/, '')   // Chrome already allows this origin via --remote-allow-origins
  return (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (guard(req) !== undefined) { socket.destroy(); return }
    pageTarget(app).then(url => {
      if (url === null) { socket.destroy(); return }
      wss.handleUpgrade(req, socket, head, browser => {
        const chrome = new WebSocket(url, { perMessageDeflate: false, origin })
        const relay = (from: WebSocket, to: WebSocket) => from.on('message', (data: unknown) => { if (to.readyState === WebSocket.OPEN) to.send(data) })
        relay(browser, chrome)
        relay(chrome, browser)
        const teardown = () => { try { browser.close() } catch { /* already closed */ } try { chrome.close() } catch { /* already closed */ } }
        chrome.on('close', teardown)
        browser.on('close', teardown)
        chrome.on('error', teardown)
        browser.on('error', teardown)
      })
    }).catch(() => socket.destroy())
  }
}

/** Register the viewer + CDP proxy routes for every app, behind the harness's own auth. */
export function registerAppProxies(ctx: Context): void {
  const guard: AppGuard = req => ctx.connection.requestRejection(req)
  for (const app of APPS) {
    ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: `/apps/${app.id}`, handler: httpProxy(app, guard) }), `flykit: /apps/${app.id}`)
    ctx.effect(() => ctx.webServer.registerUpgrade({ path: `/apps/${app.id}/cdp`, handler: cdpProxy(app, guard) }), `flykit: /apps/${app.id}/cdp`)
  }
}
