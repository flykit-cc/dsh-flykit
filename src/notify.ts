/**
 * The one answer detector, host-side, for every agent terminal.
 *
 * Every two seconds each terminal's character counter is folded into the
 * chime's detector (a dense burst, then silence; a status-line clock's trickle
 * still counts as silence). An answer bumps `answers`, which the panel polls to
 * ring. If an Enter is pending — the orchestrator's send or the user's
 * keyboard — the screen since that Enter also becomes ONE follow-up turn in the
 * DSH agent's inbox: a follow-up waits its turn, so an orchestrator in the
 * middle of other work finishes that first. Never a steer.
 */

import type { Context } from '@deepseek-ai/cordis'
// Type-only: declares `ctx.agents` on the host Context.
import type {} from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { step } from './answer-detect.js'
import * as terms from './terminals.js'
import { screenText, tail } from './term-io.js'

const POLL_MS = 2_000
const MAX_CHARS = 4_000

/** Tag the orchestrator's own words in a terminal, so the agent there knows who typed. */
export const ORCHESTRATOR_TAG = '[orchestrator]'

export function noteText(name: string, screen: string): string {
  return `[flykit-agent ${name}] finished.\n${screen === '' ? '(blank screen)' : screen}`
}

export function watchAnswers(ctx: Context, cols: number, rows: number): { arm: (t: terms.Term) => void; stop: () => void } {
  const deliver = async (t: terms.Term, from: number) => {
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
  }
  const timer = setInterval(() => {
    for (const t of terms.all()) {
      const answered = step(t.activity, t.seq) || (t.exited !== null && t.pending !== undefined)
      if (!answered) continue
      t.answers++
      const from = t.pending
      t.pending = undefined
      if (from !== undefined) void deliver(t, from)
    }
  }, POLL_MS)
  return {
    // Enter was just pressed, so the terminal has booted: the next dense burst is the answer.
    arm: t => { t.activity.armed = true; t.pending ??= t.seq },
    stop: () => clearInterval(timer),
  }
}
