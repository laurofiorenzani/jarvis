import { createMemoryPayloadDigest } from './memory-approval-digest.mjs'

/**
 * Correlated request/reply transport for explicit memory confirmations.
 *
 * This module is deliberately independent of WebSocket and React. The bridge
 * supplies send(), the UI dispatcher calls receive(), and socket teardown calls
 * cancelAll(). A missing, malformed, late or disconnected reply is a denial.
 */
const OPERATIONS = new Set(['save', 'update', 'delete'])

function validChallenge(challenge) {
  if (!challenge || typeof challenge !== 'object') throw new TypeError('challenge is required')
  if (typeof challenge.id !== 'string' || !challenge.id.trim()) throw new TypeError('challenge.id is required')
  if (!OPERATIONS.has(challenge.operation)) throw new TypeError('unsupported operation')
  if (challenge.operation === 'save' && challenge.memoryId !== null) throw new TypeError('memoryId must be null for save')
  if (challenge.operation !== 'save' && (typeof challenge.memoryId !== 'string' || !challenge.memoryId.trim())) {
    throw new TypeError('memoryId is required for update/delete')
  }
  if (typeof challenge.payloadDigest !== 'string' || !/^(?:sha256:)?[a-f0-9]{64}$/.test(challenge.payloadDigest)) {
    throw new TypeError('payloadDigest must be a SHA-256 hex digest')
  }
  if (challenge.payloadPreview !== undefined && createMemoryPayloadDigest(challenge.payloadPreview) !== challenge.payloadDigest) {
    throw new TypeError('payloadPreview does not match the confirmation digest')
  }
  if (typeof challenge.turnId !== 'string' || !challenge.turnId.trim()) throw new TypeError('turnId is required')
  if (!Number.isFinite(challenge.expiresAt)) throw new TypeError('expiresAt must be finite')
}

/**
 * @param {{send: (frame: object) => void, now?: () => number, timeoutMs?: number}} options
 */
export function createMemoryConfirmationTransport({
  send,
  now = () => Date.now(),
  timeoutMs = 30_000,
} = {}) {
  if (typeof send !== 'function') throw new TypeError('send must be a function')
  if (typeof now !== 'function') throw new TypeError('now must be a function')
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) throw new TypeError('timeoutMs must be positive')

  const pending = new Map()

  function requestConfirmation(challenge) {
    validChallenge(challenge)
    if (pending.has(challenge.id)) throw new Error('duplicate confirmation request id')

    const boundChallenge = Object.freeze({
      id: challenge.id,
      operation: challenge.operation,
      memoryId: challenge.memoryId,
      payloadDigest: challenge.payloadDigest,
      ...(challenge.payloadPreview === undefined ? {} : { payloadPreview: structuredClone(challenge.payloadPreview) }),
      turnId: challenge.turnId,
      expiresAt: challenge.expiresAt,
    })
    const remaining = Math.min(timeoutMs, boundChallenge.expiresAt - now())
    if (!Number.isFinite(remaining) || remaining <= 0) return Promise.resolve(null)

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(boundChallenge.id)
        resolve(null)
      }, remaining)
      pending.set(boundChallenge.id, { challenge: boundChallenge, resolve, reject, timer })
      try {
        send({
          type: 'memory_confirmation',
          id: boundChallenge.id,
          operation: boundChallenge.operation,
          memoryId: boundChallenge.memoryId,
          payloadDigest: boundChallenge.payloadDigest,
          ...(boundChallenge.payloadPreview === undefined ? {} : { payloadPreview: structuredClone(boundChallenge.payloadPreview) }),
          turnId: boundChallenge.turnId,
          expiresAt: boundChallenge.expiresAt,
        })
      } catch (error) {
        clearTimeout(timer)
        pending.delete(boundChallenge.id)
        reject(error)
      }
    })
  }

  function receive(frame) {
    if (!frame || frame.type !== 'reply' || typeof frame.id !== 'string') return false
    const entry = pending.get(frame.id)
    if (!entry) return false

    const { challenge } = entry
    // Ignore forged or stale metadata without consuming the real challenge.
    if (frame.operation !== challenge.operation ||
        frame.memoryId !== challenge.memoryId ||
        frame.payloadDigest !== challenge.payloadDigest ||
        frame.turnId !== challenge.turnId ||
        (frame.approved !== true && frame.approved !== false)) return false

    // Timers can be delayed by a busy event loop; enforce expiry on receipt too.
    let receivedAt
    try { receivedAt = now() } catch { receivedAt = NaN }
    clearTimeout(entry.timer)
    pending.delete(frame.id)
    if (!Number.isFinite(receivedAt) || receivedAt >= challenge.expiresAt) {
      entry.resolve(null)
      return true
    }

    entry.resolve({
      id: frame.id,
      approved: frame.approved,
      operation: frame.operation,
      memoryId: frame.memoryId,
      payloadDigest: frame.payloadDigest,
      turnId: frame.turnId,
    })
    return true
  }

  function cancelAll() {
    for (const [id, entry] of pending) {
      // Tell the UI to dismiss the approval surface as well as denying the
      // broker request. This is used when the user interrupts or abandons a turn.
      try { send({ type: 'memory_confirmation_cancelled', id }) } catch {}
      clearTimeout(entry.timer)
      entry.resolve(null)
      pending.delete(id)
    }
  }

  return Object.freeze({
    requestConfirmation,
    receive,
    cancelAll,
    pendingCount: () => pending.size,
  })
}
