import { randomBytes, randomUUID } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { AsyncEntry } from '@napi-rs/keyring'
import { createWindowsCredentialVault } from '../bridge/windows-credential-vault.mjs'
import { MemoryStore } from '../bridge/memory.mjs'
import { getMemoryEncryptionKey } from '../bridge/memory-key-provider.mjs'
import { createEncryptedMemoryBackup, restoreEncryptedMemoryBackup } from '../bridge/memory-backup.mjs'
import { MEMORY_KEY_PURPOSE } from '../bridge/memory-key-provider.mjs'

if (process.platform !== 'win32') {
  console.error('[jarvis] memory doctor currently requires Windows Credential Manager.')
  process.exitCode = 1
} else {
  const home = await mkdtemp(join(tmpdir(), 'jarvis-memory-doctor-'))
  const service = `Jarvis.Memory.Doctor.${randomUUID()}`
  const entry = new AsyncEntry(service, MEMORY_KEY_PURPOSE)
  const candidate = randomBytes(32)
  let stored
  let restoreHome
  let restoreService
  let restoreEntry
  let sourceKey
  let backupKey
  let restoreKey
  let backupBytes
  let sourceStore
  let restoredStore

  try {
    const vault = await createWindowsCredentialVault({ home, service })
    stored = await vault.createSecretIfAbsent(MEMORY_KEY_PURPOSE, candidate)
    const readBack = await vault.getSecret(MEMORY_KEY_PURPOSE)
    if (!readBack || !readBack.equals(candidate) || !stored.equals(candidate)) {
      throw new Error('Credential Manager round-trip returned an unexpected key')
    }
    readBack.fill(0)
    console.log('[jarvis] Windows Credential Manager: available')
    console.log('[jarvis] 32-byte binary secret round-trip: passed')

    // Exercise the full encrypted backup/restore path with synthetic data and
    // two isolated Credential Manager service names.
    const sourceDirectory = join(home, '.jarvis', 'memory')
    const sourceStorePath = join(sourceDirectory, 'memory.enc')
    const sourceAuditPath = join(sourceDirectory, 'audit.jsonl')
    sourceKey = await getMemoryEncryptionKey({ vault, encryptedStoreExists: false })
    sourceStore = new MemoryStore({ filePath: sourceStorePath, encryptionKey: sourceKey })
    await sourceStore.init()
    const saved = await sourceStore.saveMemory({
      type: 'diagnostic',
      content: 'Synthetic memory backup recovery check',
      source: 'memory:doctor',
      sensitivity: 'personal',
      retention: '365d',
    })
    await sourceStore.close()
    sourceStore = null
    sourceKey.fill(0)
    sourceKey = null
    await writeFile(sourceAuditPath, JSON.stringify({
      operation: 'save',
      memoryId: saved.id,
      outcome: 'authorized',
      timestamp: new Date().toISOString(),
    }) + '\n', { mode: 0o600 })

    backupKey = await vault.getSecret(MEMORY_KEY_PURPOSE)
    const backupPassphrase = randomBytes(32).toString('base64')
    backupBytes = await createEncryptedMemoryBackup({
      filePath: sourceStorePath,
      auditPath: sourceAuditPath,
      key: backupKey,
      passphrase: backupPassphrase,
    })
    backupKey.fill(0)
    backupKey = null

    restoreHome = await mkdtemp(join(tmpdir(), 'jarvis-memory-doctor-restore-'))
    restoreService = 'Jarvis.Memory.Doctor.Restore.' + randomUUID()
    restoreEntry = new AsyncEntry(restoreService, MEMORY_KEY_PURPOSE)
    const restoreVault = await createWindowsCredentialVault({ home: restoreHome, service: restoreService })
    const restoreDirectory = join(restoreHome, '.jarvis', 'memory')
    const restoreStorePath = join(restoreDirectory, 'memory.enc')
    const restoreAuditPath = join(restoreDirectory, 'audit.jsonl')
    const restored = await restoreEncryptedMemoryBackup({
      backup: backupBytes,
      filePath: restoreStorePath,
      auditPath: restoreAuditPath,
      vault: restoreVault,
      passphrase: backupPassphrase,
    })
    if (restored.recordCount !== 1) throw new Error('Encrypted backup restore returned an unexpected record count')
    restoreKey = await getMemoryEncryptionKey({ vault: restoreVault, encryptedStoreExists: true })
    restoredStore = new MemoryStore({ filePath: restoreStorePath, encryptionKey: restoreKey })
    await restoredStore.init()
    const recovered = await restoredStore.getMemory(saved.id, { includeSensitive: true })
    if (recovered?.content !== 'Synthetic memory backup recovery check') {
      throw new Error('Encrypted memory backup/restore did not recover the synthetic record')
    }
    await restoredStore.close()
    restoredStore = null
    restoreKey.fill(0)
    restoreKey = null
    console.log('[jarvis] passphrase-encrypted backup and restore: passed')
    console.log('[jarvis] backup key recovery through a second Credential Manager entry: passed')
    console.log('[jarvis] Test credentials and synthetic memory: temporary and isolated')
  } catch (error) {
    console.error('[jarvis] Windows Credential Manager check failed:', error?.message ?? error)
    process.exitCode = 1
  } finally {
    candidate.fill(0)
    stored?.fill(0)
    sourceKey?.fill(0)
    backupKey?.fill(0)
    restoreKey?.fill(0)
    backupBytes?.fill(0)
    await sourceStore?.close().catch(() => {})
    await restoredStore?.close().catch(() => {})
    for (const [label, credential] of [
      ['source', entry],
      ['restore', restoreEntry],
    ]) {
      if (!credential) continue
      try {
        await credential.deleteCredential()
      } catch (error) {
        console.error('[jarvis] WARNING: unable to delete temporary ' + label + ' test credential:', error?.message ?? error)
        process.exitCode = 1
      }
    }
    await rm(home, { recursive: true, force: true })
    if (restoreHome) await rm(restoreHome, { recursive: true, force: true })
  }
}
