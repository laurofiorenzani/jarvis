import test from 'node:test'
import assert from 'node:assert/strict'
import { takeSseFrames, sseFrameData, consumeSseStream } from './sse-frames.js'

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

test('rejects malformed JSON at the event consumer boundary', () => {
  assert.throws(() => JSON.parse(sseFrameData('data: {broken}')), SyntaxError)
})

test('cancels the underlying stream when AbortSignal fires', async () => {
  let cancelled = false
  const stream = new ReadableStream({ cancel() { cancelled = true } })
  const controller = new AbortController()
  const pending = consumeSseStream(stream, () => {}, controller.signal)
  await Promise.resolve()
  controller.abort()
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal(cancelled, true)
})

test('cancels the reader when an event callback rejects a frame', async () => {
  let cancelled = false
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode('data: {"x":1}\n\n')) },
    cancel() { cancelled = true },
  })
  await assert.rejects(
    consumeSseStream(stream, () => { throw new SyntaxError('bad event') }),
    /bad event/,
  )
  assert.equal(cancelled, true)
})
