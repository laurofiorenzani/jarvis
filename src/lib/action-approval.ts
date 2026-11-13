/**
 * Pure, fail-closed primitives for the future cloud action-approval service.
 *
 * This module does not persist approvals or execute integrations. The cloud
 * service must still enforce atomic one-time transitions, account-scoped RLS,
 * expiry, session binding, and server-side execution.
 */
export type ApprovalRiskClass = 'READ' | 'ROUTINE' | 'APPROVAL_REQUIRED' | 'DENY'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled' | 'executed'

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue }

export const MAX_APPROVAL_TTL_MS = 10 * 60 * 1000
export const MAX_APPROVAL_ARGUMENT_BYTES = 64 * 1024

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

export function classifyCapabilityRisk(input: {
  supported?: boolean
  riskClass?: unknown
} | null | undefined): ApprovalRiskClass {
  if (!input) return 'APPROVAL_REQUIRED'
  if (input.supported === false) return 'DENY'
  if (input.supported !== true) return 'APPROVAL_REQUIRED'
  if (input.riskClass === 'READ' || input.riskClass === 'ROUTINE' ||
      input.riskClass === 'APPROVAL_REQUIRED' || input.riskClass === 'DENY') {
    return input.riskClass
  }
  // Unknown capability verbs must never become silently pre-authorised.
  return 'APPROVAL_REQUIRED'
}

/** Canonical JSON with sorted object keys and strict JSON-only values. */
export function canonicalizeApprovalArguments(value: unknown): string {
  const ancestors = new Set<object>()

  const visit = (item: unknown): string => {
    if (item === null) return 'null'
    if (typeof item === 'string' || typeof item === 'boolean') return JSON.stringify(item)
    if (typeof item === 'number') {
      if (!Number.isFinite(item)) throw new TypeError('Approval arguments must not contain non-finite numbers.')
      return JSON.stringify(item)
    }
    if (typeof item !== 'object') {
      throw new TypeError('Approval arguments must contain JSON values only.')
    }
    if (ancestors.has(item)) throw new TypeError('Approval arguments must not contain cycles.')
    ancestors.add(item)
    try {
      if (Array.isArray(item)) {
        if (Object.getPrototypeOf(item) !== Array.prototype) {
          throw new TypeError('Approval arrays must use the standard array prototype.')
        }
        const ownKeys = Reflect.ownKeys(item)
        if (ownKeys.some((key) => typeof key !== 'string' || (key !== 'length' && !/^(0|[1-9]\d*)$/.test(key)))) {
          throw new TypeError('Approval arrays must not contain extra properties or symbols.')
        }
        const values: string[] = []
        for (let index = 0; index < item.length; index += 1) {
          if (!Object.prototype.hasOwnProperty.call(item, index)) {
            throw new TypeError('Approval arrays must not contain sparse entries.')
          }
          const descriptor = Object.getOwnPropertyDescriptor(item, String(index))
          if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
            throw new TypeError('Approval arguments must not contain accessors or hidden properties.')
          }
          values.push(visit(descriptor.value))
        }
        return '[' + values.join(',') + ']'
      }

      const prototype = Object.getPrototypeOf(item)
      if (prototype !== Object.prototype && prototype !== null) {
        throw new TypeError('Approval objects must be plain JSON objects.')
      }
      const keys = Reflect.ownKeys(item)
      if (keys.some((key) => typeof key !== 'string')) {
        throw new TypeError('Approval objects must not contain symbol keys.')
      }
      const stringKeys = keys as string[]
      for (const key of stringKeys) {
        if (FORBIDDEN_KEYS.has(key)) throw new TypeError('Approval object contains a prohibited key.')
        const descriptor = Object.getOwnPropertyDescriptor(item, key)
        if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
          throw new TypeError('Approval arguments must not contain accessors or hidden properties.')
        }
      }
      stringKeys.sort()
      return '{' + stringKeys.map((key) => JSON.stringify(key) + ':' + visit(
        (item as Record<string, unknown>)[key],
      )).join(',') + '}'
    } finally {
      ancestors.delete(item)
    }
  }

  return visit(value)
}

export async function digestApprovalArguments(value: unknown): Promise<string> {
  const canonical = canonicalizeApprovalArguments(value)
  const bytes = new TextEncoder().encode(canonical)
  if (bytes.byteLength > MAX_APPROVAL_ARGUMENT_BYTES) {
    throw new TypeError('Approval arguments exceed the 64 KiB limit.')
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export type ApprovalEnvelope = {
  protocolVersion: 1
  requestId: string
  userId: string
  sessionId: string
  conversationId: string
  invocationId: string
  capabilityId: string
  argumentDigest: string
  title: string
  target: string
  impact: string
  reversibility: string
  createdAt: string
  expiresAt: string
  policyVersion: string
  status: ApprovalStatus
}

export async function createApprovalEnvelope(input: {
  requestId: string
  userId: string
  sessionId: string
  conversationId: string
  invocationId: string
  capabilityId: string
  arguments: unknown
  title: string
  target: string
  impact: string
  reversibility: string
  createdAt: string
  expiresAt: string
  policyVersion: string
}): Promise<ApprovalEnvelope> {
  const required = [
    input.requestId, input.userId, input.sessionId, input.conversationId,
    input.invocationId, input.capabilityId, input.title, input.target,
    input.impact, input.reversibility, input.policyVersion,
  ]
  if (required.some((value) => typeof value !== 'string' || !value.trim() || value.length > 512)) {
    throw new TypeError('Approval envelope contains a missing or oversized field.')
  }
  const created = Date.parse(input.createdAt)
  const expires = Date.parse(input.expiresAt)
  const ttl = expires - created
  if (!Number.isFinite(created) || !Number.isFinite(expires) ||
      ttl <= 0 || ttl > MAX_APPROVAL_TTL_MS) {
    throw new TypeError('Approval expiry must be after creation and no more than ten minutes later.')
  }
  return {
    protocolVersion: 1,
    requestId: input.requestId,
    userId: input.userId,
    sessionId: input.sessionId,
    conversationId: input.conversationId,
    invocationId: input.invocationId,
    capabilityId: input.capabilityId,
    argumentDigest: await digestApprovalArguments(input.arguments),
    title: input.title,
    target: input.target,
    impact: input.impact,
    reversibility: input.reversibility,
    createdAt: new Date(created).toISOString(),
    expiresAt: new Date(expires).toISOString(),
    policyVersion: input.policyVersion,
    status: 'pending',
  }
}

export type ApprovalDecisionContext = {
  userId: string
  sessionId: string
  invocationId: string
  capabilityId: string
  argumentDigest: string
  now: string
}

export type ApprovalDecisionResult =
  | { valid: true; decision: 'approved' | 'rejected'; decidedAt: string }
  | { valid: false; reason: 'already_resolved' | 'expired' | 'context_mismatch' | 'argument_mismatch' | 'invalid_time' | 'invalid_decision' | 'invalid_envelope' }

export function validateApprovalDecision(
  envelope: ApprovalEnvelope,
  context: ApprovalDecisionContext,
  decision: 'approved' | 'rejected',
): ApprovalDecisionResult {
  if (envelope.protocolVersion !== 1) return { valid: false, reason: 'invalid_envelope' }
  if (envelope.status !== 'pending') return { valid: false, reason: 'already_resolved' }
  if (decision !== 'approved' && decision !== 'rejected') return { valid: false, reason: 'invalid_decision' }
  const now = Date.parse(context.now)
  const created = Date.parse(envelope.createdAt)
  const expires = Date.parse(envelope.expiresAt)
  const ttl = expires - created
  if (!Number.isFinite(now) || !Number.isFinite(created) || !Number.isFinite(expires) ||
      ttl <= 0 || ttl > MAX_APPROVAL_TTL_MS || now < created) return { valid: false, reason: 'invalid_time' }
  if (!/^[a-f0-9]{64}$/i.test(envelope.argumentDigest) || !/^[a-f0-9]{64}$/i.test(context.argumentDigest)) return { valid: false, reason: 'argument_mismatch' }
  if (now >= expires) return { valid: false, reason: 'expired' }
  if (context.userId !== envelope.userId ||
      context.sessionId !== envelope.sessionId ||
      context.invocationId !== envelope.invocationId ||
      context.capabilityId !== envelope.capabilityId) {
    return { valid: false, reason: 'context_mismatch' }
  }
  if (context.argumentDigest !== envelope.argumentDigest) {
    return { valid: false, reason: 'argument_mismatch' }
  }
  return { valid: true, decision, decidedAt: new Date(now).toISOString() }
}
