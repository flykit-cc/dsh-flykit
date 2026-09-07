/**
 * Push a finished answer to the DSH agent instead of making it poll.
 *
 * Armed by an Enter in an agent terminal — the orchestrator's send or the
 * user's keyboard. The terminal's character counter is then polled with the
 * chime's detector (a dense burst, then silence; a status-line clock's trickle
 * still counts as silence). The first answer becomes ONE follow-up turn in the
 * orchestrator's inbox: a follow-up waits its turn, so an orchestrator in the
 * middle of other work finishes that first. Never a steer.
 */

import type { Context } from '@deepseek-ai/cordis'
// Type-only: declares `ctx.agents` on the host Context.
import type {} from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { newActivity, step } from './answer-detect.js'
import * as terms from './terminals.js'
import { screenText, tail } from './term-io.js'

const POLL_MS = 2_000
const MAX_CHARS = 4_000
// ponytail: a watcher that never sees an answer gives up after this; make it a setting if a task ever runs longer.
const GIVE_UP_MS = 4 * 60 * 60 * 1_000

/** Tag the orchestrator's own words in a terminal, so the agent there knows who typed. */
export const ORCHESTRATOR_TAG = '[orchestrator]'

export function noteText(name: string, screen: string): string {
  return `[flykit-agent ${name}] finished.\n${screen === '' ? '(blank screen)' : screen}`
}

/** One watcher per terminal; a second Enter while one runs just extends it. */
export function notifier(ctx: Context, cols: number, rows: number): (t: terms.Term) => void {
  const watching = new Set<string>()
  return t => {
    if (watching.has(t.id)) return
    watching.add(t.id)
    const from = t.seq
    // Enter was just pressed, so the terminal has booted: the next dense burst is the answer.
    const a = { ...newActivity(t.seq), armed: true }
    const until = Date.now() + GIVE_UP_MS
    const timer = setInterval(async () => {
      const gone = terms.get(t.id) !== t || Date.now() > until
      const done = t.exited !== null
      if (!gone && !done && !step(a, t.seq)) return
      clearInterval(timer)
      watching.delete(t.id)
      if (gone) return
      const agent = ctx.agents?.get(t.sessionId as SessionId)
      if (agent === undefined) return
      const screen = tail(await screenText(terms.since(t, from), cols, rows), MAX_CHARS)
      try {
        agent.followup(createUserMessage({
          content: [{ type: 'text', text: noteText(t.name, screen) }],
          source: { kind: 'plugin', plugin: 'flykit', form: 'notice', summary: `${t.name} finished` },
        }))
      } catch (e) {
        ctx.logger.warn(`flykit: answer from ${t.name} was not delivered: ${e instanceof Error ? e.message : String(e)}`)
      }
    }, POLL_MS)
  }
}
