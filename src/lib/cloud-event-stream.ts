/**
 * Minimal Server-Sent Events reader for authenticated cloud turn streams.
 * It accepts only JSON frames that pass the versioned event contract.
 */
import { parseCloudAssistantEvent, type CloudAssistantEvent } from './backend-contract'

export async function* readCloudAssistantEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<CloudAssistantEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

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
      let boundary: number
      while ((boundary = buffer.search(/\r?\n\r?\n/)) !== -1) {
        const frame = buffer.slice(0, boundary)
        const separator = buffer.slice(boundary).match(/^\r?\n\r?\n/)?.[0] ?? '\n\n'
        buffer = buffer.slice(boundary + separator.length)
        const event = parseFrame(frame)
        if (event) yield event
      }
      if (done) break
    }
    if (buffer.trim()) {
      const event = parseFrame(buffer)
      if (event) yield event
    }
  } finally {
    reader.releaseLock()
  }
}
