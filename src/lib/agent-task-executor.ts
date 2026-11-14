/**
 * Bounded read-only specialist task executor.
 * Injected handlers remain responsible for authenticated account scope and
 * provider/tool policy. This module never grants capabilities or performs I/O.
 */
import { isAgentResultEnvelope, parseAgentDefinition, type AgentDefinition, type AgentResultEnvelope } from './agent-contract.ts'
import { buildReadOnlyTaskPlan, type AgentTaskNode, type TaskPlanLimits } from './agent-task-plan.ts'

export type ReadOnlyAgentTask = AgentTaskNode & { input: unknown }
export type AgentTaskExecution = {
  taskId: string
  status: 'succeeded' | 'partial' | 'failed' | 'denied' | 'cancelled'
  envelope: AgentResultEnvelope | null
  reason?: 'agent_unavailable' | 'capability_denied' | 'dependency_failed' | 'timeout' | 'aborted' | 'invalid_result' | 'output_limit' | 'handler_failed'
}
export type ReadOnlyAgentHandler = (agent: AgentDefinition, task: ReadOnlyAgentTask, signal: AbortSignal) => Promise<unknown>
export type ReadOnlyExecutionOptions = { limits?: TaskPlanLimits; signal?: AbortSignal }

function terminal(taskId: string, status: AgentTaskExecution['status'], reason: NonNullable<AgentTaskExecution['reason']>): AgentTaskExecution {
  return { taskId, status, envelope: null, reason }
}

function failedEnvelope(task: ReadOnlyAgentTask, agent: AgentDefinition, reason: string): AgentResultEnvelope {
  return {
    contractVersion: 1, taskId: task.id, agentId: agent.id, agentVersion: agent.version,
    status: 'failed', result: null, evidence: [], assumptions: [], unresolved: [reason],
    confidence: 'not_assessed', actions: [], approvalRequired: false,
  }
}

function outputBytes(value: unknown): number {
  try {
    const serialized = JSON.stringify(value)
    return typeof serialized === 'string' ? new TextEncoder().encode(serialized).byteLength : Number.POSITIVE_INFINITY
  } catch { return Number.POSITIVE_INFINITY }
}

/** Independent tasks run concurrently; dependencies wait for successful predecessors. */
export async function executeReadOnlyAgentTasks(
  input: unknown,
  definitions: readonly unknown[],
  handler: ReadOnlyAgentHandler,
  options: ReadOnlyExecutionOptions = {},
): Promise<AgentTaskExecution[]> {
  if (typeof handler !== 'function' || !Array.isArray(input)) return []
  const plan = buildReadOnlyTaskPlan(input, options.limits)
  if (!plan) return []

  const tasks = new Map<string, ReadOnlyAgentTask>()
  for (const value of input) {
    if (typeof value !== 'object' || value === null || Array.isArray(value) ||
        !Object.prototype.hasOwnProperty.call(value, 'input')) return []
    const task = value as ReadOnlyAgentTask
    tasks.set(task.id, task)
  }

  const agents = new Map<string, AgentDefinition>()
  for (const value of definitions) {
    const agent = parseAgentDefinition(value)
    if (!agent || agents.has(agent.id)) return []
    agents.set(agent.id, agent)
  }

  const outcomes = new Map<string, AgentTaskExecution>()
  for (const wave of plan.waves) {
    const waveResults = await Promise.all(wave.map(async (taskId): Promise<AgentTaskExecution> => {
      const task = tasks.get(taskId)!
      if (options.signal?.aborted) return terminal(taskId, 'cancelled', 'aborted')
      if (task.dependsOn.some((id) => outcomes.get(id)?.status !== 'succeeded')) {
        return terminal(taskId, 'cancelled', 'dependency_failed')
      }
      const agent = agents.get(task.agentId)
      if (!agent) return terminal(taskId, 'denied', 'agent_unavailable')
      if (!agent.capabilities.includes(task.capability)) return terminal(taskId, 'denied', 'capability_denied')

      const controller = new AbortController()
      let timer: ReturnType<typeof setTimeout> | undefined
      let abortListener: (() => void) | undefined
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error('agent_timeout')) }, agent.limits.maxRuntimeMs)
      })
      const aborted = new Promise<never>((_, reject) => {
        if (!options.signal) return
        abortListener = () => { controller.abort(); reject(new Error('agent_aborted')) }
        options.signal.addEventListener('abort', abortListener, { once: true })
      })

      try {
        const raw = await Promise.race([handler(agent, task, controller.signal), timeout, aborted])
        if (!isAgentResultEnvelope(raw) || raw.taskId !== task.id ||
            raw.agentId !== agent.id || raw.agentVersion !== agent.version ||
            raw.approvalRequired || raw.actions.length > agent.limits.maxCalls ||
            raw.actions.some((action) => !agent.capabilities.includes(action.capability as never))) {
          return terminal(taskId, 'failed', 'invalid_result')
        }
        if (outputBytes(raw) > agent.limits.maxOutputBytes) return terminal(taskId, 'failed', 'output_limit')
        return { taskId, status: raw.status, envelope: raw }
      } catch (cause) {
        const reason = cause instanceof Error && cause.message === 'agent_timeout' ? 'timeout'
          : cause instanceof Error && cause.message === 'agent_aborted' ? 'aborted' : 'handler_failed'
        const detail = reason === 'timeout' ? 'Agent exceeded its declared runtime limit.'
          : reason === 'aborted' ? 'Task was cancelled by the caller.'
            : 'Agent handler failed; error details were redacted.'
        const envelope = failedEnvelope(task, agent, detail)
        return { taskId, status: 'failed', envelope, reason }
      } finally {
        if (timer !== undefined) clearTimeout(timer)
        if (abortListener && options.signal) options.signal.removeEventListener('abort', abortListener)
      }
    }))
    for (const outcome of waveResults) outcomes.set(outcome.taskId, outcome)
  }

  return [...tasks.keys()].map((id) => outcomes.get(id)!)
}
