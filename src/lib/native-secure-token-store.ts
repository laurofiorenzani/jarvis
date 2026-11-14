/**
 * Fail-closed adapter for @aparajita/capacitor-secure-storage.
 *
 * The plugin's web implementation uses unencrypted localStorage. Never call
 * any plugin storage method unless Capacitor reports a real native platform.
 * The platform getter and plugin are injected so browser builds stay native-
 * dependency-free and tests can prove the web fallback is never touched.
 */
import type { SecureTokenStore } from './cloud-auth'

export type NativeSecureStoragePlugin = {
  setSynchronize(sync: boolean): Promise<void>
  setDefaultKeychainAccess(access: number): Promise<void>
  setKeyPrefix(prefix: string): Promise<void>
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

export type NativeSecureTokenStoreOptions = {
  /** Pass KeychainAccess.whenUnlockedThisDeviceOnly from the native plugin. */
  keychainAccessWhenUnlockedThisDeviceOnly: number
  /** Isolates JARVIS keys from other plugins using the same native store. */
  keyPrefix?: string
}

export async function createNativeSecureTokenStore(
  plugin: NativeSecureStoragePlugin,
  getPlatform: () => string,
  options: NativeSecureTokenStoreOptions,
): Promise<SecureTokenStore> {
  const platform = getPlatform()
  if (platform !== 'ios' && platform !== 'android') {
    throw new Error('JARVIS credentials require native iOS Keychain or Android Keystore storage.')
  }

  const keyPrefix = options.keyPrefix ?? 'jarvis_'
  if (!keyPrefix.trim()) throw new Error('Native secure storage prefix must not be empty.')
  if (!Number.isInteger(options.keychainAccessWhenUnlockedThisDeviceOnly) ||
      options.keychainAccessWhenUnlockedThisDeviceOnly < 0) {
    throw new Error('A valid native Keychain access policy is required.')
  }

  await plugin.setKeyPrefix(keyPrefix)
  if (platform === 'ios') {
    // Keep refresh tokens on this device and unavailable to iCloud Keychain.
    await plugin.setSynchronize(false)
    await plugin.setDefaultKeychainAccess(options.keychainAccessWhenUnlockedThisDeviceOnly)
  }

  return {
    async get(key) {
      if (!key.trim()) throw new Error('Secure storage key must not be empty.')
      const value = await plugin.getItem(key)
      if (value === null) return null
      if (typeof value !== 'string') {
        throw new Error('Native secure storage returned an invalid value.')
      }
      return value
    },
    async set(key, value) {
      if (!key.trim()) throw new Error('Secure storage key must not be empty.')
      if (typeof value !== 'string' || !value) {
        throw new Error('Secure storage token must be a non-empty string.')
      }
      await plugin.setItem(key, value)
    },
    async remove(key) {
      if (!key.trim()) throw new Error('Secure storage key must not be empty.')
      await plugin.removeItem(key)
    },
  }
}
