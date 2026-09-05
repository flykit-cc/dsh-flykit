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

/**
 * The host may itself run under an agent (dsh web started from a Claude Code
 * shell). Those markers would make every spawned agent think it is a child
 * session, so they never reach the PTY.
 */
function cleanEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (v === undefined || k.startsWith('CLAUDE_CODE') || k === 'CLAUDECODE' || k.startsWith('PI_SESSION') || k.startsWith('CODEX_')) continue
    env[k] = v
  }
  return env
}

const SCROLLBACK = 256 << 10   // bytes of output replayed to a (re)attaching browser

export interface Term {
  id: string
  sessionId: string
  agent: string
  /** Tab label; the agent's default unless the caller named this terminal. */
  name: string
  pty: IPty
  exited: number | null
  buffer: string
  /** Characters ever written to `buffer`, so a reader can resume where it left off. */
  seq: number
  listeners: Set<(chunk: string) => void>
}

export interface TermInfo { id: string; agent: string; label: string; pid: number; exited: number | null; seq: number }

const terms = new Map<string, Term>()

export function info(t: Term): TermInfo {
  return { id: t.id, agent: t.agent, label: t.name, pid: t.pty.pid, exited: t.exited, seq: t.seq }
}

export function list(sessionId: string): TermInfo[] {
  return [...terms.values()].filter(t => t.sessionId === sessionId).map(info)
}

export function get(id: string): Term | undefined { return terms.get(id) }

export function open(sessionId: string, cwd: string, agent: string, cols: number, rows: number, name?: string): Term | null {
  const spec = AGENTS[agent]
  if (spec === undefined) return null
  const [cmd, ...args] = spec.argv
  const pty = spawn(cmd!, args, {
    name: 'xterm-256color', cols, rows, cwd,
    env: { ...cleanEnv(), TERM: 'xterm-256color', COLORTERM: 'truecolor', FLYKIT_SESSION: sessionId },
  })
  const t: Term = {
    id: randomUUID(), sessionId, agent, name: name?.trim() || spec.label,
    pty, exited: null, buffer: '', seq: 0, listeners: new Set(),
  }
  const push = (chunk: string) => {
    t.buffer = (t.buffer + chunk).slice(-SCROLLBACK)
    t.seq += chunk.length
    for (const l of t.listeners) l(chunk)
  }
  pty.onData(push)
  pty.onExit(({ exitCode }) => {
    t.exited = exitCode
    push(`\r\n\x1b[2m[exited ${exitCode}]\x1b[0m\r\n`)
  })
  terms.set(t.id, t)
  return t
}

/** The slice of `buffer` written after `sinceSeq`; scrollback loss silently clamps. */
export function since(t: Term, sinceSeq: number): string {
  const oldest = t.seq - t.buffer.length
  return t.buffer.slice(Math.max(0, sinceSeq - oldest))
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
