/**
 * Model-facing tools that let the DSH agent drive the coding agents in the
 * flykit panel: open a terminal, type into it, wait for the answer, read it back.
 *
 * These go through `defineTool`, not a raw `ToolDefinition`: `register()` on its
 * own expects finished JSON Schema, so handing it the per-property DSL yields a
 * schema with no `properties` and every call arrives with empty arguments.
 * `render` must return an ARRAY of content blocks — a bare string fails at
 * runtime with "content is not iterable".
 */

import { execFile } from 'node:child_process'
import { defineTool, type ToolDefinition, type ToolRunContext } from '@deepseek-ai/dsh-tools'
import * as terms from './terminals.js'
import { screenText, stripAnsi, waitQuiet } from './term-io.js'

const COLS = 120
const ROWS = 32
const MAX_CHARS = 4_000            // default slice of scrollback handed to the model
const ENTER_DELAY_MS = 40          // a TUI that sees text and CR in one write submits before it has parsed the text
const BOOT_QUIET_MS = 1_500
const BOOT_TIMEOUT_MS = 30_000
const RUN_MAX_BUFFER = 8 << 20

const AGENT_NAMES = Object.keys(terms.AGENTS)

/** The session behind this tool call; its cwd is where a new terminal opens. */
function sessionOf(exec: ToolRunContext): { id: string; cwd: string } {
  // Structural read: the live-agent face lives in dsh-agent's runtime types, which
  // this plugin does not otherwise need.
  const s = (exec.agent as { session?: { id?: string; header?: { cwd?: string } } } | undefined)?.session
  if (s?.id === undefined || s.header?.cwd === undefined) throw new Error('flykit: this call has no session, so there is no workspace to run an agent in')
  return { id: s.id, cwd: s.header.cwd }
}

/** A terminal of THIS session, or a throw — one session never reaches another's agents. */
function mine(exec: ToolRunContext, id: string): terms.Term {
  const t = terms.get(id)
  if (t === undefined || t.sessionId !== sessionOf(exec).id) throw new Error(`flykit: no agent terminal "${id}" in this session`)
  return t
}

/** One text field, the shape every conversational answer here uses. */
const textOutput = () => ({
  schema: {
    type: 'object',
    // Requiredness is per-property; the value schema DSL rejects a top-level
    // `required` array (typecheck accepts it, the runtime does not).
    properties: { text: { type: 'string', required: true } },
    additionalProperties: false,
  },
  render: (_args: unknown, value: { text: string }) => [{ type: 'text' as const, text: value.text }],
} as const)

const TERM_FIELDS = {
  id: { type: 'string', required: true, description: 'Pass this to the other flykit_agent_* tools.' },
  agent: { type: 'string', required: true },
  label: { type: 'string', required: true },
  pid: { type: 'integer', required: true },
  exited: { type: 'integer', description: 'Exit code once the agent has stopped; absent while it runs.' },
  seq: { type: 'integer', required: true, description: 'Output cursor; pass as sinceSeq to flykit_agent_read for only what is new.' },
} as const

const termValue = { type: 'object', properties: TERM_FIELDS, additionalProperties: false } as const

function termJson(t: terms.Term) {
  const i = terms.info(t)
  return { id: i.id, agent: i.agent, label: i.label, pid: i.pid, seq: i.seq, ...i.exited === null ? {} : { exited: i.exited } }
}

function describe(t: { id: string; agent: string; label: string; pid: number; exited?: number }): string {
  return `${t.label} (${t.agent}) id=${t.id} pid=${t.pid}${t.exited === undefined ? '' : ` exited ${t.exited}`}`
}

/**
 * Wait for a freshly opened agent to finish drawing itself. Silence BEFORE the
 * first byte is a slow boot, not idleness, so it does not end the wait — only
 * a pause after real output does.
 */
// ponytail: fixed windows; make them parameters if an agent ever takes longer than BOOT_TIMEOUT_MS to say anything.
async function waitForBoot(t: terms.Term, signal: AbortSignal): Promise<string> {
  const until = Date.now() + BOOT_TIMEOUT_MS
  let out = ''
  while (out === '' && t.exited === null && Date.now() < until) {
    const { raw, reason } = await waitQuiet(t, BOOT_QUIET_MS, until - Date.now(), signal)
    out += raw
    if (reason !== 'quiet') break
  }
  return out
}

/** Tail of a plain-text transcript, cut at a line boundary where one is near. */
function tail(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  const cut = text.slice(-maxChars)
  const nl = cut.indexOf('\n')
  return `…\n${nl > 0 && nl < 200 ? cut.slice(nl + 1) : cut}`
}

/** One-shot headless run. `claude` speaks JSON; `pi` prints the answer as text. */
function runHeadless(agent: 'claude' | 'pi' | 'codex', prompt: string, cwd: string, timeoutMs: number, signal: AbortSignal): Promise<string> {
  const argv = agent === 'claude'
    ? ['-p', prompt, '--output-format', 'json']
    // `codex exec` is the CLI's own non-interactive mode; it prints plain text.
    : agent === 'codex' ? ['exec', prompt]
    : ['-p', prompt]
  return new Promise(resolve => {
    execFile(agent, argv, { cwd, timeout: timeoutMs, maxBuffer: RUN_MAX_BUFFER, signal, encoding: 'utf8' }, (err, stdout, stderr) => {
      // Not a PTY, so this is ordinary text; only colour codes need removing.
      const text = stripAnsi(stdout).trim()
      if (text === '') resolve(err === null ? '(no output)' : `${agent} failed: ${err.message}\n${stripAnsi(stderr).trim()}`)
      else if (agent === 'claude') resolve(claudeResult(text))
      else resolve(text)
    })
  })
}

/** `claude -p --output-format json` prints one object whose `result` is the answer. */
function claudeResult(stdout: string): string {
  try {
    const parsed: unknown = JSON.parse(stdout)
    const result = (parsed as { result?: unknown }).result
    if (typeof result === 'string') return result
  } catch { /* not JSON after all — the raw text is still the best answer */ }
  return stdout
}

export function agentTools(): ToolDefinition[] {
  return [
    defineTool({
      name: 'flykit_agent_start',
      description:
        'Open a coding agent in a terminal in this workspace and return its id. The terminal appears in the '
        + 'flykit panel\'s Agents tab, where the user can watch and take over. Interactive agents need '
        + 'flykit_agent_send to receive a task and flykit_agent_wait to answer; for a single question with no '
        + 'follow-up, flykit_agent_run is cheaper. Returns once the agent has finished starting up, so the '
        + 'first flykit_agent_send is not swallowed.',
      parameters: {
        agent: { type: 'string', enum: AGENT_NAMES, required: true, description: 'Which agent to run.' },
        name: { type: 'string', description: 'Tab label in the panel; defaults to the agent name. Use it when running several of the same agent.' },
      },
      output: {
        schema: { type: 'object', properties: { ...TERM_FIELDS, text: { type: 'string', required: true, description: 'What the agent printed while starting up.' } }, additionalProperties: false },
        render: (_args: unknown, value: { id: string; agent: string; label: string; pid: number; exited?: number; text: string }) =>
          [{ type: 'text' as const, text: `Started ${describe(value)}\n${value.text}` }],
      },
      async execute(args, exec) {
        const { id, cwd } = sessionOf(exec)
        const t = terms.open(id, cwd, args.agent, COLS, ROWS, args.name)
        if (t === null) throw new Error(`flykit: unknown agent "${args.agent}"`)
        // Return only once the TUI has drawn itself: a send that lands mid-boot is swallowed.
        const raw = await waitForBoot(t, exec.signal)
        return { ...termJson(t), text: tail(await screenText(raw, COLS, ROWS), MAX_CHARS) || '(no startup output)' }
      },
    }),

    defineTool({
      name: 'flykit_agent_send',
      description:
        'Type text into a running agent terminal. Sends Enter afterwards unless enter is false — send false to '
        + 'compose a multi-line message, or to answer a menu that reacts to a single keystroke. Returns '
        + 'immediately; call flykit_agent_wait to read the reply.',
      parameters: {
        id: { type: 'string', required: true, description: 'Terminal id from flykit_agent_start.' },
        text: { type: 'string', required: true, description: 'Exactly what to type.' },
        enter: { type: 'boolean', description: 'Press Enter after the text (default true).' },
      },
      output: textOutput(),
      async execute(args, exec) {
        const t = mine(exec, args.id)
        if (t.exited !== null) throw new Error(`flykit: agent "${t.name}" already exited (${t.exited})`)
        t.pty.write(args.text)
        if (args.enter !== false) {
          await new Promise(r => setTimeout(r, ENTER_DELAY_MS))
          t.pty.write('\r')
        }
        return { text: `Sent ${args.text.length} characters to ${t.name}.` }
      },
    }),

    defineTool({
      name: 'flykit_agent_read',
      description:
        'Read an agent terminal as plain text — what its screen would show, with colours and redraws resolved. '
        + 'Pass sinceSeq from an earlier call to see only what is new. Use flykit_agent_wait instead when the '
        + 'answer you want has not arrived yet.',
      parameters: {
        id: { type: 'string', required: true },
        maxChars: { type: 'integer', description: `Trim to the last N characters (default ${MAX_CHARS}).` },
        sinceSeq: { type: 'integer', description: 'Output cursor from a previous read, start or wait.' },
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            text: { type: 'string', required: true },
            seq: { type: 'integer', required: true, description: 'Pass back as sinceSeq next time.' },
            exited: { type: 'integer' },
          },
          additionalProperties: false,
        },
        render: (_args: unknown, value: { text: string }) => [{ type: 'text' as const, text: value.text }],
      },
      async execute(args, exec) {
        const t = mine(exec, args.id)
        const raw = args.sinceSeq === undefined ? t.buffer : terms.since(t, args.sinceSeq)
        const text = tail(await screenText(raw, COLS, ROWS), Math.max(200, args.maxChars ?? MAX_CHARS))
        return { text: text === '' ? '(no new output)' : text, seq: t.seq, ...t.exited === null ? {} : { exited: t.exited } }
      },
    }),

    defineTool({
      name: 'flykit_agent_wait',
      description:
        'Wait for an agent terminal to stop printing, then return what it printed while waiting, as plain '
        + 'text. This is how you collect an answer after flykit_agent_send. A reason of "timeout" means the '
        + 'agent was still working — call again to keep waiting.',
      parameters: {
        id: { type: 'string', required: true },
        quietMs: { type: 'integer', description: 'Silence that counts as finished (default 1500).' },
        timeoutMs: { type: 'integer', description: 'Give up after this long (default 60000).' },
        maxChars: { type: 'integer', description: `Trim to the last N characters (default ${MAX_CHARS}).` },
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            text: { type: 'string', required: true },
            reason: { type: 'string', enum: ['quiet', 'timeout', 'aborted'], required: true },
            seq: { type: 'integer', required: true },
            exited: { type: 'integer' },
          },
          additionalProperties: false,
        },
        render: (_args: unknown, value: { text: string; reason: string }) =>
          [{ type: 'text' as const, text: `[${value.reason}]\n${value.text}` }],
      },
      async execute(args, exec) {
        const t = mine(exec, args.id)
        const { raw, reason } = await waitQuiet(t, args.quietMs ?? 1_500, args.timeoutMs ?? 60_000, exec.signal)
        const text = tail(await screenText(raw, COLS, ROWS), Math.max(200, args.maxChars ?? MAX_CHARS))
        return { text: text === '' ? '(silence)' : text, reason, seq: t.seq, ...t.exited === null ? {} : { exited: t.exited } }
      },
    }),

    defineTool({
      name: 'flykit_agent_list',
      description: 'List the agent terminals open in this session, running or exited.',
      parameters: {},
      output: {
        schema: { type: 'array', items: termValue },
        render: (_args: unknown, value: { id: string; agent: string; label: string; pid: number; exited?: number }[]) =>
          [{ type: 'text' as const, text: value.length === 0 ? 'No agent terminals open.' : value.map(describe).join('\n') }],
      },
      async execute(_args, exec) {
        const { id } = sessionOf(exec)
        return terms.list(id).map(i => ({ id: i.id, agent: i.agent, label: i.label, pid: i.pid, seq: i.seq, ...i.exited === null ? {} : { exited: i.exited } }))
      },
    }),

    defineTool({
      name: 'flykit_agent_stop',
      description: 'Kill an agent terminal and remove it from the panel.',
      parameters: { id: { type: 'string', required: true } },
      output: textOutput(),
      async execute(args, exec) {
        const t = mine(exec, args.id)
        terms.close(t.id)
        return { text: `Stopped ${t.name}.` }
      },
    }),

    defineTool({
      name: 'flykit_agent_run',
      description:
        'Ask claude, pi or codex one question in this workspace and return its answer. Headless: no terminal, no '
        + 'follow-up, nothing appears in the panel. Prefer this over start/send/wait whenever one prompt and '
        + 'one answer are enough. The sub-agent can read and edit files in this workspace.',
      parameters: {
        agent: { type: 'string', enum: ['claude', 'pi', 'codex'], required: true },
        prompt: { type: 'string', required: true, description: 'The whole task; the sub-agent sees nothing else.' },
        timeoutMs: { type: 'integer', description: 'Give up after this long (default 300000).' },
      },
      output: textOutput(),
      async execute(args, exec) {
        const { cwd } = sessionOf(exec)
        return { text: await runHeadless(args.agent, args.prompt, cwd, args.timeoutMs ?? 300_000, exec.signal) }
      },
    }),
  ]
}
