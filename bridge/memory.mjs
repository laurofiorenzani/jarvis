/**
 * JARVIS persistent memory store.
 *
 * Local-only JSON storage for user-approved facts. The bridge only saves from
 * an explicit request in the current user message; model-facing mutation tools
 * remain blocked until turn-scoped authorization is enforced server-side.
 */

import { randomUUID } from 'node:crypto'
import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

const MAX_CONTENT_LENGTH = 2000
const MAX_TAGS = 12
const MAX_TAG_LENGTH = 40
const SECRET_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /\b(?:sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,})\b/,
  /\b(?:password|passwd|api[_ -]?key|access[_ -]?token)\s*[:=]\s*\S+/i,
]

function validateContent(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError('Memory content must be a non-empty string.')
  }
  const content = value.trim()
  if (content.length > MAX_CONTENT_LENGTH) {
    throw new RangeError(`Memory content must be at most ${MAX_CONTENT_LENGTH} characters.`)
  }
  if (SECRET_PATTERNS.some((pattern) => pattern.test(content))) {
    throw new Error('Memory content appears to contain a secret and was rejected.')
  }
  return content
}

function validateTags(tags = []) {
  if (!Array.isArray(tags) || tags.length > MAX_TAGS) {
    throw new TypeError(`Memory tags must be an array of at most ${MAX_TAGS} items.`)
  }
  return [...new Set(tags.map((tag) => {
    if (typeof tag !== 'string' || !tag.trim() || tag.trim().length > MAX_TAG_LENGTH) {
      throw new TypeError('Each memory tag must be a non-empty string of at most 40 characters.')
    }
    return tag.trim().toLowerCase()
  }))]
}

function validateRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error('Memory file has an invalid record.')
  }
  if (typeof record.id !== 'string' || typeof record.content !== 'string' ||
      typeof record.createdAt !== 'string' || typeof record.updatedAt !== 'string' ||
      !Array.isArray(record.tags)) {
    throw new Error('Memory file has an invalid record schema.')
  }
  return {
    id: record.id,
    content: validateContent(record.content),
    tags: validateTags(record.tags),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

function defaultPath() {
  return process.env.JARVIS_MEMORY_FILE || join(homedir(), '.jarvis', 'memory', 'memories.json')
}

export function createMemoryStore({ filePath = defaultPath(), clock = () => new Date() } = {}) {
  if (typeof filePath !== 'string' || !filePath) throw new TypeError('A memory file path is required.')
  let queue = Promise.resolve()

  async function readAll() {
    let raw
    try {
      raw = await readFile(filePath, 'utf8')
    } catch (error) {
      if (error.code === 'ENOENT') return []
      throw error
    }
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error('Memory file is not valid JSON; refusing to overwrite it.')
    }
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.memories)) {
      throw new Error('Memory file has an unsupported schema; refusing to overwrite it.')
    }
    return parsed.memories.map(validateRecord)
  }

  async function writeAll(memories) {
    const directory = dirname(filePath)
    await mkdir(directory, { recursive: true, mode: 0o700 })
    const temporary = join(directory, `.memories.${process.pid}.${randomUUID()}.tmp`)
    const payload = JSON.stringify({ version: 1, memories }, null, 2) + '\n'
    try {
      await writeFile(temporary, payload, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
      await chmod(temporary, 0o600)
      await rename(temporary, filePath)
      await chmod(filePath, 0o600)
    } finally {
      await rm(temporary, { force: true }).catch(() => {})
    }
  }

  function mutate(operation) {
    const result = queue.then(operation)
    queue = result.catch(() => {})
    return result
  }

  return Object.freeze({
    async list() {
      await queue
      return (await readAll()).map((record) => ({ ...record, tags: [...record.tags] }))
    },

    async search(query, { limit = 10 } = {}) {
      if (typeof query !== 'string' || !query.trim()) return []
      const terms = query.toLowerCase().trim().split(/\s+/)
      const records = await this.list()
      return records
        .map((record) => ({
          record,
          score: terms.reduce((score, term) =>
            score + (record.content.toLowerCase().includes(term) ? 2 : 0) +
              (record.tags.some((tag) => tag.includes(term)) ? 1 : 0), 0),
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || b.record.updatedAt.localeCompare(a.record.updatedAt))
        .slice(0, Math.max(1, Math.min(50, Number.isInteger(limit) ? limit : 10)))
        .map((item) => item.record)
    },

    save({ content, tags = [] } = {}) {
      const cleanContent = validateContent(content)
      const cleanTags = validateTags(tags)
      return mutate(async () => {
        const memories = await readAll()
        const now = clock().toISOString()
        const record = {
          id: randomUUID(),
          content: cleanContent,
          tags: cleanTags,
          createdAt: now,
          updatedAt: now,
        }
        memories.push(record)
        await writeAll(memories)
        return { ...record, tags: [...record.tags] }
      })
    },

    update(id, { content, tags } = {}) {
      if (typeof id !== 'string' || !id) throw new TypeError('A memory id is required.')
      const cleanContent = content === undefined ? undefined : validateContent(content)
      const cleanTags = tags === undefined ? undefined : validateTags(tags)
      return mutate(async () => {
        const memories = await readAll()
        const index = memories.findIndex((record) => record.id === id)
        if (index < 0) return null
        const current = memories[index]
        memories[index] = {
          ...current,
          ...(cleanContent === undefined ? {} : { content: cleanContent }),
          ...(cleanTags === undefined ? {} : { tags: cleanTags }),
          updatedAt: clock().toISOString(),
        }
        await writeAll(memories)
        return { ...memories[index], tags: [...memories[index].tags] }
      })
    },

    delete(id) {
      if (typeof id !== 'string' || !id) throw new TypeError('A memory id is required.')
      return mutate(async () => {
        const memories = await readAll()
        const remaining = memories.filter((record) => record.id !== id)
        if (remaining.length === memories.length) return false
        await writeAll(remaining)
        return true
      })
    },
  })
}
