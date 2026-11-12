import test from 'node:test'
import assert from 'node:assert/strict'
import { canonicalizeArguments, digestArguments } from '../bridge/action-approval.mjs'

test('canonical JSON sorts object keys recursively', () => {
  assert.equal(canonicalizeArguments({ z: 1, a: { y: true, b: 'x' } }), '{"a":{"b":"x","y":true},"z":1}')
})

test('argument digest is stable across object key ordering', () => {
  assert.equal(digestArguments({ b: 2, a: 1 }), digestArguments({ a: 1, b: 2 }))
})

test('argument digest changes when any value changes', () => {
  assert.notEqual(digestArguments({ amount: 10 }), digestArguments({ amount: 11 }))
})

test('non-JSON values are rejected', () => {
  for (const value of [undefined, 1n, () => {}, NaN, Infinity]) {
    assert.throws(() => canonicalizeArguments(value), TypeError)
  }
})

test('cycles, class instances and dangerous object keys are rejected', () => {
  const cyclic = {}; cyclic.self = cyclic
  assert.throws(() => canonicalizeArguments(cyclic), /cycles/)
  assert.throws(() => canonicalizeArguments(new Date()), /plain objects/)
  const dangerous = JSON.parse('{"__proto__":{"polluted":true}}')
  assert.throws(() => canonicalizeArguments(dangerous), /prohibited object key/)
})

test('getters, symbol keys and extra array properties are rejected without execution', () => {
  let executed = false
  const withGetter = {}
  Object.defineProperty(withGetter, 'secret', { enumerable: true, get() { executed = true; return 'x' } })
  assert.throws(() => canonicalizeArguments(withGetter), /data properties/)
  assert.equal(executed, false)
  const withSymbol = { value: 1, [Symbol('hidden')]: 2 }
  assert.throws(() => canonicalizeArguments(withSymbol), /symbol keys/)
  const withExtraArrayProperty = [1, 2]
  withExtraArrayProperty.extra = true
  assert.throws(() => canonicalizeArguments(withExtraArrayProperty), /extra properties/)
  const withHidden = {}
  Object.defineProperty(withHidden, 'hidden', { value: 1, enumerable: false })
  assert.throws(() => canonicalizeArguments(withHidden), /hidden properties/)
})

test('non-enumerable array elements are rejected', () => {
  const hiddenElement = [1]
  Object.defineProperty(hiddenElement, '0', { value: 1, enumerable: false })
  assert.throws(() => canonicalizeArguments(hiddenElement), /hidden or extra/)
})
