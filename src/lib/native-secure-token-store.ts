/**
 * Fail-closed adapter for the native secure-storage plugin.
 *
 * The plugin also has a browser implementation backed by localStorage. Never
 * construct this adapter unless the plugin reports a real iOS/Android runtime.
 * The plugin is injected so the browser build does not need a native dependency.
 */
import type { SecureTokenStore } from './cloud-auth'

export type NativeSecureStoragePlugin = {
  getPlatform(): Promise<{ value: string }>
  keys(): Promise<{ value: string[] }>
  get(options: { key: string }): Promise<{ value: string }>
  set(options: { key: string; value: string }): Promise<{ value: boolean }>
  remove(options: { key: string }): Promise<{ value: boolean }>
}

export async function createNativeSecureTokenStore(
  plugin: NativeSecureStoragePlugin,
): Promise<SecureTokenStore> {
  const platform = await plugin.getPlatform()
  if (platform.value !== 'ios' && platform.value !== 'android') {
    throw new Error('JARVIS credentials require native iOS Keychain or Android Keystore storage.')
  }

  return {
    async get(key) {
      if (!key.trim()) throw new Error('Secure storage key must not be empty.')
      // The plugin's get() rejects for a missing item. Check keys first so a
      // missing refresh token is distinguishable from a real Keychain failure.
      const keys = await plugin.keys()
      if (!keys.value.includes(key)) return null
      const result = await plugin.get({ key })
      if (typeof result.value !== 'string') {
        throw new Error('Native secure storage returned an invalid value.')
      }
      return result.value
    },
    async set(key, value) {
      if (!key.trim()) throw new Error('Secure storage key must not be empty.')
      const result = await plugin.set({ key, value })
      if (result.value !== true) throw new Error('Native secure storage did not confirm the write.')
    },
    async remove(key) {
      if (!key.trim()) throw new Error('Secure storage key must not be empty.')
      await plugin.remove({ key })
    },
  }
}
