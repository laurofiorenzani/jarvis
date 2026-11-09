import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createWindowsCredentialVault } from '../bridge/windows-credential-vault.mjs'
import { MEMORY_KEY_PURPOSE } from '../bridge/memory-key-provider.mjs'

const FIRST = Buffer.from('11111111111111111111111111111111')
const SECOND = Buffer.from('22222222222222222222222222222222')

function fakeEntryClass() {
  const credentials = new Map()
  let writes = 0
  class FakeAsyncEntry {
    constructor(service, username) {
      this.key = `${service}:${username}`
    }
    async getSecret() {
      const value = credentials.get(this.key)
      return value ? [...value] : null
    }
    async setSecret(value) {
      writes += 1
      await new Promise((resolve) => setTimeout(resolve, 10))
      credentials.set(this.key, Buffer.from(value))
    }
  }
  return { FakeAsyncEntry, credentials, writes: () => writes }
}

test('Windows vault adapter validates the fixed purpose and 32-byte key contract', async (t) => {
  const home = await mkdtemp(join(tmpdir(), 'jarvis-vault-contract-'))
  t.after(() => rm(home, { recursive: true, force: true }))
  const { FakeAsyncEntry } = fakeEntryClass()
  const vault = await createWindowsCredentialVault({ home, EntryClass: FakeAsyncEntry })
  await assert.rejects(vault.getSecret('other-purpose'), /Unsupported/)
  await assert.rejects(vault.createSecretIfAbsent(MEMORY_KEY_PURPOSE, Buffer.alloc(16)), /32-byte/)
})

test('concurrent first-run callers receive the same atomically stored winner', async (t) => {
  const home = await mkdtemp(join(tmpdir(), 'jarvis-vault-race-'))
  t.after(() => rm(home, { recursive: true, force: true }))
  const { FakeAsyncEntry, writes } = fakeEntryClass()
  const first = await createWindowsCredentialVault({ home, EntryClass: FakeAsyncEntry, waitMs: 2000, pollMs: 2 })
  const second = await createWindowsCredentialVault({ home, EntryClass: FakeAsyncEntry, waitMs: 2000, pollMs: 2 })

  const [one, two] = await Promise.all([
    first.createSecretIfAbsent(MEMORY_KEY_PURPOSE, FIRST),
    second.createSecretIfAbsent(MEMORY_KEY_PURPOSE, SECOND),
  ])
  assert.equal(one.equals(two), true)
  assert.equal(one.equals(FIRST) || one.equals(SECOND), true)
  assert.equal(writes(), 1)
  assert.equal((await first.getSecret(MEMORY_KEY_PURPOSE)).equals(one), true)
  assert.equal((await second.getSecret(MEMORY_KEY_PURPOSE)).equals(one), true)
})

test('stale credential initialization lock fails closed and is never removed automatically', async (t) => {
  const home = await mkdtemp(join(tmpdir(), 'jarvis-vault-stale-'))
  t.after(() => rm(home, { recursive: true, force: true }))
  const lock = join(home, '.jarvis', 'memory', 'credential-init.lock')
  await mkdir(lock, { recursive: true })
  const { FakeAsyncEntry } = fakeEntryClass()
  const vault = await createWindowsCredentialVault({ home, EntryClass: FakeAsyncEntry, waitMs: 5, pollMs: 1 })
  await assert.rejects(
    vault.createSecretIfAbsent(MEMORY_KEY_PURPOSE, FIRST),
    /locked or stale/,
  )
  assert.equal((await stat(lock)).isDirectory(), true)
})

test('native adapter round-trips a key through Windows Credential Manager', async (t) => {
  if (process.platform !== 'win32') {
    t.skip('Windows Credential Manager integration test')
    return
  }
  const home = await mkdtemp(join(tmpdir(), 'jarvis-wincred-'))
  t.after(() => rm(home, { recursive: true, force: true }))
  const { AsyncEntry } = await import('@napi-rs/keyring')
  const service = `Jarvis.Memory.Test.${process.pid}.${Date.now()}`
  const entry = new AsyncEntry(service, MEMORY_KEY_PURPOSE)
  const vaultA = await createWindowsCredentialVault({ home, service })
  const vaultB = await createWindowsCredentialVault({ home, service })
  try {
    const [storedA, storedB] = await Promise.all([
      vaultA.createSecretIfAbsent(MEMORY_KEY_PURPOSE, FIRST),
      vaultB.createSecretIfAbsent(MEMORY_KEY_PURPOSE, SECOND),
    ])
    assert.deepEqual(storedA, storedB)
    assert.equal(storedA.equals(FIRST) || storedA.equals(SECOND), true)
    assert.deepEqual(await vaultA.getSecret(MEMORY_KEY_PURPOSE), storedA)
    assert.deepEqual(await vaultB.getSecret(MEMORY_KEY_PURPOSE), storedA)
    storedA.fill(0)
    storedB.fill(0)
  } finally {
    await entry.deleteCredential()
  }
})
