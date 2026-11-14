import assert from 'node:assert/strict'
import { test } from 'node:test'
import { executeReadOnlyAgentTasks, type ReadOnlyAgentTask } from '../src/lib/agent-task-executor.ts'
import type { AgentDefinition, AgentResultEnvelope } from '../src/lib/agent-contract.ts'

const agent: AgentDefinition = {
  contractVersion: 1, id: 'research.public', version: '1.0.0',
  taskTypes: ['public_research'], capabilities: ['research.public'],
  tools: ['web_research'], memoryScopes: ['conversation.current'],
  providerClass: 'free_only', approvalMode: 'never_write',
  limits: { maxRuntimeMs: 100, maxCalls: 2, maxRetries: 0, maxOutputBytes: 2048 },
}
const task = (id: string, dependsOn: string[] = []): ReadOnlyAgentTask => ({
  id, agentId: agent.id, capability: 'research.public', dependsOn, input: { query: id },
})
function envelope(value: Partial<AgentResultEnvelope> = {}): AgentResultEnvelope {
  return {
    contractVersion: 1, taskId: 'task-a', agentId: agent.id, agentVersion: agent.version,
    status: 'succeeded', result: { summary: 'done' }, evidence: [], assumptions: [],
    unresolved: [], confidence: 'medium', actions: [], approvalRequired: false,
    ...value,
  }
}
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

test('executes independent tasks concurrently within the planned wave', async () => {
  let active = 0
  let maximum = 0
  const results = await executeReadOnlyAgentTasks([task('task-a'), task('task-b')], [agent], async (_a, t) => {
    active += 1
    maximum = Math.max(maximum, active)
    await delay(10)
    active -= 1
    return envelope({ taskId: t.id })
  })
  assert.equal(maximum, 2)
  assert.deepEqual(results.map((r) => r.status), ['succeeded', 'succeeded'])
})

test('waits for dependencies and skips descendants after an upstream failure', async () => {
  const called: string[] = []
  const results = await executeReadOnlyAgentTasks(
    [task('task-c', ['task-b']), task('task-b', ['task-a']), task('task-a')],
    [agent],
    async (_a, t) => {
      called.push(t.id)
      if (t.id === 'task-a') throw new Error('private handler detail')
      return envelope({ taskId: t.id })
    },
    { limits: { maxTasks: 8, maxFanOut: 4, maxDepth: 3 } },
  )
  assert.deepEqual(called, ['task-a'])
  assert.equal(results[0].status, 'cancelled')
  assert.equal(results[0].reason, 'dependency_failed')
  assert.equal(results[2].status, 'failed')
  assert.deepEqual(results[2].envelope?.unresolved, ['Agent handler failed; error details were redacted.'])
})

test('denies missing agents and capabilities before invoking the handler', async () => {
  let calls = 0
  const noAgent = await executeReadOnlyAgentTasks([task('task-a')], [], async () => { calls++; return null })
  const noCapability = await executeReadOnlyAgentTasks(
    [{ ...task('task-a'), capability: 'finance.read' }],
    [agent],
    async () => { calls++; return null },
  )
  assert.equal(noAgent[0].reason, 'agent_unavailable')
  assert.equal(noCapability[0].reason, 'capability_denied')
  assert.equal(calls, 0)
})

test('rejects mismatched, approval-gated and oversized result envelopes', async () => {
  const mismatch = await executeReadOnlyAgentTasks([task('task-a')], [agent], async () => envelope({ taskId: 'other' }))
  const approval = await executeReadOnlyAgentTasks([task('task-a')], [agent], async () => envelope({ taskId: 'task-a', approvalRequired: true }))
  const largeAgent = { ...agent, limits: { ...agent.limits, maxOutputBytes: 128 } }
  const oversized = await executeReadOnlyAgentTasks([task('task-a')], [largeAgent], async () => envelope({ taskId: 'task-a', result: { text: 'x'.repeat(500) } }))
  assert.equal(mismatch[0].reason, 'invalid_result')
  assert.equal(approval[0].reason, 'invalid_result')
  assert.equal(oversized[0].reason, 'output_limit')
})

test('aborts an agent at its declared runtime deadline', async () => {
  const shortAgent = { ...agent, limits: { ...agent.limits, maxRuntimeMs: 100 } }
  const results = await executeReadOnlyAgentTasks([task('task-a')], [shortAgent], async () => new Promise(() => undefined))
  assert.equal(results[0].reason, 'timeout')
  assert.equal(results[0].status, 'failed')
})

test('does not dispatch tasks after caller cancellation', async () => {
  const controller = new AbortController()
  controller.abort()
  let calls = 0
  const results = await executeReadOnlyAgentTasks([task('task-a')], [agent], async () => { calls++; return envelope() }, { signal: controller.signal })
  assert.equal(calls, 0)
  assert.equal(results[0].reason, 'aborted')
  assert.equal(results[0].status, 'cancelled')
})

test('enforces the declared per-task tool-call budget', async () => {
  const results = await executeReadOnlyAgentTasks([task('task-a')], [agent], async (_a, _t, context) => {
    context.consumeCall()
    context.consumeCall()
    context.consumeCall()
    return envelope({ taskId: 'task-a' })
  })
  assert.equal(results[0].reason, 'call_limit')
  assert.equal(results[0].status, 'failed')
})

test('rejects write-capability actions even when the agent contract lists them', async () => {
  const writeAgent = {
    ...agent,
    capabilities: ['research.public', 'memory.propose'] as AgentDefinition['capabilities'],
  }
  const results = await executeReadOnlyAgentTasks([task('task-a')], [writeAgent], async () =>
    envelope({ taskId: 'task-a', actions: [{ capability: 'memory.propose', outcome: 'succeeded' }] }),
  )
  assert.equal(results[0].reason, 'invalid_result')
})
