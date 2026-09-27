import assert from 'node:assert/strict'
import test from 'node:test'
import { workspaceFromHash } from '../src/lib/workspace-view.ts'

test('workspace links support all three views and preserve the building fallback', () => {
  assert.equal(workspaceFromHash('#documentation'), 'documentation')
  assert.equal(workspaceFromHash('#apartment'), 'apartment')
  assert.equal(workspaceFromHash('#building'), 'building')
  assert.equal(workspaceFromHash(''), 'building')
  assert.equal(workspaceFromHash('#unknown'), 'building')
})
