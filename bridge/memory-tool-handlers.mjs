const SAVE_FIELDS = new Set(['type', 'content', 'source', 'sourceDate', 'confidence', 'sensitivity', 'retention'])
const UPDATE_FIELDS = new Set(['type', 'content', 'source', 'sourceDate', 'confidence', 'sensitivity', 'retention', 'status'])

function assertObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`)
  }
}

function assertOnlyFields(value, allowed, name) {
  for (const field of Object.keys(value)) {
    if (!allowed.has(field)) throw new TypeError(`Unsupported ${name} field: ${field}`)
  }
}

function assertId(id) {
  if (typeof id !== 'string' || !id.trim() || id.length > 100) {
    throw new TypeError('memoryId must be a non-empty string of at most 100 characters')
  }
}

function safeRecord(record) {
  return {
    id: record.id,
    type: record.type,
    content: record.content,
    source: record.source,
    sourceDate: record.sourceDate,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    confidence: record.confidence,
    sensitivity: record.sensitivity,
    retention: record.retention,
    status: record.status,
  }
}

/**
 * Framework-neutral, fail-closed handlers for a future MCP wrapper.
 * The model never controls sensitive visibility or authorization.
 */
export function createMemoryToolHandlers({ store, authorize, audit, clock = () => new Date() } = {}) {
  if (!store || typeof store.searchMemories !== 'function' ||
      typeof store.listMemories !== 'function' ||
      typeof store.getMemory !== 'function' ||
      typeof store.saveMemory !== 'function' ||
      typeof store.updateMemory !== 'function' ||
      typeof store.deleteMemory !== 'function') {
    throw new TypeError('A complete MemoryStore is required')
  }
  if (typeof authorize !== 'function') {
    throw new TypeError('A trusted authorization callback is required')
  }
  if (typeof audit !== 'function') {
    throw new TypeError('A metadata-only audit callback is required')
  }
  if (typeof clock !== 'function') throw new TypeError('A clock callback is required')

  async function authorizeWrite(operation, memoryId = null, payload) {
    const approved = await authorize({ operation, memoryId, payload })
    if (approved !== true) throw new Error(`Memory ${operation} was not explicitly authorized`)
    // Audit metadata only, before the mutation. Never pass content, source or keys.
    const timestamp = clock()
    if (!(timestamp instanceof Date) || !Number.isFinite(timestamp.getTime())) {
      throw new TypeError('Audit clock must return a valid Date')
    }
    await audit({ operation, memoryId, outcome: 'authorized', timestamp: timestamp.toISOString() })
  }

  async function findVisibleRecord(memoryId) {
    return store.getMemory(memoryId, { includeSensitive: false })
  }

  return Object.freeze({
    async memory_search(args = {}) {
      assertObject(args, 'search arguments')
      assertOnlyFields(args, new Set(['query', 'type', 'limit']), 'search')
      if (typeof args.query !== 'string' || !args.query.trim()) {
        throw new TypeError('query must be a non-empty string')
      }
      const records = await store.searchMemories(args.query, {
        ...(args.type === undefined ? {} : { type: args.type }),
        ...(args.limit === undefined ? {} : { limit: args.limit }),
        // Sensitive records are always hidden from model-facing search.
        includeSensitive: false,
      })
      return records.map(safeRecord)
    },

    async memory_save(args = {}) {
      assertObject(args, 'save arguments')
      assertOnlyFields(args, SAVE_FIELDS, 'save')
      if (args.sensitivity === 'sensitive') {
        throw new Error('Sensitive memories are disabled in this integration layer')
      }
      const input = structuredClone(args)
      await authorizeWrite('save', null, input)
      const saved = await store.saveMemory(input)
      return safeRecord(saved)
    },

    async memory_update(args = {}) {
      assertObject(args, 'update arguments')
      assertOnlyFields(args, new Set(['memoryId', 'patch']), 'update')
      assertId(args.memoryId)
      assertObject(args.patch, 'patch')
      assertOnlyFields(args.patch, UPDATE_FIELDS, 'update patch')
      if (args.patch.sensitivity === 'sensitive') {
        throw new Error('Sensitive memories are disabled in this integration layer')
      }
      if (!await findVisibleRecord(args.memoryId)) {
        throw new Error('Memory not found or not available for this operation')
      }
      const patch = structuredClone(args.patch)
      await authorizeWrite('update', args.memoryId, { memoryId: args.memoryId, patch })
      const updated = await store.updateMemory(args.memoryId, patch)
      if (!updated) throw new Error('Memory not found')
      return safeRecord(updated)
    },

    async memory_delete(args = {}) {
      assertObject(args, 'delete arguments')
      assertOnlyFields(args, new Set(['memoryId']), 'delete')
      assertId(args.memoryId)
      if (!await findVisibleRecord(args.memoryId)) {
        throw new Error('Memory not found or not available for this operation')
      }
      await authorizeWrite('delete', args.memoryId, { memoryId: args.memoryId })
      return { memoryId: args.memoryId, deleted: await store.deleteMemory(args.memoryId) }
    },
  })
}
