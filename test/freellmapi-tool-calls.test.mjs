import test from 'node:test'
import assert from 'node:assert/strict'
import { createToolCallAccumulator } from '../bridge/freellmapi-tool-calls.mjs'

test('assembles fragmented tool-call ids, names and JSON arguments', () => {
  const calls = createToolCallAccumulator()
  calls.add({ index: 0, id: 'call_', type: 'function', function: { name: 'jarvis_', arguments: '{"path"' } })
  calls.add({ index: 0, id: '1', function: { name: 'read', arguments: ':"notes.txt"}' } })
  assert.deepEqual(calls.finish(), [{
    id: 'call_1',
    type: 'function',
    function: { name: 'jarvis_read', arguments: { path: 'notes.txt' } },
  }])
})

test('returns calls in provider index order', () => {
  const calls = createToolCallAccumulator()
  calls.add({ index: 1, id: 'b', function: { name: 'second', arguments: '{}' } })
  calls.add({ index: 0, id: 'a', function: { name: 'first', arguments: '{}' } })
  assert.deepEqual(calls.finish().map((call) => call.id), ['a', 'b'])
})

test('rejects invalid JSON and non-object arguments', () => {
  const invalid = createToolCallAccumulator()
  invalid.add({ index: 0, id: 'x', function: { name: 'read', arguments: '{' } })
  assert.throws(() => invalid.finish(), /invalid JSON/)
  const array = createToolCallAccumulator()
  array.add({ index: 0, id: 'x', function: { name: 'read', arguments: '[]' } })
  assert.throws(() => array.finish(), /must be a JSON object/)
})

test('rejects oversized arguments and incomplete calls', () => {
  const oversized = createToolCallAccumulator({ maxArgumentBytes: 4 })
  assert.throws(() => oversized.add({ index: 0, function: { arguments: '{"a":1}' } }), /size limit/)
  const incomplete = createToolCallAccumulator()
  incomplete.add({ index: 0, id: 'x', function: { arguments: '{}' } })
  assert.throws(() => incomplete.finish(), /incomplete/)
})
