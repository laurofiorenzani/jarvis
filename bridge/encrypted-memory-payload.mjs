import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const FORMAT = 'jarvis-memory-encrypted'
const VERSION = 1
const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const KEY_BYTES = 32

function validateKey(key) {
  if (!Buffer.isBuffer(key) || key.length !== KEY_BYTES) {
    throw new TypeError('Encryption key must be a 32-byte Buffer')
  }
}

function decodeCanonicalBase64(value, field) {
  if (typeof value !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error(`Invalid encrypted memory ${field}`)
  }
  const decoded = Buffer.from(value, 'base64')
  if (decoded.toString('base64') !== value) {
    throw new Error(`Invalid encrypted memory ${field}`)
  }
  return decoded
}

export function encryptMemoryPayload(plaintext, key) {
  validateKey(key)
  if (typeof plaintext !== 'string') throw new TypeError('Plaintext must be a string')
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  cipher.setAAD(Buffer.from(`${FORMAT}:v${VERSION}`))
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return JSON.stringify({
    format: FORMAT,
    version: VERSION,
    algorithm: ALGORITHM,
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  }) + '\n'
}

export function decryptMemoryPayload(envelopeText, key) {
  validateKey(key)
  let envelope
  try {
    envelope = JSON.parse(envelopeText)
  } catch {
    throw new Error('Encrypted memory file is malformed')
  }
  if (
    !envelope ||
    envelope.format !== FORMAT ||
    envelope.version !== VERSION ||
    envelope.algorithm !== ALGORITHM ||
    typeof envelope.iv !== 'string' ||
    typeof envelope.authTag !== 'string' ||
    typeof envelope.ciphertext !== 'string'
  ) {
    throw new Error('Unsupported encrypted memory format')
  }

  const iv = decodeCanonicalBase64(envelope.iv, 'IV')
  const authTag = decodeCanonicalBase64(envelope.authTag, 'authentication tag')
  const ciphertext = decodeCanonicalBase64(envelope.ciphertext, 'ciphertext')
  if (iv.length !== IV_BYTES || authTag.length !== 16) {
    throw new Error('Invalid encrypted memory envelope')
  }

  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAAD(Buffer.from(`${FORMAT}:v${VERSION}`))
    decipher.setAuthTag(authTag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  } catch {
    throw new Error('Unable to decrypt memory file: key is incorrect or data was tampered with')
  }
}
