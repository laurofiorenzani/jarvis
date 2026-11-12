import { randomBytes } from 'node:crypto'

const KEY_BYTES = 32
export const MEMORY_KEY_PURPOSE = 'jarvis-memory-encryption-v1'

function validateKey(key) {
  if (!Buffer.isBuffer(key) || key.length !== KEY_BYTES) {
    throw new TypeError('Secure vault returned an invalid memory encryption key')
  }
}

/**
 * Resolve the memory key through an injected secure-vault adapter.
 *
 * Required adapter contract:
 * - getSecret(name): Promise<Buffer | null>
 * - createSecretIfAbsent(name, value): Promise<Buffer>
 *
 * createSecretIfAbsent MUST be atomic and return the stored winner if another
 * process created the secret concurrently. The adapter is responsible for
 * using an OS credential vault or an approved secret manager.
 */
export async function getMemoryEncryptionKey({ vault, encryptedStoreExists } = {}) {
  if (!vault || typeof vault.getSecret !== 'function' ||
      typeof vault.createSecretIfAbsent !== 'function') {
    throw new TypeError('A secure vault adapter with getSecret and createSecretIfAbsent is required')
  }
  if (typeof encryptedStoreExists !== 'boolean') {
    throw new TypeError('encryptedStoreExists must be a boolean')
  }

  let existing
  try {
    existing = await vault.getSecret(MEMORY_KEY_PURPOSE)
  } catch {
    throw new Error('Unable to access the secure vault; memory store was not opened')
  }

  if (existing !== null && existing !== undefined) {
    validateKey(existing)
    return Buffer.from(existing)
  }

  if (encryptedStoreExists) {
    throw new Error('Memory encryption key is missing for an existing store; refusing to create a replacement')
  }

  const candidate = randomBytes(KEY_BYTES)
  try {
    let stored
    try {
      stored = await vault.createSecretIfAbsent(MEMORY_KEY_PURPOSE, candidate)
    } catch {
      throw new Error('Unable to create the memory encryption key in the secure vault')
    }
    validateKey(stored)
    return Buffer.from(stored)
  } finally {
    candidate.fill(0)
  }
}
