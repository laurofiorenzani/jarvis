import { appendFile, lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

const DEFAULT_MAX_BYTES = 1024 * 1024
const DEFAULT_MAX_EVENTS = 5_000
const DEFAULT_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000

function validateEvent(event) {
  const keys = event && typeof event === 'object' && !Array.isArray(event)
    ? Object.keys(event).sort()
    : []
  if (keys.join(',') !== 'memoryId,operation,outcome,timestamp' ||
      !['save', 'update', 'delete'].includes(event.operation) ||
      !(event.memoryId === null || (typeof event.memoryId === 'string' && event.memoryId.length <= 100)) ||
      event.outcome !== 'authorized' ||
      typeof event.timestamp !== 'string' ||
      !Number.isFinite(Date.parse(event.timestamp))) {
    throw new TypeError('Memory audit events must contain metadata only')
  }
}

function parseAuditLog(contents) {
  const events = []
  for (const [index, line] of contents.split('\n').entries()) {
    if (!line) continue
    let event
    try {
      event = JSON.parse(line)
    } catch {
      throw new Error('Memory audit log is malformed at line ' + (index + 1))
    }
    validateEvent(event)
    events.push(event)
  }
  return events
}

export function createMemoryAuditLogger({
  auditPath,
  now = () => Date.now(),
  maxBytes = DEFAULT_MAX_BYTES,
  maxEvents = DEFAULT_MAX_EVENTS,
  maxAgeMs = DEFAULT_MAX_AGE_MS,
} = {}) {
  if (typeof auditPath !== 'string' || !auditPath.trim()) throw new TypeError('auditPath is required')
  if (typeof now !== 'function') throw new TypeError('now must be a function')
  if (!Number.isInteger(maxBytes) || maxBytes < 1) throw new TypeError('maxBytes must be a positive integer')
  if (!Number.isInteger(maxEvents) || maxEvents < 1) throw new TypeError('maxEvents must be a positive integer')
  if (!Number.isFinite(maxAgeMs) || maxAgeMs < 0) throw new TypeError('maxAgeMs must be a non-negative number')

  let queue = Promise.resolve()

  return function audit(event) {
    validateEvent(event)
    const operation = queue.then(async () => {
      const directory = dirname(auditPath)
      await mkdir(directory, { recursive: true, mode: 0o700 })

      let currentSize = 0
      try {
        const info = await lstat(auditPath)
        if (!info.isFile()) throw new Error('Memory audit path must be a regular file')
        currentSize = info.size
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error
      }

      const line = JSON.stringify(event) + '\n'
      const lineBytes = Buffer.byteLength(line, 'utf8')
      if (lineBytes > maxBytes) throw new Error('Memory audit event exceeds the configured size limit')
      if (currentSize + lineBytes > maxBytes && currentSize > 0) {
        const contents = await readFile(auditPath, 'utf8')
        const currentTime = now()
        if (!Number.isFinite(currentTime)) throw new Error('Memory audit clock returned an invalid timestamp')
        const cutoff = currentTime - maxAgeMs
        let retained = parseAuditLog(contents)
          .filter((item) => Date.parse(item.timestamp) >= cutoff)
        const keepCount = Math.max(0, maxEvents - 1)
        retained = keepCount ? retained.slice(-keepCount) : []
        let rotated = retained.length ? retained.map((item) => JSON.stringify(item)).join('\n') + '\n' : ''
        while (retained.length && Buffer.byteLength(rotated, 'utf8') + lineBytes > maxBytes) {
          retained.shift()
          rotated = retained.length ? retained.map((item) => JSON.stringify(item)).join('\n') + '\n' : ''
        }
        if (Buffer.byteLength(rotated, 'utf8') + lineBytes > maxBytes) {
          throw new Error('Memory audit log cannot fit within the configured size limit')
        }
        const temporaryPath = auditPath + '.' + randomUUID() + '.tmp'
        try {
          await writeFile(temporaryPath, rotated, { flag: 'wx', mode: 0o600 })
          await rename(temporaryPath, auditPath)
        } finally {
          await rm(temporaryPath, { force: true }).catch(() => {})
        }
      }

      await appendFile(auditPath, line, { mode: 0o600 })
    })

    queue = operation.catch(() => {})
    return operation
  }
}
