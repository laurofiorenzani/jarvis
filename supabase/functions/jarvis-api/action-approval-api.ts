import {
  createApprovalEnvelope,
  type ApprovalEnvelope,
} from '../../../src/lib/action-approval.ts'

export const ACTION_APPROVAL_POLICY_VERSION = '2026-11-13-v1'
export const ACTION_APPROVAL_TTL_MS = 5 * 60 * 1000

export type CreateActionApprovalInput = {
  sessionId: string
  conversationId: string
  invocationId: string
  capabilityId: string
  arguments: unknown
  title: string
  target: string
  impact: string
  reversibility: string
}

export type ApprovalDecisionInput = {
  sessionId: string
  invocationId: string
  capabilityId: string
  argumentDigest: string
  decision: 'approved' | 'rejected'
}

export type ApprovalCancelInput = {
  sessionId: string
  invocationId: string
  argumentDigest: string
}

type RpcError = { message?: string } | null
type RpcResult = { data: unknown; error: RpcError }

export interface ActionApprovalRpcClient {
  rpc(name: string, params: Record<string, unknown>): PromiseLike<RpcResult>
}

export class ActionApprovalServiceError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, status: number) {
    super(code)
    this.name = 'ActionApprovalServiceError'
    this.code = code
    this.status = status
  }
}

function requiredText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max
}

function assertCreateInput(input: unknown): asserts input is CreateActionApprovalInput {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new ActionApprovalServiceError('invalid_request', 400)
  }
  const value = input as Record<string, unknown>
  if (
    !requiredText(value.sessionId, 200) ||
    !requiredText(value.conversationId, 200) ||
    !requiredText(value.invocationId, 200) ||
    !requiredText(value.capabilityId, 200) ||
    !requiredText(value.title, 200) ||
    !requiredText(value.target, 300) ||
    !requiredText(value.impact, 500) ||
    !requiredText(value.reversibility, 500) ||
    !Object.prototype.hasOwnProperty.call(value, 'arguments') ||
    value.arguments === undefined
  ) {
    throw new ActionApprovalServiceError('invalid_request', 400)
  }
}

export async function createActionApprovalRecord(
  client: ActionApprovalRpcClient,
  verifiedUserId: string,
  input: unknown,
  now: Date = new Date(),
  requestId: string = crypto.randomUUID(),
): Promise<Omit<ApprovalEnvelope, 'arguments'>> {
  if (!requiredText(verifiedUserId, 128)) throw new ActionApprovalServiceError('unauthenticated', 401)
  assertCreateInput(input)
  if (!Number.isFinite(now.getTime())) throw new ActionApprovalServiceError('invalid_time', 400)

  const envelope = await createApprovalEnvelope({
    requestId,
    userId: verifiedUserId,
    sessionId: input.sessionId,
    conversationId: input.conversationId,
    invocationId: input.invocationId,
    capabilityId: input.capabilityId,
    arguments: input.arguments,
    title: input.title,
    target: input.target,
    impact: input.impact,
    reversibility: input.reversibility,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ACTION_APPROVAL_TTL_MS).toISOString(),
    policyVersion: ACTION_APPROVAL_POLICY_VERSION,
  })

  // Persist only the canonical digest and user-visible summary. Raw arguments
  // remain ephemeral and are deliberately not included in the RPC payload.
  const { data, error } = await client.rpc('jarvis_create_action_approval', {
    p_request_id: envelope.requestId,
    p_user_id: verifiedUserId,
    p_session_id: envelope.sessionId,
    p_conversation_id: envelope.conversationId,
    p_invocation_id: envelope.invocationId,
    p_capability_id: envelope.capabilityId,
    p_argument_digest: envelope.argumentDigest,
    p_title: envelope.title,
    p_target: envelope.target,
    p_impact: envelope.impact,
    p_reversibility: envelope.reversibility,
    p_expires_at: envelope.expiresAt,
    p_policy_version: ACTION_APPROVAL_POLICY_VERSION,
  })
  if (error || data !== envelope.requestId) {
    throw new ActionApprovalServiceError('approval_persistence_unavailable', 503)
  }
  // Never return raw tool arguments to the UI or persist them in the approval row.
  return {
    requestId: envelope.requestId,
    userId: envelope.userId,
    sessionId: envelope.sessionId,
    conversationId: envelope.conversationId,
    invocationId: envelope.invocationId,
    capabilityId: envelope.capabilityId,
    argumentDigest: envelope.argumentDigest,
    title: envelope.title,
    target: envelope.target,
    impact: envelope.impact,
    reversibility: envelope.reversibility,
    createdAt: envelope.createdAt,
    expiresAt: envelope.expiresAt,
    policyVersion: envelope.policyVersion,
    status: envelope.status,
  }
}

function normalizeRpcRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    const first = data[0]
    return typeof first === 'object' && first !== null ? first as Record<string, unknown> : null
  }
  return typeof data === 'object' && data !== null ? data as Record<string, unknown> : null
}

export async function resolveActionApprovalRecord(
  client: ActionApprovalRpcClient,
  verifiedUserId: string,
  requestId: string,
  input: unknown,
): Promise<Record<string, unknown>> {
  if (!requiredText(verifiedUserId, 128)) throw new ActionApprovalServiceError('unauthenticated', 401)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
    throw new ActionApprovalServiceError('invalid_request', 400)
  }
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new ActionApprovalServiceError('invalid_request', 400)
  }
  const value = input as Record<string, unknown>
  if (
    !requiredText(value.sessionId, 200) ||
    !requiredText(value.invocationId, 200) ||
    !requiredText(value.capabilityId, 200) ||
    !requiredText(value.argumentDigest, 64) ||
    !/^[a-f0-9]{64}$/i.test(value.argumentDigest) ||
    (value.decision !== 'approved' && value.decision !== 'rejected')
  ) {
    throw new ActionApprovalServiceError('invalid_request', 400)
  }

  const { data, error } = await client.rpc('jarvis_resolve_action_approval', {
    p_request_id: requestId,
    p_user_id: verifiedUserId,
    p_session_id: value.sessionId,
    p_invocation_id: value.invocationId,
    p_capability_id: value.capabilityId,
    p_argument_digest: value.argumentDigest.toLowerCase(),
    p_policy_version: ACTION_APPROVAL_POLICY_VERSION,
    p_decision: value.decision,
  })
  if (error) throw new ActionApprovalServiceError('approval_resolution_unavailable', 503)
  const row = normalizeRpcRow(data)
  if (!row || typeof row.valid !== 'boolean' || typeof row.reason !== 'string') {
    throw new ActionApprovalServiceError('approval_resolution_unavailable', 503)
  }
  return row
}

export async function cancelActionApprovalRecord(
  client: ActionApprovalRpcClient,
  verifiedUserId: string,
  requestId: string,
  input: unknown,
): Promise<boolean> {
  if (!requiredText(verifiedUserId, 128)) throw new ActionApprovalServiceError('unauthenticated', 401)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
    throw new ActionApprovalServiceError('invalid_request', 400)
  }
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new ActionApprovalServiceError('invalid_request', 400)
  }
  const value = input as Record<string, unknown>
  if (
    !requiredText(value.sessionId, 200) ||
    !requiredText(value.invocationId, 200) ||
    !requiredText(value.argumentDigest, 64) ||
    !/^[a-f0-9]{64}$/i.test(value.argumentDigest)
  ) {
    throw new ActionApprovalServiceError('invalid_request', 400)
  }

  const { data, error } = await client.rpc('jarvis_cancel_action_approval', {
    p_request_id: requestId,
    p_user_id: verifiedUserId,
    p_session_id: value.sessionId,
    p_invocation_id: value.invocationId,
    p_argument_digest: value.argumentDigest.toLowerCase(),
  })
  if (error || typeof data !== 'boolean') {
    throw new ActionApprovalServiceError('approval_cancellation_unavailable', 503)
  }
  return data
}
