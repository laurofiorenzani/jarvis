import { createHash } from 'node:crypto'

/**
 * Canonical JSON for binding an approval to the exact tool arguments.
 * Only JSON data structures are accepted; non-JSON values fail closed.
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
    ancestors.add(input)
    let result
    if (Array.isArray(input)) {
      for (let index = 0; index < input.length; index++) {
        if (!Object.prototype.hasOwnProperty.call(input, index)) {
          throw new TypeError('Approval arguments cannot contain sparse arrays.')
        }
      }
      result = '[' + input.map((item) => visit(item)).join(',') + ']'
    } else {
      const keys = Object.keys(input).sort()
      result = '{' + keys.map((key) => {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          throw new TypeError('Approval arguments contain a prohibited object key.')
        }
        return JSON.stringify(key) + ':' + visit(input[key])
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
