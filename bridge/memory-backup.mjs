import { createCipheriv, createDecipheriv, randomBytes, scrypt as scryptCallback } from 'node:crypto'
import { promisify } from 'node:util'
import { lstat, mkdir, open, readFile, rename, rm, writeFile }
import { basename, dirname, join, resolve } from 'node:path'
import { decryptMemoryPayload } from './encrypted-memory-payload.mjs'
import { MemoryStore } from './memory.mjs'
import { MEMORY_KEY_PURPOSE } from './memory-key-provider.mjs'

const scrypt = promisify(scryptCallback)
const FORMAT = 'jarvis-memory-backup'
const VERSION = 1
const AAD = Buffer.from('jarvis-memory-backup:v1')
const KEY_BYTES = 32
const SALT_BYTES = 16
const IV_BYTES = 12
const TAG_BYTES = 16
const SCRYPT = Object.freeze({ N: 32_768, r: 8, p: 1, maxmem: 128 * 1024 * 1024 })
const MAX_STORE_BYTES = 64 * 1024 * 1024
const MAX_AUDIT_BYTES = 8 * 1024 * 1024
const MAX_BACKUP_BYTES = 96 * 1024 * 1024

function validatePassphrase(passphrase) {
  if (typeof passphrase !== 'string' || passphrase.length < 16 || Buffer.byteLength(passphrase, 'utf8') > 1024) {
    throw new TypeError('Backup passphrase must be at least 16 characters and no more than 1024 UTF-8 bytes')
  }
}

function validateKey(key) {
  if (!Buffer.isBuffer(key) || key.length !== KEY_BYTES) {
    throw new TypeError('Memory backup requires a 32-byte encryption key Buffer')
  }
}

function decodeBase64(value, field, expectedLength) {
  if (typeof value !== 'string' ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error('Invalid memory backup ' + field)
  }
  const decoded = Buffer.from(value, 'base64')
  if (decoded.toString('base64') !== value || (expectedLength !== undefined && decoded.length !== expectedLength)) {
    decoded.fill(0)
    throw new Error('Invalid memory backup ' + field)
  }
  return decoded
}

function validateStoreDocument(value) {
  if (!value || typeof value !== 'object' || value.version !== 1 || !Array.isArray(value.records)) {
    throw new Error('Backup does not contain a supported Jarvis memory store')
  }
  if (value.records.length > 100_000) throw new Error('Backup contains too many memory records')
}

async function deriveBackupKey(passphrase, salt) {
  return Buffer.from(await scrypt(passphrase, salt, KEY_BYTES, SCRYPT))
}

async function exists(path) {
  try {
    await lstat(path)
    return true
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

async function writeSynced(path, bytes) {
  const handle = await open(path, 'wx', 0o600)
  try {
    await handle.writeFile(bytes)
    await handle.sync()
  } finally {
    await handle.close()
  }
}

async function acquireMemoryWriterLock(directory, purpose) {
  const lockPath = join(directory, 'memory.writer.lock')
  try {
    await mkdir(lockPath, { mode: 0o700 })
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throw new Error('Memory store is locked by a running bridge or another maintenance operation')
    }
    throw error
  }

  try {
    await writeFile(join(lockPath, 'owner.json'), JSON.stringify({
      pid: process.pid,
      purpose,
      startedAt: new Date().toISOString(),
    }) + '\\n', { flag: 'wx', mode: 0o600 })
  } catch (error) {
    await rm(lockPath, { recursive: true, force: true }).catch(() => {})
    throw error
  }

  let released = false
  return async () => {
    if (released) return
    released = true
    await rm(lockPath, { recursive: true, force: true })
  }
}

/**
 * Build a passphrase-encrypted backup containing the encrypted store, its
 * 32-byte vault key, and the metadata-only audit log. The key is never written
 * outside the authenticated encrypted backup envelope.
 */
export async function createEncryptedMemoryBackup({
  filePath,
  auditPath,
  key,
  passphrase,
  createdAt = new Date().toISOString(),
} = {}) {
  validateKey(key)
  validatePassphrase(passphrase)
  if (typeof filePath !== 'string' || !filePath.trim()) throw new TypeError('filePath is required')
  if (typeof auditPath !== 'string' || !auditPath.trim()) throw new TypeError('auditPath is required')
  if (!Number.isFinite(Date.parse(createdAt))) throw new TypeError('createdAt must be a valid timestamp')

  const sourceStore = resolve(filePath)
  const sourceAudit = resolve(auditPath)
  if (dirname(sourceStore) !== dirname(sourceAudit)) {
    throw new TypeError('Memory store and audit log must be in the same directory')
  }
  await mkdir(dirname(sourceStore), { recursive: true, mode: 0o700 })
  const releaseLock = await acquireMemoryWriterLock(dirname(sourceStore), 'backup')

  let storeBytes
  let auditBytes = Buffer.alloc(0)
  let derivedKey
  let payloadBytes
  const keyCopy = Buffer.from(key)
  try {
    storeBytes = await readFile(sourceStore)
    if (storeBytes.length > MAX_STORE_BYTES) throw new Error('Memory store exceeds the backup size limit')
    const parsedStore = JSON.parse(decryptMemoryPayload(storeBytes.toString('utf8'), keyCopy))
    validateStoreDocument(parsedStore)

    try {
      auditBytes = await readFile(sourceAudit)
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
    if (auditBytes.length > MAX_AUDIT_BYTES) throw new Error('Memory audit log exceeds the backup size limit')

    const packageText = JSON.stringify({
      format: FORMAT,
      version: VERSION,
      createdAt,
      keyPurpose: MEMORY_KEY_PURPOSE,
      memoryKey: keyCopy.toString('base64'),
      store: storeBytes.toString('base64'),
      audit: auditBytes.toString('base64'),
    })
    payloadBytes = Buffer.from(packageText, 'utf8')

    const salt = randomBytes(SALT_BYTES)
    const iv = randomBytes(IV_BYTES)
    derivedKey = await deriveBackupKey(passphrase, salt)
    const cipher = createCipheriv('aes-256-gcm', derivedKey, iv)
    cipher.setAAD(AAD)
    const ciphertext = Buffer.concat([cipher.update(payloadBytes), cipher.final()])
    const envelope = {
      format: FORMAT,
      version: VERSION,
      kdf: 'scrypt',
      scrypt: SCRYPT,
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
      ciphertext: ciphertext.toString('base64'),
    }
    const result = Buffer.from(JSON.stringify(envelope) + '\n', 'utf8')
    if (result.length > MAX_BACKUP_BYTES) {
      result.fill(0)
      throw new Error('Encrypted memory backup exceeds the maximum supported size')
    }
    return result
  } finally {
    keyCopy.fill(0)
    storeBytes?.fill(0)
    auditBytes.fill(0)
    payloadBytes?.fill(0)
    derivedKey?.fill(0)
    await releaseLock()
  }
}

/**
 * Restore only into an empty store path. The vault key is inserted with the
 * adapter's atomic create-if-absent contract and must match any existing key.
 * Existing memory or audit files are never overwritten.
 */
export async function restoreEncryptedMemoryBackup({
  backup,
  filePath,
  auditPath,
  vault,
  passphrase,
} = {}) {
  validatePassphrase(passphrase)
  if (!Buffer.isBuffer(backup) || backup.length < 1 || backup.length > MAX_BACKUP_BYTES) {
    throw new TypeError('backup must be a non-empty Buffer within the supported size limit')
  }
  if (typeof filePath !== 'string' || !filePath.trim()) throw new TypeError('filePath is required')
  if (typeof auditPath !== 'string' || !auditPath.trim()) throw new TypeError('auditPath is required')
  if (!vault || typeof vault.createSecretIfAbsent !== 'function') {
    throw new TypeError('A secure vault adapter with createSecretIfAbsent is required')
  }

  const targetStore = resolve(filePath)
  const targetAudit = resolve(auditPath)
  if (targetStore === targetAudit) throw new TypeError('Memory store and audit paths must be different')
  if (dirname(targetStore) !== dirname(targetAudit)) {
    throw new TypeError('Memory store and audit log must be in the same directory')
  }

  let envelope
  try {
    envelope = JSON.parse(backup.toString('utf8'))
  } catch {
    throw new Error('Memory backup envelope is malformed')
  }
  if (!envelope || envelope.format !== FORMAT || envelope.version !== VERSION ||
      envelope.kdf !== 'scrypt' || JSON.stringify(envelope.scrypt) !== JSON.stringify(SCRYPT)) {
    throw new Error('Unsupported memory backup format or key-derivation parameters')
  }

  const salt = decodeBase64(envelope.salt, 'salt', SALT_BYTES)
  const iv = decodeBase64(envelope.iv, 'IV', IV_BYTES)
  const authTag = decodeBase64(envelope.authTag, 'authentication tag', TAG_BYTES)
  const ciphertext = decodeBase64(envelope.ciphertext, 'ciphertext')
  let derivedKey
  let plaintext
  let recoveredKey
  let storeBytes
  let auditBytes
  let storeTemp
  let auditTemp
  let releaseLock

  try {
    derivedKey = await deriveBackupKey(passphrase, salt)
    try {
      const decipher = createDecipheriv('aes-256-gcm', derivedKey, iv)
      decipher.setAAD(AAD)
      decipher.setAuthTag(authTag)
      plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    } catch {
      throw new Error('Unable to decrypt memory backup: passphrase is incorrect or backup was tampered with')
    }

    let packageData
    try {
      packageData = JSON.parse(plaintext.toString('utf8'))
    } catch {
      throw new Error('Decrypted memory backup package is malformed')
    }
    if (!packageData || packageData.format !== FORMAT || packageData.version !== VERSION ||
        packageData.keyPurpose !== MEMORY_KEY_PURPOSE || !Number.isFinite(Date.parse(packageData.createdAt))) {
      throw new Error('Decrypted memory backup package has unsupported metadata')
    }

    recoveredKey = decodeBase64(packageData.memoryKey, 'memory key', KEY_BYTES)
    storeBytes = decodeBase64(packageData.store, 'memory store')
    auditBytes = decodeBase64(packageData.audit, 'audit log')
    if (storeBytes.length > MAX_STORE_BYTES || auditBytes.length > MAX_AUDIT_BYTES) {
      throw new Error('Decrypted memory backup exceeds the supported size limit')
    }

    const storeDocument = JSON.parse(decryptMemoryPayload(storeBytes.toString('utf8'), recoveredKey))
    validateStoreDocument(storeDocument)

    await mkdir(dirname(targetStore), { recursive: true, mode: 0o700 })
    releaseLock = await acquireMemoryWriterLock(dirname(targetStore), 'restore')
    if (await exists(targetStore)) throw new Error('Restore target already contains a memory store; refusing to overwrite it')
    if (await exists(targetAudit)) throw new Error('Restore target already contains an audit log; refusing to overwrite it')
    storeTemp = join(dirname(targetStore), '.' + basename(targetStore) + '.' + randomBytes(8).toString('hex') + '.restore.tmp')
    auditTemp = join(dirname(targetAudit), '.' + basename(targetAudit) + '.' + randomBytes(8).toString('hex') + '.restore.tmp')

    const storedKey = await vault.createSecretIfAbsent(MEMORY_KEY_PURPOSE, recoveredKey)
    try {
      validateKey(storedKey)
      if (!storedKey.equals(recoveredKey)) {
        throw new Error('The existing Credential Manager key does not match this backup; refusing to replace it')
      }
    } finally {
      if (Buffer.isBuffer(storedKey)) storedKey.fill(0)
    }

    await writeSynced(storeTemp, storeBytes)
    if (auditBytes.length) await writeSynced(auditTemp, auditBytes)

    // Validate the staged encrypted store through the production loader before
    // making it visible at the final path.
    const stagedStore = new MemoryStore({ filePath: storeTemp, encryptionKey: recoveredKey })
    try {
      await stagedStore.init()
    } finally {
      await stagedStore.close()
    }

    await rename(storeTemp, targetStore)
    try {
      if (auditBytes.length) await rename(auditTemp, targetAudit)
    } catch (error) {
      await rm(targetStore, { force: true })
      throw error
    }

    return { restored: true, recordCount: storeDocument.records.length, auditBytes: auditBytes.length }
  } finally {
    salt.fill(0)
    iv.fill(0)
    authTag.fill(0)
    ciphertext.fill(0)
    derivedKey?.fill(0)
    plaintext?.fill(0)
    recoveredKey?.fill(0)
    storeBytes?.fill(0)
    auditBytes?.fill(0)
    if (storeTemp) await rm(storeTemp, { force: true }).catch(() => {})
    if (auditTemp) await rm(auditTemp, { force: true }).catch(() => {})
    await releaseLock?.()
  }
}
