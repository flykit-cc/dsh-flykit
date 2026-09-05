import { test } from 'node:test'
import assert from 'node:assert/strict'
import { screenText, stripAnsi, waitQuiet } from './term-io.ts'

const ESC = String.fromCharCode(27)
const BEL = String.fromCharCode(7)

test('stripAnsi removes colour, cursor moves, OSC titles and stray controls', () => {
  assert.equal(stripAnsi(`${ESC}[31mred${ESC}[0m`), 'red')
  assert.equal(stripAnsi(`${ESC}[2J${ESC}[1;1Hhome`), 'home')
  assert.equal(stripAnsi(`${ESC}]0;a title${BEL}after`), 'after')
  assert.equal(stripAnsi(`${ESC}]0;a title${ESC}\\after`), 'after')
  assert.equal(stripAnsi(`${ESC}(Bplain`), 'plain')
  assert.equal(stripAnsi(`a${String.fromCharCode(0)}b${String.fromCharCode(8)}`), 'ab')
  assert.equal(stripAnsi('keep\ttabs\nand\r\nnewlines'), 'keep\ttabs\nand\r\nnewlines')
})

test('screenText renders what the screen would show, not the byte stream', async () => {
  assert.equal(await screenText(`${ESC}[31mred${ESC}[0m`), 'red')
  assert.equal(await screenText('one\r\ntwo\r\n'), 'one\ntwo')
  // A spinner overwrites its own line; only the last frame is on screen.
  assert.equal(await screenText(`| working\r${ESC}[2K/ working\r${ESC}[2K- done`), '- done')
  // Absolute cursor motion, which a textual stripper turns into one smear.
  assert.equal(await screenText(`${ESC}[2J${ESC}[3;1Hthird row${ESC}[1;1Hfirst row`), 'first row\n\nthird row')
  assert.equal(await screenText('a\r\n\r\n\r\n\r\n\r\nb'), 'a\n\nb')
  assert.equal(await screenText('trailing   \r\n'), 'trailing')
})

/** A Term as waitQuiet sees it, without node-pty. */
function fakeTerm() {
  const listeners = new Set<(chunk: string) => void>()
  return { listeners, emit: (c: string) => { for (const l of listeners) l(c) } }
}

test('waitQuiet returns once output pauses, and unsubscribes', async () => {
  const t = fakeTerm()
  const wait = waitQuiet(t, 40, 5_000)
  setTimeout(() => t.emit('hel'), 10)
  setTimeout(() => t.emit('lo'), 30)
  const { raw, reason } = await wait
  assert.equal(raw, 'hello')
  assert.equal(reason, 'quiet')
  assert.equal(t.listeners.size, 0)
})

test('waitQuiet gives up at the timeout while output keeps coming', async () => {
  const t = fakeTerm()
  const chatter = setInterval(() => t.emit('.'), 10)
  const { raw, reason } = await waitQuiet(t, 500, 60)
  clearInterval(chatter)
  assert.equal(reason, 'timeout')
  assert.ok(raw.length > 0)
  assert.equal(t.listeners.size, 0)
})

test('waitQuiet settles on a silent terminal instead of waiting for the timeout', async () => {
  const t = fakeTerm()
  const started = Date.now()
  const { raw, reason } = await waitQuiet(t, 20, 10_000)
  assert.equal(raw, '')
  assert.equal(reason, 'quiet')
  assert.ok(Date.now() - started < 5_000)
})
