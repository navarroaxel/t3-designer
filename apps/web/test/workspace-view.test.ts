import assert from 'node:assert/strict'
import test from 'node:test'
import { workspaceFromHash } from '../src/lib/workspace-view.ts'

test('the house is the default workspace, including for stale links', () => {
  assert.equal(workspaceFromHash('#building'), 'building')
  assert.equal(workspaceFromHash(''), 'building')
  assert.equal(workspaceFromHash('#unknown'), 'building')
  assert.equal(workspaceFromHash('#documentation'), 'building')
})

test('the apartment and its walkthrough have their own links', () => {
  assert.equal(workspaceFromHash('#apartment'), 'apartment')
  assert.equal(workspaceFromHash('#walkthrough'), 'walkthrough')
})

test('the generation figures have their own link, apart from the 3D view', () => {
  assert.equal(workspaceFromHash('#generation'), 'generation')
})
