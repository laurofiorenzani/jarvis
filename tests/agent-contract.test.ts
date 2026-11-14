import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  isAgentResultEnvelope,
  parseAgentDefinition,
  type AgentDefinition,
} from '../src/lib/agent-contract.ts'

const validAgent: AgentDefinition = {
  contractVersion: 1,
  id: 'research.public',
  version: '1.0.0',
  taskTypes: ['public_research'],
  capabilities: ['research.public'],
  tools: ['web_research'],
  memoryScopes: ['conversation.current'],
  providerClass: 'free_only',
  approvalMode: 'never_write',
  limits: {
    maxRuntimeMs: 30_000,
    maxCalls: 4,
    maxRetries: 1,
    maxOutputBytes: 8_192,
  },
}

test('parses a bounded read-only agent definition', () => {
  assert.deepEqual(parseAgentDefinition(validAgent), validAgent)
})

test('rejects unknown capabilities, tools and memory scopes', () => {
  assert.equal(parseAgentDefinition({ ...validAgent, capabilities: ['admin.root'] }), null)
  assert.equal(parseAgentDefinition({ ...validAgent, tools: ['shell'] }), null)
  assert.equal(parseAgentDefinition({ ...validAgent, memoryScopes: ['all_users'] }), null)
})

test('rejects invalid identity, duplicate entries and unbounded limits', () => {
  assert.equal(parseAgentDefinition({ ...validAgent, id: '../other-user' }), null)
  assert.equal(parseAgentDefinition({ ...validAgent, tools: ['web_research', 'web_research'] }), null)
  assert.equal(parseAgentDefinition({ ...validAgent, limits: { ...validAgent.limits, maxCalls: 999 } }), null)
  assert.equal(parseAgentDefinition({ ...validAgent, limits: { ...validAgent.limits, maxRetries: 3 } }), null)
})

test('requires approval mode for code-writing capability', () => {
  assert.equal(parseAgentDefinition({
    ...validAgent,
    capabilities: ['code.branch.write'],
    tools: ['github_branch'],
  }), null)
  assert.notEqual(parseAgentDefinition({
    ...validAgent,
    capabilities: ['code.branch.write'],
    tools: ['github_branch'],
    approvalMode: 'approval_required',
  }), null)
})

test('validates evidence-bearing result envelopes', () => {
  const envelope = {
    contractVersion: 1,
    taskId: 'task-123',
    agentId: 'research.public',
    agentVersion: '1.0.0',
    status: 'succeeded',
    result: { summary: 'Two sources reviewed' },
    evidence: [{ kind: 'web', reference: 'https://example.invalid/source', observedAt: '2026-11-14T10:00:00.000Z' }],
    assumptions: [],
    unresolved: [],
    confidence: 'medium',
    actions: [{ capability: 'research.public', outcome: 'succeeded' }],
    approvalRequired: false,
  }
  assert.equal(isAgentResultEnvelope(envelope), true)
  assert.equal(isAgentResultEnvelope({ ...envelope, evidence: [{ ...envelope.evidence[0], observedAt: 'not-a-date' }] }), false)
  assert.equal(isAgentResultEnvelope({ ...envelope, actions: [{ capability: 'x', outcome: 'succeeded', detail: 'x'.repeat(501) }] }), false)
  assert.equal(isAgentResultEnvelope({ ...envelope, evidence: new Array(33).fill(envelope.evidence[0]) }), false)
})
