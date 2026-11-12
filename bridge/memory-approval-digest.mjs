import { createHash } from 'node:crypto'

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

function canonicalJson(value, seen = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value)
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('payload numbers must be finite')
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new TypeError('payload must not contain cycles')
    seen.add(value)
    const ownKeys = Reflect.ownKeys(value)
    if (ownKeys.length !== value.length + 1 || ownKeys.some((key) =>
      key !== 'length' && (typeof key !== 'string' || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)
    )) throw new TypeError('payload arrays must be dense JSON arrays')
    const items = []
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
      if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
        throw new TypeError('payload arrays must contain plain data values')
      }
      items.push(canonicalJson(descriptor.value, seen))
    }
    const result = `[${items.join(',')}]`
    seen.delete(value)
    return result
  }
  if (typeof value === 'object') {
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      throw new TypeError('payload objects must be plain JSON objects')
    }
    if (seen.has(value)) throw new TypeError('payload must not contain cycles')
    seen.add(value)
    const ownKeys = Reflect.ownKeys(value)
    if (ownKeys.some((key) => typeof key !== 'string')) {
      throw new TypeError('payload objects must not contain symbol keys')
    }
    const keys = ownKeys.sort()
    const entries = []
    for (const key of keys) {
      if (FORBIDDEN_KEYS.has(key)) throw new TypeError('payload contains a forbidden object key')
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
        throw new TypeError('payload objects must contain enumerable data values')
      }
      entries.push(`${JSON.stringify(key)}:${canonicalJson(descriptor.value, seen)}`)
    }
    const result = `{${entries.join(',')}}`
    seen.delete(value)
    return result
  }
  throw new TypeError('payload must contain only JSON values')
}

/**
 * Hashes a JSON-compatible memory mutation payload using deterministic key order.
 * The caller must hash the exact canonical operation data shown in the UI.
 */
export function createMemoryPayloadDigest(payload) {
  const canonical = canonicalJson(payload)
  return `sha256:${createHash('sha256').update(canonical, 'utf8').digest('hex')}`
}
