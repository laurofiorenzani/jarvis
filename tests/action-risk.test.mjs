import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyToolRisk } from '../bridge/action-risk.mjs'

test('explicit read-only built-ins are classified as read', () => {
  for (const name of ['Read', 'Grep', 'WebSearch', 'BashOutput']) {
    assert.equal(classifyToolRisk(name).risk, 'read', name)
  }
})

test('MCP read verbs are classified as read', () => {
  assert.equal(classifyToolRisk('mcp__gmail__list_messages').risk, 'read')
  assert.equal(classifyToolRisk('mcp__calendar__get_event').risk, 'read')
})

test('effectful verbs require approval even when embedded in a tool name', () => {
  for (const name of [
    'mcp__gmail__send_message', 'mcp__drive__delete_file',
    'mcp__bank__transfer_funds', 'mcp__browser__click',
    'mcp__deploy__publish_release',
  ]) assert.equal(classifyToolRisk(name).risk, 'approval_required', name)
})

test('unknown tools fail closed into approval-required', () => {
  assert.equal(classifyToolRisk('mcp__unknown__do_magic').risk, 'approval_required')
  assert.equal(classifyToolRisk('SomeNewTool').risk, 'approval_required')
})

test('invalid and explicitly prohibited tool names are denied', () => {
  assert.equal(classifyToolRisk('').risk, 'deny')
  assert.equal(classifyToolRisk('bad tool name').risk, 'deny')
  assert.equal(classifyToolRisk('mcp__x__exfiltrate_secrets').risk, 'deny')
})

test('routine pre-authorisation cannot be asserted through classifier input', () => {
  assert.equal(classifyToolRisk('mcp__lights__turn_on', { preAuthorization: { matched: true } }).risk, 'approval_required')
})

test('MCP tools cannot impersonate trusted built-in read tools', () => {
  assert.equal(classifyToolRisk('mcp__untrusted__Read').risk, 'approval_required')
})
