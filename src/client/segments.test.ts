import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSegments, formatElapsed, ringToken } from './segments.ts'

const base = { running: false, tool: undefined, elapsedMs: null, git: undefined }

test('idle with no git', () => {
  assert.deepEqual(buildSegments(base), ['● idle'])
})

test('running with a tool names it and times it', () => {
  assert.deepEqual(buildSegments({ ...base, running: true, tool: 'Read', elapsedMs: 12_000 }), ['● running Read · 12s'])
})

test('running with no tool is thinking', () => {
  assert.deepEqual(buildSegments({ ...base, running: true, elapsedMs: 4_000 }), ['● thinking… · 4s'])
})

test('running with no turn start shows no timer', () => {
  assert.deepEqual(buildSegments({ ...base, running: true }), ['● thinking…'])
})

test('clean branch, then dirty branch', () => {
  assert.deepEqual(buildSegments({ ...base, git: { branch: 'main', dirty: 0 } }), ['● idle', 'main'])
  assert.deepEqual(buildSegments({ ...base, git: { branch: 'main', dirty: 3 } }), ['● idle', 'main *3'])
})

test('detached or absent git drops the segment', () => {
  assert.deepEqual(buildSegments({ ...base, git: { branch: null, dirty: 2 } }), ['● idle'])
  assert.deepEqual(buildSegments({ ...base, git: undefined }), ['● idle'])
})

test('formatElapsed', () => {
  assert.equal(formatElapsed(0), '0s')
  assert.equal(formatElapsed(59_999), '59s')
  assert.equal(formatElapsed(60_000), '1m00s')
  assert.equal(formatElapsed(65_000), '1m05s')
  assert.equal(formatElapsed(3_725_000), '62m05s')
})

test('ringToken thresholds', () => {
  assert.equal(ringToken(0), '--dsw-alias-state-success-primary')
  assert.equal(ringToken(59), '--dsw-alias-state-success-primary')
  assert.equal(ringToken(60), '--dsw-alias-state-warn-primary')
  assert.equal(ringToken(84), '--dsw-alias-state-warn-primary')
  assert.equal(ringToken(85), '--dsw-alias-state-error-primary')
  assert.equal(ringToken(null), null)
})
