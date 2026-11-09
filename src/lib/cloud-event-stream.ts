/**
 * Minimal Server-Sent Events reader for authenticated cloud turn streams.
 * It accepts only JSON frames that pass the versioned event contract.
 */
import { parseCloudAssistantEvent, type CloudAssistantEvent } from './backend-contract'

const MAX_EVENT_FRAME_CHARS = 1_000_000

export async function* readCloudAssistantEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<CloudAssistantEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let completed = false

  const parseFrame = (frame: string): CloudAssistantEvent | null => {
    const data = frame.split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).replace(/^ /, ''))
      .join('\n')
    if (!data) return null
    try {
      return parseCloudAssistantEvent(JSON.parse(data))
    } catch {
      return null
    }
  }

  try {
    while (true) {
      const { value, done } = await reader.read()
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      if (buffer.length > MAX_EVENT_FRAME_CHARS && !/\r?\n\r?\n/.test(buffer)) {
        throw new Error('Cloud event frame exceeded the size limit.')
      }
      let boundary: number
      while ((boundary = buffer.search(/\r?\n\r?\n/)) !== -1) {
        const frame = buffer.slice(0, boundary)
        if (frame.length > MAX_EVENT_FRAME_CHARS) throw new Error('Cloud event frame exceeded the size limit.')
        const separator = buffer.slice(boundary).match(/^\r?\n\r?\n/)?.[0] ?? '\n\n'
        buffer = buffer.slice(boundary + separator.length)
        const event = parseFrame(frame)
        if (event) yield event
      }
      if (done) { completed = true; break }
    }
    if (buffer.length > MAX_EVENT_FRAME_CHARS) throw new Error('Cloud event frame exceeded the size limit.')
    if (buffer.trim()) {
      const event = parseFrame(buffer)
      if (event) yield event
    }
  } finally {
    if (!completed) await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
