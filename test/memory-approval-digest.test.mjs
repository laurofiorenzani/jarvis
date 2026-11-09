import test from 'node:test'
import assert from 'node:assert/strict'
import { createMemoryPayloadDigest } from '../bridge/memory-approval-digest.mjs'

test('canonical digest is independent of object key insertion order', () => {
  const first = { operation: 'save', memory: { title: 'Project', tags: ['jarvis', 'memory'] } }
  const second = { memory: { tags: ['jarvis', 'memory'], title: 'Project' }, operation: 'save' }
  assert.equal(createMemoryPayloadDigest(first), createMemoryPayloadDigest(second))
})

test('digest changes when any payload value changes', () => {
  const first = { operation: 'update', id: 'mem-1', content: 'before' }
  const second = { operation: 'update', id: 'mem-1', content: 'after' }
  assert.notEqual(createMemoryPayloadDigest(first), createMemoryPayloadDigest(second))
})

test('digest has a SHA-256 prefix and lowercase hexadecimal body', () => {
  assert.match(createMemoryPayloadDigest({ ok: true }), /^sha256:[a-f0-9]{64}$/)
})

test('rejects undefined, functions, symbols, bigint and non-finite numbers', () => {
  for (const payload of [
    { value: undefined },
    { value: () => {} },
    { value: Symbol('x') },
    { value: 1n },
    { value: Number.NaN },
    { value: Number.POSITIVE_INFINITY },
  ]) {
    assert.throws(() => createMemoryPayloadDigest(payload))
  }
})

test('rejects cycles, non-plain objects, sparse arrays and array extras', () => {
  const cycle = {}
  cycle.self = cycle
  assert.throws(() => createMemoryPayloadDigest(cycle), /cycles/)
  assert.throws(() => createMemoryPayloadDigest({ date: new Date() }), /plain JSON/)
  const sparse = []
  sparse.length = 2
  assert.throws(() => createMemoryPayloadDigest(sparse), /dense JSON/)
  const extra = []
  extra.note = 'not JSON'
  assert.throws(() => createMemoryPayloadDigest(extra), /dense JSON/)
})

test('rejects accessors, symbol keys and prototype-sensitive keys', () => {
  const accessor = {}
  Object.defineProperty(accessor, 'secret', { enumerable: true, get: () => 'value' })
  assert.throws(() => createMemoryPayloadDigest(accessor), /data values/)
  assert.throws(() => createMemoryPayloadDigest({ [Symbol('key')]: 'value' }), /symbol keys/)
  const dangerous = JSON.parse('{"__proto__":{"polluted":true}}')
  assert.throws(() => createMemoryPayloadDigest(dangerous), /forbidden/)
})
