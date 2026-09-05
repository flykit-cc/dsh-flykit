import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parsePorcelain } from './git.ts'

test('branch and dirty count from a normal working tree', () => {
  const stdout = [
    '# branch.oid 8f2b8d9e27691dbed7afd89ed6fb43124490ce90',
    '# branch.head main',
    '# branch.upstream origin/main',
    '# branch.ab +4 -0',
    '1 .M N... 100644 100644 100644 abc abc src/index.ts',
    '2 R. N... 100644 100644 100644 def def R100 lib/new.ts\tlib/old.ts',
    '? scratch.txt',
    '',
  ].join('\n')
  assert.deepEqual(parsePorcelain(stdout), { branch: 'main', dirty: 3 })
})

test('detached HEAD has no branch', () => {
  assert.deepEqual(parsePorcelain('# branch.oid abc\n# branch.head (detached)\n'), { branch: null, dirty: 0 })
})

test('empty output', () => {
  assert.deepEqual(parsePorcelain(''), { branch: null, dirty: 0 })
})
