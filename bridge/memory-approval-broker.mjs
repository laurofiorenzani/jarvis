import { randomUUID } from 'node:crypto'
import { createMemoryPayloadDigest } from './memory-approval-digest.mjs'

const OPERATIONS = new Set(['save', 'update', 'delete'])

function validText(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${name} must be a non-empty string`)
  }
  return value
}

/**
 * Creates a fail-closed, one-shot approval gate for a single memory mutation.
 *
 * requestConfirmation must send the request to a trusted UI and resolve with
 * the UI's correlated reply. It must not infer approval from model text.
 */
export function createMemoryApprovalBroker({
  requestConfirmation,
  now = () => Date.now(),
  createId = randomUUID,
  ttlMs = 30_000,
} = {}) {
  if (typeof requestConfirmation !== 'function') {
    throw new TypeError('requestConfirmation must be a function')
  }
  if (typeof now !== 'function' || typeof createId !== 'function') {
    throw new TypeError('now and createId must be functions')
  }
  if (!Number.isSafeInteger(ttlMs) || ttlMs < 1) {
    throw new TypeError('ttlMs must be a positive safe integer')
  }

  const pending = new Map()

  async function authorize({ operation, memoryId = null, payload, turnId }) {
    if (!OPERATIONS.has(operation)) throw new TypeError('unsupported memory operation')
    if (operation !== 'save') validText(memoryId, 'memoryId')
    if (memoryId !== null && typeof memoryId !== 'string') {
      throw new TypeError('memoryId must be a string or null')
    }
    const payloadDigest = createMemoryPayloadDigest(payload)
    const payloadPreview = structuredClone(payload)
    if (createMemoryPayloadDigest(payloadPreview) !== payloadDigest) {
      throw new TypeError('payload changed while preparing confirmation')
    }
    validText(turnId, 'turnId')

    const issuedAt = now()
    if (!Number.isFinite(issuedAt)) throw new TypeError('clock must return a finite timestamp')
    const challengeId = validText(createId(), 'challenge id')
    if (pending.has(challengeId)) throw new Error('duplicate approval challenge id')

    const expiresAt = issuedAt + ttlMs
    if (!Number.isFinite(expiresAt)) throw new TypeError('approval expiry must be finite')
    const challenge = Object.freeze({
      challengeId,
      operation,
      memoryId,
      payloadDigest,
      turnId,
      issuedAt,
      expiresAt,
    })
    pending.set(challengeId, challenge)

    try {
      const reply = await requestConfirmation({
        id: challenge.challengeId,
        operation: challenge.operation,
        memoryId: challenge.memoryId,
        payloadDigest: challenge.payloadDigest,
        payloadPreview,
        turnId: challenge.turnId,
        expiresAt: challenge.expiresAt,
      })
      const receivedAt = now()
      if (!Number.isFinite(receivedAt) || receivedAt >= challenge.expiresAt) return false
      if (pending.get(challengeId) !== challenge) return false
      if (!reply || reply.id !== challenge.challengeId || reply.approved !== true) return false
      if (reply.operation !== challenge.operation ||
          reply.memoryId !== challenge.memoryId ||
          reply.payloadDigest !== challenge.payloadDigest ||
          reply.turnId !== challenge.turnId) return false
      return true
    } finally {
      // A challenge is consumed whether approved, denied, timed out or errored.
      pending.delete(challengeId)
    }
  }

  function cancelAll() {
    pending.clear()
  }

  return Object.freeze({ authorize, cancelAll, pendingCount: () => pending.size })
}
