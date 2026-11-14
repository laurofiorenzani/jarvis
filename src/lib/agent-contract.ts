/**
 * JARVIS specialist-agent contracts.
 *
 * This module defines and validates bounded task metadata only. It does not
 * dispatch work, grant capabilities, authenticate users, or execute tools.
 * Authorization remains a server-side responsibility.
 */

export const AGENT_CONTRACT_VERSION = 1 as const

export type AgentCapability =
  | 'conversation.read'
  | 'memory.read'
  | 'memory.propose'
  | 'calendar.read'
  | 'finance.read'
  | 'vehicle.telemetry.read'
  | 'smart_home.read'
  | 'communications.read'
  | 'research.public'
  | 'code.branch.write'
  | 'tests.run'

export type AgentTool =
  | 'conversation'
  | 'memory'
  | 'calendar'
  | 'family_cfo'
  | 'bmw_cardata'
  | 'smart_home'
  | 'communications'
  | 'web_research'
  | 'github_branch'
  | 'ci'

export type AgentMemoryScope =
  | 'profile.approved'
  | 'conversation.current'
  | 'household.shared.approved'
  | 'finance.owner'
  | 'health.owner'

export type AgentProviderClass = 'free_only' | 'local_only' | 'no_llm'

export type AgentApprovalMode = 'never_write' | 'approval_required'

export type AgentDefinition = {
  contractVersion: typeof AGENT_CONTRACT_VERSION
  id: string
  version: string
  taskTypes: readonly string[]
  capabilities: readonly AgentCapability[]
  tools: readonly AgentTool[]
  memoryScopes: readonly AgentMemoryScope[]
  providerClass: AgentProviderClass
  approvalMode: AgentApprovalMode
  limits: {
    maxRuntimeMs: number
    maxCalls: number
    maxRetries: number
    maxOutputBytes: number
  }
}

export type AgentEvidence = {
  kind: 'file' | 'commit' | 'test' | 'web' | 'database' | 'user_input'
  reference: string
  observedAt: string
}

export type AgentResultEnvelope<T = unknown> = {
  contractVersion: typeof AGENT_CONTRACT_VERSION
  taskId: string
  agentId: string
  agentVersion: string
  status: 'succeeded' | 'partial' | 'failed' | 'denied' | 'cancelled'
  result: T
  evidence: readonly AgentEvidence[]
  assumptions: readonly string[]
  unresolved: readonly string[]
  confidence: 'high' | 'medium' | 'low' | 'not_assessed'
  actions: readonly {
    capability: string
    outcome: 'not_attempted' | 'succeeded' | 'failed' | 'denied'
    detail?: string
  }[]
  approvalRequired: boolean
}

const CAPABILITIES = new Set<AgentCapability>([
  'conversation.read', 'memory.read', 'memory.propose', 'calendar.read',
  'finance.read', 'vehicle.telemetry.read', 'smart_home.read',
  'communications.read', 'research.public', 'code.branch.write', 'tests.run',
])
const TOOLS = new Set<AgentTool>([
  'conversation', 'memory', 'calendar', 'family_cfo', 'bmw_cardata',
  'smart_home', 'communications', 'web_research', 'github_branch', 'ci',
])
const MEMORY_SCOPES = new Set<AgentMemoryScope>([
  'profile.approved', 'conversation.current', 'household.shared.approved',
  'finance.owner', 'health.owner',
])
const PROVIDERS = new Set<AgentProviderClass>(['free_only', 'local_only', 'no_llm'])
const APPROVAL_MODES = new Set<AgentApprovalMode>(['never_write', 'approval_required'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmptyString(value: unknown, max = 160): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max
}

function stringArray(value: unknown, maxItems: number): value is string[] {
  return Array.isArray(value) && value.length <= maxItems &&
    value.every((item) => nonEmptyString(item))
}

function validUniqueEnumArray<T extends string>(
  value: unknown,
  allowed: ReadonlySet<T>,
): value is T[] {
  return Array.isArray(value) && value.length <= 32 &&
    value.every((item) => typeof item === 'string' && allowed.has(item as T)) &&
    new Set(value).size === value.length
}

/** Structural validation only; the caller must separately enforce user scope and policy. */
export function parseAgentDefinition(input: unknown): AgentDefinition | null {
  if (!isRecord(input) || input.contractVersion !== AGENT_CONTRACT_VERSION ||
      !nonEmptyString(input.id, 80) || !/^[a-z][a-z0-9_.-]*$/.test(input.id) ||
      !nonEmptyString(input.version, 40) || !/^\d+\.\d+\.\d+$/.test(input.version) ||
      !stringArray(input.taskTypes, 24) || input.taskTypes.length === 0 ||
      !validUniqueEnumArray(input.capabilities, CAPABILITIES) ||
      !validUniqueEnumArray(input.tools, TOOLS) ||
      !validUniqueEnumArray(input.memoryScopes, MEMORY_SCOPES) ||
      typeof input.providerClass !== 'string' || !PROVIDERS.has(input.providerClass as AgentProviderClass) ||
      typeof input.approvalMode !== 'string' || !APPROVAL_MODES.has(input.approvalMode as AgentApprovalMode) ||
      !isRecord(input.limits)) return null

  const limits = input.limits
  const integerInRange = (value: unknown, min: number, max: number): value is number =>
    typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max

  if (!integerInRange(limits.maxRuntimeMs, 100, 120_000) ||
      !integerInRange(limits.maxCalls, 1, 32) ||
      !integerInRange(limits.maxRetries, 0, 2) ||
      !integerInRange(limits.maxOutputBytes, 128, 65_536)) return null

  if (input.approvalMode === 'never_write' &&
      (input.capabilities as string[]).some((capability) =>
        capability === 'code.branch.write')) return null

  return {
    contractVersion: AGENT_CONTRACT_VERSION,
    id: input.id,
    version: input.version,
    taskTypes: [...input.taskTypes],
    capabilities: [...input.capabilities] as AgentCapability[],
    tools: [...input.tools] as AgentTool[],
    memoryScopes: [...input.memoryScopes] as AgentMemoryScope[],
    providerClass: input.providerClass as AgentProviderClass,
    approvalMode: input.approvalMode as AgentApprovalMode,
    limits: {
      maxRuntimeMs: limits.maxRuntimeMs,
      maxCalls: limits.maxCalls,
      maxRetries: limits.maxRetries,
      maxOutputBytes: limits.maxOutputBytes,
    },
  }
}

/** Reject malformed or unbounded evidence envelopes before orchestrator synthesis. */
export function isAgentResultEnvelope(input: unknown): input is AgentResultEnvelope {
  if (!isRecord(input) || input.contractVersion !== AGENT_CONTRACT_VERSION ||
      !nonEmptyString(input.taskId, 128) || !nonEmptyString(input.agentId, 80) ||
      !nonEmptyString(input.agentVersion, 40) ||
      !['succeeded', 'partial', 'failed', 'denied', 'cancelled'].includes(String(input.status)) ||
      !Array.isArray(input.evidence) || input.evidence.length > 32 ||
      !stringArray(input.assumptions, 16) || !stringArray(input.unresolved, 16) ||
      !['high', 'medium', 'low', 'not_assessed'].includes(String(input.confidence)) ||
      !Array.isArray(input.actions) || input.actions.length > 32 ||
      typeof input.approvalRequired !== 'boolean') return false

  const evidenceKinds = new Set(['file', 'commit', 'test', 'web', 'database', 'user_input'])
  if (!input.evidence.every((item) => isRecord(item) &&
      typeof item.kind === 'string' && evidenceKinds.has(item.kind) &&
      nonEmptyString(item.reference, 500) &&
      nonEmptyString(item.observedAt, 40) && Number.isFinite(Date.parse(item.observedAt)))) return false

  return input.actions.every((item) => isRecord(item) &&
    nonEmptyString(item.capability, 100) &&
    ['not_attempted', 'succeeded', 'failed', 'denied'].includes(String(item.outcome)) &&
    (item.detail === undefined || (typeof item.detail === 'string' && item.detail.length <= 500)))
}
