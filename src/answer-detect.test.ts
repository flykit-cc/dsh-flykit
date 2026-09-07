import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { newActivity, step, ANSWER_MIN_CHARS, IDLE_MAX_CHARS, QUIET_POLLS } from './answer-detect.ts'

/** Feed a run of poll readings and collect the polls that reported an answer. */
function run(seqs: number[]): number[] {
  const a = newActivity(0)
  const hits: number[] = []
  seqs.forEach((s, i) => { if (step(a, s)) hits.push(i) })
  return hits
}

/** A burst of `chars` delivered in one poll, then `n` polls of silence. */
function burstThenQuiet(from: number, chars: number, n: number): number[] {
  return [from + chars, ...Array<number>(n).fill(from + chars)]
}

test('the startup draw arms the detector but does not ring', () => {
  assert.deepEqual(run(burstThenQuiet(0, 900, 3)), [])
})

test('a terminal first seen with history is armed: its next answer rings', () => {
  // Page reload, or a poll that first lists a terminal after its startup draw.
  const a = newActivity(5_000)
  const hits = burstThenQuiet(5_000, 500, 3).filter(s => step(a, s))
  assert.equal(hits.length, 1)
})

test('an answer after startup rings exactly once', () => {
  const seqs = [...burstThenQuiet(0, 900, 3), ...burstThenQuiet(900, 500, 4)]
  assert.equal(run(seqs).length, 1)
})

test('silence alone never rings again, however long it lasts', () => {
  const seqs = [...burstThenQuiet(0, 900, 3), ...burstThenQuiet(900, 500, 30)]
  assert.equal(run(seqs).length, 1)
})

test('an idle trickle never rings, however long it runs', () => {
  // 10 characters per poll with a pause every third poll: the old accumulator
  // crossed 200 after ~20 polls and then rang at every pause, for ever.
  const seqs: number[] = []
  let seq = 0
  for (let i = 0; i < 200; i++) {
    seq += i % 3 === 2 ? 0 : 10
    seqs.push(seq)
  }
  assert.deepEqual(run(seqs), [])
})

test('a clock in the status line redraws every poll; that is still quiet', () => {
  // Measured on Claude Code with a ttl countdown: ~160 chars per 2s poll, for ever.
  const tick = IDLE_MAX_CHARS - 1
  const seqs: number[] = []
  let seq = 0
  const push = (n: number) => { seq += n; seqs.push(seq) }
  for (let i = 0; i < 5; i++) push(tick)            // startup already settled; idle
  push(1_800); push(2_900); push(600)               // working, then the answer lands
  for (let i = 0; i < 40; i++) push(tick)           // idle again, clock ticking
  const a = newActivity(5_000)
  const hits = seqs.filter(s => step(a, s))
  assert.equal(hits.length, 1)
})

test('two answers ring twice', () => {
  const seqs = [
    ...burstThenQuiet(0, 900, 3),
    ...burstThenQuiet(900, 400, 3),
    ...burstThenQuiet(1300, 400, 3),
  ]
  assert.equal(run(seqs).length, 2)
})

test('a burst under the threshold is not an answer', () => {
  const seqs = [...burstThenQuiet(0, 900, 3), ...burstThenQuiet(900, ANSWER_MIN_CHARS - 1, 3)]
  assert.deepEqual(run(seqs), [])
})

test('nothing is decided until the output has been silent for QUIET_POLLS', () => {
  const a = newActivity(0)
  step(a, 900)
  for (let i = 1; i < QUIET_POLLS; i++) {
    step(a, 900)
    assert.equal(a.armed, false, `still undecided after ${i} silent poll(s)`)
    assert.equal(a.burst, 900, 'the burst is still held')
  }
  step(a, 900)
  assert.equal(a.armed, true, 'the window closed, so the startup draw is done')
  assert.equal(a.burst, 0, 'and the burst is spent')
})

test('a burst marked discard (a resize redraw) settles without ringing; the next answer still rings', () => {
  const a = newActivity(1_000)                       // armed from history
  a.discard = true
  assert.deepEqual(burstThenQuiet(1_000, 1_400, 3).filter(s => step(a, s)), [])
  assert.equal(a.discard, false)
  assert.equal(burstThenQuiet(2_400, 900, 3).filter(s => step(a, s)).length, 1)
})
