import { mkdir, rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { MEMORY_KEY_PURPOSE } from './memory-key-provider.mjs'

const SERVICE = 'Jarvis.Memory'
const KEY_BYTES = 32

function validateSecret(value) {
  if (!Buffer.isBuffer(value) || value.length !== KEY_BYTES) {
    throw new TypeError('Memory vault secrets must be 32-byte Buffers')
  }
}

/**
 * Windows Credential Manager adapter.
 *
 * AsyncEntry stores the raw 32-byte key as a Windows Credential Manager
 * generic credential. A per-entry atomic lock directory serializes first-run
 * creation across processes; waiters re-read and return the winner. A stale
 * lock is never removed automatically.
 *
 * EntryClass is injectable only for deterministic unit tests. Production uses
 * the native @napi-rs/keyring AsyncEntry implementation.
 */
export async function createWindowsCredentialVault({
  home = homedir(),
  EntryClass,
  waitMs = 15_000,
  pollMs = 50,
} = {}) {
  if (!EntryClass && process.platform !== 'win32') {
    throw new Error('Jarvis memory encryption requires Windows Credential Manager on this platform')
  }
  if (!Number.isSafeInteger(waitMs) || waitMs < 1 ||
      !Number.isSafeInteger(pollMs) || pollMs < 1) {
    throw new TypeError('Vault lock timing values must be positive integers')
  }

  let AsyncEntry = EntryClass
  if (!AsyncEntry) {
    try {
      ({ AsyncEntry } = await import('@napi-rs/keyring'))
    } catch (error) {
      throw new Error('Unable to load the native Windows Credential Manager adapter', { cause: error })
    }
  }
  if (typeof AsyncEntry !== 'function') {
    throw new TypeError('The native keyring package does not expose AsyncEntry')
  }

  const entryFor = (name) => {
    if (name !== MEMORY_KEY_PURPOSE) throw new TypeError('Unsupported Jarvis vault entry name')
    return new AsyncEntry(SERVICE, name)
  }

  async function acquireCreationLock() {
    const directory = join(home, '.jarvis', 'memory')
    await mkdir(directory, { recursive: true, mode: 0o700 })
    const lockPath = join(directory, 'credential-init.lock')
    const deadline = Date.now() + waitMs

    while (true) {
      try {
        await mkdir(lockPath, { mode: 0o700 })
        return async () => rm(lockPath, { recursive: true, force: true })
      } catch (error) {
        if (error?.code !== 'EEXIST') throw error
        if (Date.now() >= deadline) {
          throw new Error(
            'Windows Credential Manager initialization is locked or stale; inspect credential-init.lock before retrying',
          )
        }
        await delay(Math.min(pollMs, Math.max(1, deadline - Date.now())))
      }
    }
  }

  return Object.freeze({
    async getSecret(name) {
      const secret = await entryFor(name).getSecret()
      return secret === null ? null : Buffer.from(secret)
    },

    async createSecretIfAbsent(name, candidate) {
      validateSecret(candidate)
      const requested = Buffer.from(candidate)
      try {
        const release = await acquireCreationLock()
        try {
          const entry = entryFor(name)
          const existing = await entry.getSecret()
          if (existing !== null) return Buffer.from(existing)

          await entry.setSecret(requested)
          const stored = await entry.getSecret()
          if (stored === null) {
            throw new Error('Windows Credential Manager did not return the newly stored memory key')
          }
          const result = Buffer.from(stored)
          if (!result.equals(requested)) {
            result.fill(0)
            throw new Error('Windows Credential Manager returned a different memory key after creation')
          }
          return result
        } finally {
          await release()
        }
      } finally {
        requested.fill(0)
      }
    },
  })
}

/** Default adapter entrypoint consumed by the guarded memory bootstrap. */
export async function createVault() {
  return createWindowsCredentialVault()
}
