/**
 * Deterministic, read-only task graph validation for the JARVIS orchestrator.
 * This module plans eligible work only; it never dispatches agents or tools.
 */
import type { AgentCapability } from './agent-contract.ts'

export type AgentTaskNode = {
  id: string
  agentId: string
  capability: AgentCapability
  dependsOn: readonly string[]
}

export type AgentTaskPlan = {
  waves: readonly (readonly string[])[]
  taskCount: number
  maxDepth: number
}

export type TaskPlanLimits = {
  maxTasks: number
  maxFanOut: number
  maxDepth: number
}

const ALLOWED_READ_CAPABILITIES = new Set<AgentCapability>([
  'conversation.read', 'memory.read', 'calendar.read', 'finance.read',
  'vehicle.telemetry.read', 'smart_home.read', 'communications.read',
  'research.public', 'tests.run',
])

/**
 * Returns null for malformed, cyclic, over-budget or non-read-only graphs.
 * A wave contains tasks whose dependencies were completed in prior waves.
 */
export function buildReadOnlyTaskPlan(
  input: unknown,
  limits: TaskPlanLimits = { maxTasks: 8, maxFanOut: 4, maxDepth: 2 },
): AgentTaskPlan | null {
  if (!Array.isArray(input) || input.length === 0 ||
      !Number.isSafeInteger(limits.maxTasks) || limits.maxTasks < 1 ||
      !Number.isSafeInteger(limits.maxFanOut) || limits.maxFanOut < 1 ||
      !Number.isSafeInteger(limits.maxDepth) || limits.maxDepth < 1 ||
      input.length > limits.maxTasks) return null

  const nodes = new Map<string, AgentTaskNode>()
  for (const value of input) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
    const node = value as Record<string, unknown>
    if (typeof node.id !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(node.id) ||
        typeof node.agentId !== 'string' || !/^[a-z][a-z0-9_.-]{0,79}$/.test(node.agentId) ||
        typeof node.capability !== 'string' ||
        !ALLOWED_READ_CAPABILITIES.has(node.capability as AgentCapability) ||
        !Array.isArray(node.dependsOn) || node.dependsOn.length > limits.maxTasks ||
        !node.dependsOn.every((id) => typeof id === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(id)) ||
        new Set(node.dependsOn).size !== node.dependsOn.length ||
        node.dependsOn.includes(node.id) || nodes.has(node.id)) return null
    nodes.set(node.id, {
      id: node.id,
      agentId: node.agentId,
      capability: node.capability as AgentCapability,
      dependsOn: [...node.dependsOn] as string[],
    })
  }

  for (const node of nodes.values()) {
    if (node.dependsOn.some((dependency) => !nodes.has(dependency))) return null
  }

  const remaining = new Set(nodes.keys())
  const completed = new Set<string>()
  const waves: string[][] = []
  while (remaining.size > 0) {
    const ready = [...remaining].filter((id) =>
      nodes.get(id)!.dependsOn.every((dependency) => completed.has(dependency)),
    ).sort()
    if (ready.length === 0 || ready.length > limits.maxFanOut) return null
    waves.push(ready)
    if (waves.length > limits.maxDepth) return null
    for (const id of ready) {
      remaining.delete(id)
      completed.add(id)
    }
  }

  return { waves, taskCount: nodes.size, maxDepth: waves.length }
}
