import assert from 'node:assert/strict'
import test from 'node:test'
import { workspaceFromHash } from '../src/lib/workspace-view.ts'

test('the only workspace is the building view, including for stale links', () => {
  assert.equal(workspaceFromHash('#building'), 'building')
  assert.equal(workspaceFromHash(''), 'building')
  assert.equal(workspaceFromHash('#unknown'), 'building')
  assert.equal(workspaceFromHash('#apartment'), 'building')
  assert.equal(workspaceFromHash('#documentation'), 'building')
})
