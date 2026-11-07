import test from 'node:test'
import assert from 'node:assert/strict'
import { decideTool } from '../bridge/policy.mjs'

test('memory search and list are available in read-only mode', () => {
  assert.equal(decideTool('mcp__jarvis_memory__search', false), true)
  assert.equal(decideTool('mcp__jarvis_memory__list', false), true)
})

test('memory MCP mutations remain withheld until turn-scoped authorization exists', () => {
  for (const name of [
    'mcp__jarvis_memory__memory_save',
    'mcp__jarvis_memory__memory_update',
    'mcp__jarvis_memory__memory_delete',
  ]) {
    assert.equal(decideTool(name, false), false, name)
    assert.equal(decideTool(name, true), false, name)
  }
})

test('unknown memory tools do not become read-only by accident', () => {
  assert.equal(decideTool('mcp__jarvis_memory__unexpected_action', false), false)
})
