import { test } from 'node:test'
// Imports the build: notify.ts reaches its neighbours by their .js names, which node's source runner cannot follow.
import assert from 'node:assert/strict'
import { notifier, noteText } from '../lib/notify.js'
import * as terms from '../lib/terminals.js'

test('one Enter, one dense answer, one follow-up in the orchestrator queue', async t => {
  t.mock.timers.enable({ apis: ['setInterval', 'Date'] })
  const delivered: string[] = []
  const ctx = {
    agents: { get: () => ({ followup: (m: { content: { text: string }[] }) => delivered.push(m.content[0]!.text) }) },
    logger: { warn: () => {} },
  }
  const term = terms.open('s1', process.cwd(), 'shell', 80, 24)!
  try {
    const arm = notifier(ctx as never, 80, 24)
    arm(term)
    arm(term)                                        // second Enter while armed: no second watcher
    term.pty.write(`printf '%s\\n' $(seq 1 300)\r`)  // a dense burst, then the prompt waits
    await new Promise(r => setImmediate(r))
    for (let i = 0; i < 60 && delivered.length === 0; i++) {
      await new Promise(r => setTimeout(r, 200))     // real wait for the shell; mocked clock for the poll
      t.mock.timers.tick(2_000)
      await new Promise(r => setImmediate(r))
    }
    assert.equal(delivered.length, 1)
    assert.match(delivered[0]!, /^\[flykit-agent Shell\] finished\./)
    assert.match(delivered[0]!, /300/)
  } finally {
    terms.close(term.id)
  }
})

test('noteText names the agent and never sends an empty body', () => {
  assert.equal(noteText('Pi', ''), '[flykit-agent Pi] finished.\n(blank screen)')
})
