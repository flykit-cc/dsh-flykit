import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safePath } from './files.ts'

test('safePath keeps every read inside the workspace', () => {
  assert.equal(safePath('/ws', 'src/a.ts'), '/ws/src/a.ts')
  assert.equal(safePath('/ws', './src/../b.ts'), '/ws/b.ts')
  assert.equal(safePath('/ws', '../etc/passwd'), null)
  assert.equal(safePath('/ws', '/etc/passwd'), null)
  assert.equal(safePath('/ws', ''), null)
  assert.equal(safePath('/ws', '..'), null)
})
