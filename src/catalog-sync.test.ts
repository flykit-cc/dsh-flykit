import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TARGETS, discover, entryFor, extraTargets, fromOpenRouter, type CatalogTarget } from './catalog-sync.ts'

const deepseek = TARGETS.find(t => t.ns === 'llm-deepseek')!
const openrouter = TARGETS.find(t => t.path[1] === 'openrouter')!

test('fromOpenRouter shapes a record into the adapter profile', () => {
  const p = fromOpenRouter({
    id: 'x/y', name: 'X Y', context_length: 1000, top_provider: { max_completion_tokens: 5000 },
    architecture: { input_modalities: ['text', 'image', 'audio'] }, supported_parameters: ['reasoning'],
  })
  assert.deepEqual(p, { id: 'x/y', name: 'X Y', contextWindow: 1000, maxTokens: 1000, input: ['text', 'image'] })
  const q = fromOpenRouter({ id: 'a/b', name: 'A B' })
  assert.deepEqual(q, { id: 'a/b', name: 'A B', contextWindow: 32768, maxTokens: 8192, input: ['text'] })
})

test('fromOpenRouter degrades an ids-only listing to a text model', () => {
  // A plain OpenAI-compatible /models record carries no name and no capacities,
  // which is the whole reason this shaper doubles as the generic one.
  const p = fromOpenRouter({ id: 'gpt-x', object: 'model', owned_by: 'someone' } as never)
  assert.deepEqual(p, { id: 'gpt-x', name: 'gpt-x', contextWindow: 32768, maxTokens: 8192, input: ['text'] })
})

test('discover drops unusable records and keeps the rest sorted', () => {
  const raw = [{ id: 'b' }, { id: '' }, { noId: true }, null, 'nope', { id: 'a' }]
  assert.deepEqual(discover(raw, deepseek).map(m => m.id), ['a', 'b'])
})

test('discover applies metadata the DeepSeek listing withholds', () => {
  const found = new Map(discover([{ id: 'deepseek-flash' }, { id: 'deepseek-v4-pro' }], deepseek).map(m => [m.id, m]))
  assert.deepEqual(found.get('deepseek-flash'), { id: 'deepseek-flash', name: 'DeepSeek-V4.1-Flash', input: ['text', 'image'] })
  assert.deepEqual(found.get('deepseek-v4-pro'), { id: 'deepseek-v4-pro', name: 'DeepSeek-V4-Pro-0813', input: ['text'] })
})

test('discover leaves an unrecognised model bare rather than inventing metadata', () => {
  assert.deepEqual(discover([{ id: 'deepseek-v9' }], deepseek), [{ id: 'deepseek-v9' }])
})

test('entryFor always fills the fields pi-ai cannot fall back on', () => {
  // pi-ai's listModels spreads `model.input` unguarded, so every field here has
  // to be present, and maxTokens can never exceed the context window.
  assert.deepEqual(entryFor(openrouter, { id: 'a/b' }), {
    id: 'a/b', name: 'a/b', contextWindow: 32768, maxTokens: 8192, input: ['text'],
  })
  assert.deepEqual(entryFor(openrouter, { id: 'c/d', name: 'C', contextWindow: 100, maxTokens: 9000, input: ['image'] }), {
    id: 'c/d', name: 'C', contextWindow: 100, maxTokens: 100, input: ['image'],
  })
})

test('entryFor writes the DeepSeek adapter\'s thin entry and its own field name', () => {
  assert.deepEqual(entryFor(deepseek, { id: 'deepseek-v9' }), { id: 'deepseek-v9' })
  assert.deepEqual(entryFor(deepseek, discover([{ id: 'deepseek-flash' }], deepseek)[0]!), {
    id: 'deepseek-flash', name: 'DeepSeek-V4.1-Flash', inputModalities: ['text', 'image'],
  })
})

test('extraTargets picks up a provider that names its own endpoint', () => {
  const section = { providers: {
    openrouter: { apiKeyEnv: 'OPENROUTER_API_KEY' },                                  // already an explicit row
    gateway: { baseURL: 'https://gw.example/v1', api: 'openai-completions', apiKeyEnv: 'GW_KEY' },
    bare: { baseURL: 'https://bare.example/v1' },                                     // unnamed protocol is worth a try
    qwen: { baseURL: 'https://qwen.example/anthropic', api: 'anthropic-messages' },   // cannot be listed
    nolink: { api: 'openai-completions' },                                            // nothing to call
  } }
  assert.deepEqual(extraTargets(section).map(t => t.label), ['gateway', 'bare'])
  assert.deepEqual(extraTargets(section)[0]!.path, ['providers', 'gateway', 'models'])
  assert.equal(extraTargets(section)[0]!.defaultBaseURL, 'https://gw.example/v1')
  assert.equal(extraTargets(section)[1]!.defaultApiKeyEnv, '')
})

test('extraTargets survives a section that is not shaped like one', () => {
  for (const section of [undefined, null, {}, { providers: null }, { providers: [] as unknown as Record<string, unknown> }]) {
    assert.deepEqual(extraTargets(section), [])
  }
})

test('every target carries a usable floor and path', () => {
  const all = [...TARGETS, ...extraTargets({ providers: { g: { baseURL: 'https://g/v1' } } })] as CatalogTarget[]
  for (const t of all) {
    assert.ok(t.floor >= 1, `${t.label} floor`)
    assert.ok(t.path.length > 0, `${t.label} path`)
  }
})
