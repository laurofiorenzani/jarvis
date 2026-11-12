/** SSE frame splitting and stream consumption shared by the cloud client and Node tests. */
export function takeSseFrames(buffer, final = false) {
  const frames = []
  let remainder = buffer
  const separator = /\r?\n\r?\n/
  while (true) {
    const match = separator.exec(remainder)
    if (!match) break
    frames.push(remainder.slice(0, match.index))
    remainder = remainder.slice(match.index + match[0].length)
  }
  if (final && remainder.trim()) {
    frames.push(remainder)
    remainder = ''
  }
  return { frames, remainder }
}

export function sseFrameData(frame) {
  return frame.split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).replace(/^ /, ''))
    .join('\n')
}

function abortError() {
  return new DOMException('The stream was cancelled.', 'AbortError')
}

/**
 * Consume a Fetch-compatible SSE body. Cancellation and callback/parser errors
 * cancel the underlying reader before releasing its lock.
 */
export async function consumeSseStream(stream, onData, signal) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const onAbort = () => { void reader.cancel(signal?.reason).catch(() => {}) }

  try {
    if (signal?.aborted) throw abortError()
    signal?.addEventListener('abort', onAbort, { once: true })
    while (true) {
      if (signal?.aborted) throw abortError()
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parsed = takeSseFrames(buffer)
      buffer = parsed.remainder
      for (const frame of parsed.frames) onData(sseFrameData(frame))
    }
    if (signal?.aborted) throw abortError()
    buffer += decoder.decode()
    const final = takeSseFrames(buffer, true)
    for (const frame of final.frames) onData(sseFrameData(frame))
  } catch (cause) {
    try { await reader.cancel(cause) } catch { /* stream may already be cancelled */ }
    throw cause
  } finally {
    signal?.removeEventListener('abort', onAbort)
    try { reader.releaseLock() } catch { /* lock can already be released by a failed stream */ }
  }
}
