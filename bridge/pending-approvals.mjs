import { randomUUID } from 'node:crypto'
import { digestArguments } from './action-approval.mjs'

const DEFAULT_TTL_MS = 60_000
const MAX_TTL_MS = 120_000
const MAX_PENDING = 32
const MAX_IDENTIFIER_LENGTH = 200

/**
 * In-memory, single-use approval registry for one bridge process.
 * A decision is valid for one exact session/tool invocation/argument digest.
 * The registry does not execute tools; callers must await result before allowing
 * the SDK hook to continue.
 */
export class PendingApprovalRegistry {
  #pending = new Map()
  #closed = false

  constructor({ ttlMs = DEFAULT_TTL_MS, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
    if (!Number.isInteger(ttlMs) || ttlMs < 1 || ttlMs > MAX_TTL_MS) {
      throw new RangeError('Approval TTL must be between 1 and 120000 milliseconds.')
    }
    this.ttlMs = ttlMs
    this.now = now
    this.setTimer = setTimer
    this.clearTimer = clearTimer
  }

  create({ sessionId, toolUseId, toolName, arguments: args, title, target, impact }) {
    if (this.#closed) throw new Error('Approval registry is closed.')
    if (![sessionId, toolUseId, toolName].every((v) =>
      typeof v === 'string' && v.length > 0 && v.length <= MAX_IDENTIFIER_LENGTH
    )) {
      throw new TypeError('Approval requires bounded session, tool-use and tool identifiers.')
    }
    if (this.#pending.size >= MAX_PENDING) throw new Error('Too many pending approvals.')
    for (const entry of this.#pending.values()) {
      if (entry.sessionId === sessionId && entry.toolUseId === toolUseId) {
        throw new Error('An approval already exists for this tool invocation.')
      }
    }
    const argumentsDigest = digestArguments(args)
    const id = randomUUID()
    const expiresAt = this.now() + this.ttlMs
    let settle
    const result = new Promise((resolve) => { settle = resolve })
    const entry = {
      id, sessionId, toolUseId, toolName, argumentsDigest, expiresAt,
      settle, timer: null,
    }
    entry.timer = this.setTimer(() => this.#finish(entry, false), this.ttlMs)
    this.#pending.set(id, entry)

    return {
      request: {
        version: 1, id, sessionId, toolUseId, toolName,
        risk: 'approval_required', argumentsDigest, expiresAt,
        title: typeof title === 'string' ? title : 'Approval required',
        target: typeof target === 'string' ? target : 'Unknown target',
        impact: typeof impact === 'string' ? impact : 'This action has not happened yet.',
      },
      result,
    }
  }

  resolve(decision) {
    if (!decision || typeof decision !== 'object' || Array.isArray(decision)) return false
    const allowedKeys = new Set(['version', 'id', 'sessionId', 'toolUseId', 'argumentsDigest', 'approve'])
    if (Object.keys(decision).some((key) => !allowedKeys.has(key))) return false
    if (typeof decision.id !== 'string') return false
    const entry = this.#pending.get(decision.id)
    if (!entry) return false
    if (this.now() >= entry.expiresAt) {
      this.#finish(entry, false)
      return false
    }
    if (
      decision.version !== 1 ||
      decision.sessionId !== entry.sessionId ||
      decision.toolUseId !== entry.toolUseId ||
      decision.argumentsDigest !== entry.argumentsDigest ||
      typeof decision.approve !== 'boolean'
    ) return false

    this.#finish(entry, decision.approve)
    return true
  }

  cancelSession(sessionId) {
    for (const entry of this.#pending.values()) {
      if (entry.sessionId === sessionId) this.#finish(entry, false)
    }
  }

  close() {
    this.#closed = true
    for (const entry of this.#pending.values()) this.#finish(entry, false)
  }

  get size() { return this.#pending.size }

  #finish(entry, approved) {
    if (!this.#pending.has(entry.id)) return
    this.#pending.delete(entry.id)
    this.clearTimer(entry.timer)
    entry.settle(approved)
  }
}
