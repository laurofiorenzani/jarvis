import test from 'node:test'
import assert from 'node:assert/strict'
import { takeSseFrames, sseFrameData } from './sse-frames.js'

test('parses multiple complete frames in one chunk', () => {
  const result = takeSseFrames('data: {"n":1}\n\ndata: {"n":2}\n\n')
  assert.deepEqual(result.frames, ['data: {"n":1}', 'data: {"n":2}'])
  assert.equal(result.remainder, '')
})

test('preserves a frame split across chunks', () => {
  const first = takeSseFrames('data: {"type":"text.')
  const second = takeSseFrames(first.remainder + 'delta"}\n\n')
  assert.deepEqual(first.frames, [])
  assert.deepEqual(second.frames, ['data: {"type":"text.delta"}'])
  assert.equal(second.remainder, '')
})

test('accepts CRLF separators and joins data lines', () => {
  const result = takeSseFrames('event: message\r\ndata: {"ok":true}\r\n\r\n')
  assert.equal(result.frames.length, 1)
  assert.equal(sseFrameData(result.frames[0]), '{"ok":true}')
})

test('flushes a final frame without a trailing blank line', () => {
  const result = takeSseFrames('data: {"done":true}', true)
  assert.deepEqual(result.frames, ['data: {"done":true}'])
  assert.equal(result.remainder, '')
})

test('leaves malformed JSON handling explicit at the consumer boundary', () => {
  assert.throws(() => JSON.parse(sseFrameData('data: {broken}')), SyntaxError)
})
