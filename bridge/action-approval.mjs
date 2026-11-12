import { createHash } from 'node:crypto'

/**
 * Canonical JSON for binding an approval to the exact tool arguments.
 * Only plain, data-only JSON structures are accepted; no getters or hidden data.
 */
export function canonicalizeArguments(value) {
  const ancestors = new Set()

  function visit(input) {
    if (input === null || typeof input === 'string' || typeof input === 'boolean') return JSON.stringify(input)
    if (typeof input === 'number') {
      if (!Number.isFinite(input)) throw new TypeError('Approval arguments must contain finite numbers.')
      return JSON.stringify(input)
    }
    if (typeof input !== 'object') throw new TypeError('Approval arguments must be JSON-compatible.')
    if (ancestors.has(input)) throw new TypeError('Approval arguments cannot contain cycles.')

    const prototype = Object.getPrototypeOf(input)
    if (!Array.isArray(input) && prototype !== Object.prototype && prototype !== null) {
      throw new TypeError('Approval arguments must use plain objects.')
    }
    if (Object.getOwnPropertySymbols(input).length) {
      throw new TypeError('Approval arguments cannot contain symbol keys.')
    }

    ancestors.add(input)
    let result
    if (Array.isArray(input)) {
      const keys = Object.keys(input)
      if (keys.length !== input.length || keys.some((key, i) => key !== String(i))) {
        throw new TypeError('Approval arrays cannot contain holes or extra properties.')
      }
      result = '[' + input.map((item) => visit(item)).join(',') + ']'
    } else {
      const keys = Object.keys(input).sort()
      const allKeys = Reflect.ownKeys(input)
      if (allKeys.some((key) => typeof key !== 'string' || !keys.includes(key))) {
        throw new TypeError('Approval objects cannot contain hidden properties.')
      }
      result = '{' + keys.map((key) => {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          throw new TypeError('Approval arguments contain a prohibited object key.')
        }
        const descriptor = Object.getOwnPropertyDescriptor(input, key)
        if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
          throw new TypeError('Approval arguments must contain enumerable data properties only.')
        }
        return JSON.stringify(key) + ':' + visit(descriptor.value)
      }).join(',') + '}'
    }
    ancestors.delete(input)
    return result
  }

  return visit(value)
}

export function digestArguments(value) {
  return createHash('sha256').update(canonicalizeArguments(value), 'utf8').digest('hex')
}
