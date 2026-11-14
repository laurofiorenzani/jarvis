import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createNativeSecureTokenStore,
  type NativeSecureStoragePlugin,
} from '../src/lib/native-secure-token-store.ts'

function fakePlugin() {
  const values = new Map<string, string>()
  const calls: string[] = []
  const plugin: NativeSecureStoragePlugin = {
    setSynchronize: async (sync) => { calls.push(`sync:${sync}`) },
    setDefaultKeychainAccess: async (access) => { calls.push(`access:${access}`) },
    setKeyPrefix: async (prefix) => { calls.push(`prefix:${prefix}`) },
    getItem: async (key) => {
      calls.push(`get:${key}`)
      return values.get(key) ?? null
    },
    setItem: async (key, value) => {
      calls.push(`set:${key}`)
      values.set(key, value)
    },
    removeItem: async (key) => {
      calls.push(`remove:${key}`)
      values.delete(key)
    },
  }
  return { plugin, calls, values }
}

const options = { keychainAccessWhenUnlockedThisDeviceOnly: 1 }

test('iOS token adapter uses local Keychain, device-only access and round-trips refresh tokens', async () => {
  const fake = fakePlugin()
  const store = await createNativeSecureTokenStore(fake.plugin, () => 'ios', options)
  assert.deepEqual(fake.calls, ['prefix:jarvis_', 'sync:false', 'access:1'])
  assert.equal(await store.get('refresh'), null)
  await store.set('refresh', 'secret-refresh-token')
  assert.equal(await store.get('refresh'), 'secret-refresh-token')
  await store.remove('refresh')
  assert.equal(await store.get('refresh'), null)
})

test('Android token adapter uses native storage without iOS-only Keychain settings', async () => {
  const fake = fakePlugin()
  const store = await createNativeSecureTokenStore(fake.plugin, () => 'android', options)
  assert.deepEqual(fake.calls, ['prefix:jarvis_'])
  await store.set('refresh', 'android-token')
  assert.equal(await store.get('refresh'), 'android-token')
})

test('native token adapter refuses web/localStorage before invoking any plugin method', async () => {
  const fake = fakePlugin()
  await assert.rejects(
    createNativeSecureTokenStore(fake.plugin, () => 'web', options),
    /require native iOS Keychain or Android Keystore/,
  )
  assert.deepEqual(fake.calls, [])
})

test('native token adapter propagates Keychain read failures instead of treating them as missing tokens', async () => {
  const fake = fakePlugin()
  const store = await createNativeSecureTokenStore(fake.plugin, () => 'ios', options)
  fake.plugin.getItem = async () => { throw new Error('Keychain unavailable') }
  await assert.rejects(store.get('refresh'), /Keychain unavailable/)
})

test('native token adapter rejects empty keys, empty token values and invalid Keychain policy', async () => {
  const fake = fakePlugin()
  const store = await createNativeSecureTokenStore(fake.plugin, () => 'ios', options)
  await assert.rejects(store.get('  '), /key must not be empty/)
  await assert.rejects(store.set('refresh', ''), /non-empty string/)
  await assert.rejects(store.remove(''), /key must not be empty/)
  await assert.rejects(
    createNativeSecureTokenStore(fake.plugin, () => 'ios', { keychainAccessWhenUnlockedThisDeviceOnly: -1 }),
    /valid native Keychain access policy/,
  )
})
