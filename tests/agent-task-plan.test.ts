import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildReadOnlyTaskPlan, type AgentTaskNode } from '../src/lib/agent-task-plan.ts'

const node = (id: string, dependsOn: string[] = []): AgentTaskNode => ({
  id, agentId: 'research.public', capability: 'research.public', dependsOn,
})

test('plans independent read-only tasks in one deterministic wave', () => {
  const plan = buildReadOnlyTaskPlan([node('second'), node('first')])
  assert.deepEqual(plan, { waves: [['first', 'second']], taskCount: 2, maxDepth: 1 })
})

test('orders dependent tasks into sequential waves', () => {
  const plan = buildReadOnlyTaskPlan([node('final', ['middle']), node('middle', ['start']), node('start')])
  assert.deepEqual(plan?.waves, [['start'], ['middle'], ['final']])
})

test('rejects cycles, missing dependencies and self-dependencies', () => {
  assert.equal(buildReadOnlyTaskPlan([node('a', ['b']), node('b', ['a'])]), null)
  assert.equal(buildReadOnlyTaskPlan([node('a', ['missing'])]), null)
  assert.equal(buildReadOnlyTaskPlan([node('a', ['a'])]), null)
})

test('rejects duplicate IDs, unsafe IDs and duplicate dependencies', () => {
  assert.equal(buildReadOnlyTaskPlan([node('same'), node('same')]), null)
  assert.equal(buildReadOnlyTaskPlan([node('../other')]), null)
  assert.equal(buildReadOnlyTaskPlan([node('a', ['b', 'b']), node('b')]), null)
})

test('rejects writes and capabilities outside the read-only allowlist', () => {
  assert.equal(buildReadOnlyTaskPlan([{ ...node('write'), capability: 'code.branch.write' }]), null)
  assert.equal(buildReadOnlyTaskPlan([{ ...node('admin'), capability: 'admin.root' }]), null)
})

test('enforces task count, fan-out and depth budgets', () => {
  assert.equal(buildReadOnlyTaskPlan([node('a'), node('b')], { maxTasks: 1, maxFanOut: 4, maxDepth: 2 }), null)
  assert.equal(buildReadOnlyTaskPlan([node('a'), node('b')], { maxTasks: 4, maxFanOut: 1, maxDepth: 2 }), null)
  assert.equal(buildReadOnlyTaskPlan([node('a'), node('b', ['a']), node('c', ['b'])],
    { maxTasks: 4, maxFanOut: 2, maxDepth: 2 }), null)
})

test('rejects malformed limits and malformed nodes', () => {
  assert.equal(buildReadOnlyTaskPlan([node('a')], { maxTasks: 0, maxFanOut: 1, maxDepth: 1 }), null)
  assert.equal(buildReadOnlyTaskPlan([{ ...node('a'), dependsOn: 'not-an-array' }]), null)
})
