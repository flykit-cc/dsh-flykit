import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSegments, formatK } from './segments.ts'

const usage = { uncachedInputTokens: 1200, outputTokens: 800, cacheReadTokens: 300, cacheWriteTokens: 100 }
const base = { running: false, streaming: false, tool: undefined, model: undefined, usage: undefined, pressure: undefined }

test('idle with nothing else known', () => {
  assert.deepEqual(buildSegments(base), ['● idle'])
})

test('running with a tool names the first tool', () => {
  assert.deepEqual(buildSegments({ ...base, running: true, tool: 'Read' }), ['● running Read'])
})

test('running while streaming and no tool is thinking', () => {
  assert.deepEqual(buildSegments({ ...base, running: true, streaming: true }), ['● thinking…'])
})

test('running with nothing streaming yet is still thinking', () => {
  assert.deepEqual(buildSegments({ ...base, running: true }), ['● thinking…'])
})

test('model and tokens and context', () => {
  assert.deepEqual(
    buildSegments({ ...base, model: { provider: 'deepseek', model: 'deepseek-v4' }, usage, pressure: { projectedTokens: 32000, contextWindow: 128000 } }),
    ['● idle', 'deepseek/deepseek-v4', '1.5k in / 800 out', 'ctx 25%'],
  )
})

test('undefined projections drop their segment; null model too', () => {
  assert.deepEqual(buildSegments({ ...base, model: null, usage: undefined, pressure: { contextWindow: 128000 } }), ['● idle'])
})

test('zero tokens drops the token segment', () => {
  assert.deepEqual(buildSegments({ ...base, usage: { uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 } }), ['● idle'])
})

test('formatK', () => {
  assert.equal(formatK(999), '999')
  assert.equal(formatK(1000), '1.0k')
  assert.equal(formatK(1500), '1.5k')
  assert.equal(formatK(12345), '12.3k')
  assert.equal(formatK(1_200_000), '1.2M')
})
