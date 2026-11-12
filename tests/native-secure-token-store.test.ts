import test from 'node:test'
import assert from 'node:assert/strict'
import { createNativeSecureTokenStore, type NativeSecureStoragePlugin } from '../src/lib/native-secure-token-store.ts'

function fakePlugin(platform = 'ios'): NativeSecureStoragePlugin {
  const values = new Map<string, string>()
  return {
    getPlatform: async () => ({ value: platform }),
    keys: async () => ({ value: [...values.keys()] }),
    get: async ({ key }) => {
      const value = values.get(key)
      if (value === undefined) throw new Error('missing item')
      return { value }
    },
    set: async ({ key, value }) => {
      values.set(key, value)
      return { value: true }
    },
    remove: async ({ key }) => ({ value: values.delete(key) }),
  }
}

test('native token adapter accepts iOS and round-trips refresh tokens', async () => {
  const plugin = fakePlugin()
  const store = await createNativeSecureTokenStore(plugin)
  assert.equal(await store.get('refresh'), null)
  await store.set('refresh', 'secret-refresh-token')
  assert.equal(await store.get('refresh'), 'secret-refresh-token')
  await store.remove('refresh')
  assert.equal(await store.get('refresh'), null)
})

test('native token adapter accepts Android', async () => {
  const store = await createNativeSecureTokenStore(fakePlugin('android'))
  await store.set('refresh', 'android-token')
  assert.equal(await store.get('refresh'), 'android-token')
})

test('native token adapter refuses web/localStorage fallback before exposing storage', async () => {
  await assert.rejects(
    createNativeSecureTokenStore(fakePlugin('web')),
    /require native iOS Keychain or Android Keystore/,
  )
})

test('native token adapter propagates Keychain read failures instead of treating them as a missing token', async () => {
  const plugin = fakePlugin()
  plugin.keys = async () => ({ value: ['refresh'] })
  plugin.get = async () => { throw new Error('Keychain unavailable') }
  const store = await createNativeSecureTokenStore(plugin)
  await assert.rejects(store.get('refresh'), /Keychain unavailable/)
})

test('native token adapter rejects empty keys and unconfirmed writes', async () => {
  const plugin = fakePlugin()
  const store = await createNativeSecureTokenStore(plugin)
  await assert.rejects(store.get('  '), /must not be empty/)
  plugin.set = async () => ({ value: false })
  await assert.rejects(store.set('refresh', 'token'), /did not confirm/)
})
