import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { tabLabels } from './docs.ts'

test('a unique file name stands alone', () => {
  assert.equal(tabLabels(['src/index.ts', 'README.md']).get('src/index.ts'), 'index.ts')
})

test('a shared file name gains its parent folder', () => {
  const l = tabLabels(['src/index.ts', 'src/client/index.ts'])
  assert.equal(l.get('src/index.ts'), 'src/index.ts')
  assert.equal(l.get('src/client/index.ts'), 'client/index.ts')
})

test('a shared name at the workspace root is marked as the root one', () => {
  const l = tabLabels(['index.ts', 'src/index.ts'])
  assert.equal(l.get('index.ts'), './index.ts')
  assert.equal(l.get('src/index.ts'), 'src/index.ts')
})
