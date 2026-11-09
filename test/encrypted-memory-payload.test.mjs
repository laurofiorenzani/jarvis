import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { decryptMemoryPayload, encryptMemoryPayload } from '../bridge/encrypted-memory-payload.mjs'

test('encrypts memory payloads without exposing plaintext and decrypts them', () => {
  const key = randomBytes(32)
  const plaintext = JSON.stringify({ version: 1, records: [{ content: 'private Jarvis note' }] })
  const encrypted = encryptMemoryPayload(plaintext, key)
  assert.equal(encrypted.includes('private Jarvis note'), false)
  assert.equal(decryptMemoryPayload(encrypted, key), plaintext)
})

test('uses a fresh nonce for each encryption', () => {
  const key = randomBytes(32)
  const first = JSON.parse(encryptMemoryPayload('same data', key))
  const second = JSON.parse(encryptMemoryPayload('same data', key))
  assert.notEqual(first.iv, second.iv)
  assert.notEqual(first.ciphertext, second.ciphertext)
})

test('rejects an incorrect key and tampered ciphertext', () => {
  const key = randomBytes(32)
  const encrypted = encryptMemoryPayload('private data', key)
  assert.throws(() => decryptMemoryPayload(encrypted, randomBytes(32)), /incorrect or data was tampered/)
  const tampered = JSON.parse(encrypted)
  tampered.ciphertext = Buffer.from('tampered').toString('base64')
  assert.throws(() => decryptMemoryPayload(JSON.stringify(tampered), key), /incorrect or data was tampered/)
})

test('rejects invalid keys and unsupported envelopes', () => {
  assert.throws(() => encryptMemoryPayload('data', Buffer.alloc(16)), /32-byte Buffer/)
  assert.throws(() => decryptMemoryPayload('{}', randomBytes(32)), /Unsupported encrypted memory format/)
})

test('rejects non-canonical and malformed Base64 fields before decryption', () => {
  const key = randomBytes(32)
  const envelope = JSON.parse(encryptMemoryPayload('private data', key))
  for (const field of ['iv', 'authTag', 'ciphertext']) {
    const malformed = { ...envelope, [field]: '%%%not-base64%%%' }
    assert.throws(() => decryptMemoryPayload(JSON.stringify(malformed), key), /Invalid encrypted memory/)
  }
  const nonCanonical = { ...envelope, ciphertext: envelope.ciphertext.replace(/=+$/, '') + '====' }
  assert.throws(() => decryptMemoryPayload(JSON.stringify(nonCanonical), key), /Invalid encrypted memory/)
})
