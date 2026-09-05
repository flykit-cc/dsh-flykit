import { watch } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'

const IGNORED = /(^|\/)(\.git|node_modules|\.DS_Store)(\/|$)/
const BATCH_MS = 150
const PING_MS = 25_000

/**
 * Hold the response open as a Server-Sent Events stream and push one batch of
 * changed relative paths per burst. An empty batch means "something changed,
 * path unknown": the client re-reads the list.
 */
// ponytail: one fs.watch per open panel; share a watcher per cwd if many tabs ever hit one workspace.
export function streamChanges(cwd: string, req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-store',
    'connection': 'keep-alive',
    'x-accel-buffering': 'no',
  })
  res.write(': open\n\n')

  let pending = new Set<string>()
  let unknown = false
  let timer: NodeJS.Timeout | null = null
  const flush = () => {
    timer = null
    const paths = unknown ? [] : [...pending]
    pending = new Set(); unknown = false
    res.write(`data: ${JSON.stringify({ paths })}\n\n`)
  }
  const queue = (file: string | null) => {
    if (file === null) unknown = true
    else if (IGNORED.test(file)) return
    else pending.add(file.split('\\').join('/'))
    timer ??= setTimeout(flush, BATCH_MS)
  }

  let watcher: ReturnType<typeof watch>
  try {
    watcher = watch(cwd, { recursive: true }, (_event, file) => queue(file === null ? null : String(file)))
    watcher.on('error', () => queue(null))
  } catch {
    res.write('event: error\ndata: "watch unavailable"\n\n')
    res.end()
    return
  }

  const ping = setInterval(() => res.write(': ping\n\n'), PING_MS)
  req.on('close', () => {
    clearInterval(ping)
    if (timer !== null) clearTimeout(timer)
    watcher.close()
  })
}
