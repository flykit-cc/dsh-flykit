/**
 * Turning raw PTY bytes into something a model can read, and waiting for a TUI
 * to stop talking. Neither touches the harness or node-pty, so the tests run
 * them directly.
 */

// Default import: the published bundle is CommonJS and Node cannot see its named exports.
import xterm from '@xterm/headless'

const { Terminal } = xterm

/**
 * Escape sequences, longest match first: OSC (window-title strings) has to come
 * before the generic single-character Fe form, which would otherwise consume
 * only the `]` intro and leave the payload as visible text.
 */
const ANSI = /\u001B(?:\][\s\S]*?(?:\u0007|\u001B\\)|\[[0-?]*[ -\/]*[@-~]|[ -\/]+[0-~]|[@-Z\\^_])/g
/** C0 controls except tab, newline and carriage return, plus DEL. */
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

export function stripAnsi(raw: string): string {
  return raw.replace(ANSI, '').replace(CONTROL, '')
}

/**
 * What the screen would show after a raw PTY stream. A full-screen TUI — Claude
 * Code above all — positions the cursor and redraws in place instead of writing
 * lines, so stripping the escapes textually yields one unreadable smear; only a
 * real emulator puts the characters back where they belong.
 */
// ponytail: a fresh emulator per call over the whole scrollback; cache one per terminal if reads ever get hot.
export async function screenText(raw: string, cols = 120, rows = 32): Promise<string> {
  const term = new Terminal({ cols, rows, scrollback: 5_000, allowProposedApi: true })
  try {
    await new Promise<void>(done => term.write(raw, done))
    const buf = term.buffer.active
    const lines: string[] = []
    for (let y = 0; y < buf.length; y++) lines.push(buf.getLine(y)?.translateToString(true).trimEnd() ?? '')
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  } finally {
    term.dispose()
  }
}

/** A terminal as `waitQuiet` sees it: something that hands chunks to listeners. */
export interface Quietable {
  listeners: Set<(chunk: string) => void>
}

export interface QuietResult {
  /** Raw output produced while waiting; still needs `screenText`. */
  raw: string
  reason: 'quiet' | 'timeout' | 'aborted'
}

/**
 * Resolve once output has paused for `quietMs`, or after `timeoutMs` whatever
 * happens. The quiet window is armed immediately, so a terminal that says
 * nothing at all settles instead of running to the timeout.
 */
export function waitQuiet(t: Quietable, quietMs: number, timeoutMs: number, signal?: AbortSignal): Promise<QuietResult> {
  return new Promise(resolve => {
    let raw = ''
    const settle = (reason: QuietResult['reason']) => {
      clearTimeout(quiet)
      clearTimeout(cap)
      t.listeners.delete(onData)
      signal?.removeEventListener('abort', onAbort)
      resolve({ raw, reason })
    }
    const onData = (chunk: string) => {
      raw += chunk
      clearTimeout(quiet)
      quiet = setTimeout(() => settle('quiet'), quietMs)
    }
    const onAbort = () => settle('aborted')
    const cap = setTimeout(() => settle('timeout'), timeoutMs)
    let quiet = setTimeout(() => settle('quiet'), quietMs)
    t.listeners.add(onData)
    if (signal?.aborted === true) settle('aborted')
    else signal?.addEventListener('abort', onAbort, { once: true })
  })
}
