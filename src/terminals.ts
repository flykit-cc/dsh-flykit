import { randomUUID } from 'node:crypto'
import { spawn } from 'node-pty'
import type { IPty } from 'node-pty'

/** Agents a terminal can run. The browser sends an id; argv never comes from the request. */
export const AGENTS: Record<string, { label: string; argv: string[] }> = {
  shell: { label: 'Shell', argv: [process.env['SHELL'] ?? '/bin/zsh', '-l'] },
  claude: { label: 'Claude Code', argv: ['claude'] },
  pi: { label: 'Pi', argv: ['pi'] },
  codex: { label: 'Codex', argv: ['codex'] },
}

const SCROLLBACK = 256 << 10   // bytes of output replayed to a (re)attaching browser

export interface Term {
  id: string
  sessionId: string
  agent: string
  pty: IPty
  exited: number | null
  buffer: string
  listeners: Set<(chunk: string) => void>
}

export interface TermInfo { id: string; agent: string; label: string; pid: number; exited: number | null }

const terms = new Map<string, Term>()

export function info(t: Term): TermInfo {
  return { id: t.id, agent: t.agent, label: AGENTS[t.agent]?.label ?? t.agent, pid: t.pty.pid, exited: t.exited }
}

export function list(sessionId: string): TermInfo[] {
  return [...terms.values()].filter(t => t.sessionId === sessionId).map(info)
}

export function get(id: string): Term | undefined { return terms.get(id) }

export function open(sessionId: string, cwd: string, agent: string, cols: number, rows: number): Term | null {
  const spec = AGENTS[agent]
  if (spec === undefined) return null
  const [cmd, ...args] = spec.argv
  const pty = spawn(cmd!, args, {
    name: 'xterm-256color', cols, rows, cwd,
    env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor', FLYKIT_SESSION: sessionId } as Record<string, string>,
  })
  const t: Term = { id: randomUUID(), sessionId, agent, pty, exited: null, buffer: '', listeners: new Set() }
  pty.onData(chunk => {
    t.buffer = (t.buffer + chunk).slice(-SCROLLBACK)
    for (const l of t.listeners) l(chunk)
  })
  pty.onExit(({ exitCode }) => {
    t.exited = exitCode
    const note = `\r\n\x1b[2m[exited ${exitCode}]\x1b[0m\r\n`
    t.buffer = (t.buffer + note).slice(-SCROLLBACK)
    for (const l of t.listeners) l(note)
  })
  terms.set(t.id, t)
  return t
}

export function close(id: string): boolean {
  const t = terms.get(id)
  if (t === undefined) return false
  terms.delete(id)
  if (t.exited === null) t.pty.kill()
  t.listeners.clear()
  return true
}

export function closeAll(): void { for (const id of [...terms.keys()]) close(id) }
