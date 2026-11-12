import { randomBytes, randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { AsyncEntry } from '@napi-rs/keyring'
import { createWindowsCredentialVault } from '../bridge/windows-credential-vault.mjs'
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
    console.log('[jarvis] Test credential: temporary and isolated')
  } catch (error) {
    console.error('[jarvis] Windows Credential Manager check failed:', error?.message ?? error)
    process.exitCode = 1
  } finally {
    candidate.fill(0)
    stored?.fill(0)
    try {
      await entry.deleteCredential()
    } catch (error) {
      console.error('[jarvis] WARNING: unable to delete temporary test credential:', error?.message ?? error)
      process.exitCode = 1
    }
    await rm(home, { recursive: true, force: true })
  }
}
