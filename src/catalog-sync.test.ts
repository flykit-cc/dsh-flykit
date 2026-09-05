import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fromOpenRouter } from './catalog-sync.ts'

test('fromOpenRouter shapes a record into the adapter profile', () => {
  const p = fromOpenRouter({
    id: 'x/y', name: 'X Y', context_length: 1000, top_provider: { max_completion_tokens: 5000 },
    architecture: { input_modalities: ['text', 'image', 'audio'] }, supported_parameters: ['reasoning'],
  })
  assert.deepEqual(p, { id: 'x/y', name: 'X Y', contextWindow: 1000, maxTokens: 1000, input: ['text', 'image'], reasoningEfforts: { off: null, low: 'low', medium: 'medium', high: 'high' } })
  const q = fromOpenRouter({ id: 'a/b', name: 'A B' })
  assert.deepEqual(q, { id: 'a/b', name: 'A B', contextWindow: 32768, maxTokens: 8192, input: ['text'] })
})
