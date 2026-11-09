import { lstat } from 'node:fs/promises'
import { MemoryStore } from './memory.mjs'
import { getMemoryEncryptionKey } from './memory-key-provider.mjs'
import { createMemoryApprovalBroker } from './memory-approval-broker.mjs'
import { createMemoryConfirmationTransport } from './memory-confirmation-transport.mjs'
import { createMemoryMcpServer } from './memory-mcp-server.mjs'

async function encryptedStoreExists(filePath) {
  try {
    const info = await lstat(filePath)
    if (!info.isFile()) throw new Error('Memory store path exists but is not a regular file')
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw new Error('Unable to determine whether the encrypted memory store exists')
  }
}

/**
 * Initialise one process-owned encrypted store and expose per-socket MCP
 * servers. The caller must create this runtime once during bridge startup,
 * before accepting WebSocket connections.
 */
export async function createMemoryRuntime({
  filePath,
  vault,
  audit,
  clock = () => new Date(),
  now = () => Date.now(),
  createId,
  ttlMs = 30_000,
} = {}) {
  if (typeof audit !== 'function') throw new TypeError('A metadata-only audit callback is required')
  if (typeof clock !== 'function' || typeof now !== 'function') {
    throw new TypeError('clock and now must be functions')
  }

  const exists = await encryptedStoreExists(filePath)
  const key = await getMemoryEncryptionKey({ vault, encryptedStoreExists: exists })
  let store
  try {
    store = new MemoryStore({ filePath, encryptionKey: key, clock })
  } finally {
    key.fill(0)
  }
  try {
    await store.init()
    await store.cleanupExpired()
  } catch (error) {
    await store.close()
    throw error
  }

  function createConnection({ send, getCurrentTurnId, sdk, z } = {}) {
    if (typeof getCurrentTurnId !== 'function') {
      throw new TypeError('A trusted current-turn ID provider is required')
    }
    const transport = createMemoryConfirmationTransport({ send, now })
    const broker = createMemoryApprovalBroker({
      requestConfirmation: transport.requestConfirmation,
      now,
      ...(createId === undefined ? {} : { createId }),
      ttlMs,
    })
    const authorize = ({ operation, memoryId, payload }) => {
      const turnId = getCurrentTurnId()
      if (typeof turnId !== 'string' || !turnId.trim()) {
        throw new Error('No trusted active user turn is available for memory authorization')
      }
      return broker.authorize({ operation, memoryId, payload, turnId })
    }
    const server = createMemoryMcpServer({ store, authorize, audit, clock, sdk, z })

    return Object.freeze({
      server,
      transport,
      broker,
      cancelAll() {
        transport.cancelAll()
        broker.cancelAll()
      },
    })
  }

  let closed = false
  return Object.freeze({
    store,
    createConnection,
    async close() {
      if (closed) return
      closed = true
      await store.close()
    },
  })
}
