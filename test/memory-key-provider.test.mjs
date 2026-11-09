import test from 'node:test'
import assert from 'node:assert/strict'
import { getMemoryEncryptionKey, MEMORY_KEY_PURPOSE } from '../bridge/memory-key-provider.mjs'

function fakeVault(initial = null) {
  let secret = initial
  let creates = 0
  return {
    get creates() { return creates },
    async getSecret(name) {
      assert.equal(name, MEMORY_KEY_PURPOSE)
      return secret === null ? null : Buffer.from(secret)
    },
    async createSecretIfAbsent(name, candidate) {
      assert.equal(name, MEMORY_KEY_PURPOSE)
      creates++
      if (secret === null) secret = Buffer.from(candidate)
      return Buffer.from(secret)
    },
  }
}

test('returns a copy of an existing vault key', async () => {
  const original = Buffer.alloc(32, 7)
  const vault = fakeVault(original)
  const key = await getMemoryEncryptionKey({ vault, encryptedStoreExists: true })
  assert.deepEqual(key, original)
  assert.notEqual(key, original)
  key.fill(0)
  assert.deepEqual(await vault.getSecret(MEMORY_KEY_PURPOSE), original)
  assert.equal(vault.creates, 0)
})

test('creates a random 32-byte key only for an empty first-run store', async () => {
  const vault = fakeVault()
  const key = await getMemoryEncryptionKey({ vault, encryptedStoreExists: false })
  assert.equal(key.length, 32)
  assert.deepEqual(await vault.getSecret(MEMORY_KEY_PURPOSE), key)
  assert.equal(vault.creates, 1)
})

test('fails closed when a store exists but its key is missing', async () => {
  const vault = fakeVault()
  await assert.rejects(getMemoryEncryptionKey({ vault, encryptedStoreExists: true }), /key is missing for an existing store/)
  assert.equal(vault.creates, 0)
})

test('rejects an invalid key returned by the vault', async () => {
  const vault = fakeVault(Buffer.alloc(16))
  await assert.rejects(getMemoryEncryptionKey({ vault, encryptedStoreExists: true }), /invalid memory encryption key/)
})

test('does not expose vault errors or create a fallback key', async () => {
  const vault = {
    async getSecret() { throw new Error('synthetic vault internals') },
    async createSecretIfAbsent() { assert.fail('must not create a fallback key') },
  }
  await assert.rejects(
    getMemoryEncryptionKey({ vault, encryptedStoreExists: false }),
    (error) => {
      assert.match(error.message, /Unable to access the secure vault/)
      assert.doesNotMatch(error.message, /synthetic vault internals/)
      return true
    },
  )
})

test('requires an explicit store-existence decision and a vault adapter', async () => {
  await assert.rejects(getMemoryEncryptionKey({ vault: {}, encryptedStoreExists: false }), /secure vault adapter/)
  await assert.rejects(getMemoryEncryptionKey({ vault: fakeVault() }), /encryptedStoreExists/)
})

test('concurrent first-run calls converge on the single atomically stored key', async () => {
  const vault = fakeVault()
  const [first, second] = await Promise.all([
    getMemoryEncryptionKey({ vault, encryptedStoreExists: false }),
    getMemoryEncryptionKey({ vault, encryptedStoreExists: false }),
  ])
  assert.deepEqual(first, second)
  assert.deepEqual(await vault.getSecret(MEMORY_KEY_PURPOSE), first)
  assert.equal(vault.creates, 2)
})

test('hides errors when the vault refuses to create a key', async () => {
  const vault = {
    async getSecret() { return null },
    async createSecretIfAbsent() { throw new Error('vault write internals') },
  }
  await assert.rejects(
    getMemoryEncryptionKey({ vault, encryptedStoreExists: false }),
    (error) => {
      assert.match(error.message, /Unable to create the memory encryption key/)
      assert.doesNotMatch(error.message, /vault write internals/)
      return true
    },
  )
})
