import { test } from 'node:test'
import assert from 'node:assert/strict'
import { manifestFor } from '../lib/app-icon.js'

test('the dev host is named apart from the cloud one', () => {
  assert.equal(manifestFor('127.0.0.1:3080').name, 'flykit (local)')
  assert.equal(manifestFor('localhost:3080').name, 'flykit (local)')
  assert.equal(manifestFor('dsh.kaio.mp').name, 'flykit')
  assert.equal(manifestFor(undefined).name, 'flykit')
})
