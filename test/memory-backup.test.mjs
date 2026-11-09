import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { MemoryStore } from '../bridge/memory.mjs'
import {
  createEncryptedMemoryBackup,
  restoreEncryptedMemoryBackup,
} from '../bridge/memory-backup.mjs'
import { MEMORY_KEY_PURPOSE } from '../bridge/memory-key-provider.mjs'

const KEY = Buffer.from('0123456789abcdef0123456789abcdef')
const OTHER_KEY = Buffer.from('abcdef0123456789abcdef0123456789')
const PASSPHRASE = 'correct horse battery staple 2026'

function fakeVault(initial = null) {
  let stored = initial ? Buffer.from(initial) : null
  let creates = 0
  return {
    get creates() { return creates },
    async createSecretIfAbsent(name, candidate) {
      assert.equal(name, MEMORY_KEY_PURPOSE)
      creates += 1
      if (!stored) stored = Buffer.from(candidate)
      return Buffer.from(stored)
    },
    async getSecret(name) {
      assert.equal(name, MEMORY_KEY_PURPOSE)
      return stored ? Buffer.from(stored) : null
    },
  }
}

async function createSource(t, { withAudit = true } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'jarvis-memory-backup-source-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const filePath = join(directory, 'memory.enc')
  const auditPath = join(directory, 'audit.jsonl')
  const store = new MemoryStore({ filePath, encryptionKey: KEY })
  await store.init()
  const saved = await store.saveMemory({
    type: 'project',
    content: 'Synthetic backup recovery record',
    source: 'backup test',
    sensitivity: 'personal',
    retention: '365d',
  })
  await store.close()
  if (withAudit) {
    await writeFile(auditPath, JSON.stringify({
      operation: 'save',
      memoryId: saved.id,
      outcome: 'authorized',
      timestamp: '2026-11-09T12:00:00.000Z',
    }) + '\n', { mode: 0o600 })
  }
  const backup = await createEncryptedMemoryBackup({
    filePath,
    auditPath,
    key: KEY,
    passphrase: PASSPHRASE,
  })
  return { directory, filePath, auditPath, saved, backup }
}

test('creates an authenticated passphrase backup and restores the encrypted store and vault key', async (t) => {
  const source = await createSource(t)
  assert.equal(source.backup.includes(Buffer.from('Synthetic backup recovery record')), false)
  assert.equal(source.backup.includes(KEY), false)
  await assert.rejects(readFile(join(source.directory, 'memory.writer.lock', 'owner.json')), { code: 'ENOENT' })

  const target = await mkdtemp(join(tmpdir(), 'jarvis-memory-backup-target-'))
  t.after(() => rm(target, { recursive: true, force: true }))
  const filePath = join(target, 'memory.enc')
  const auditPath = join(target, 'audit.jsonl')
  const vault = fakeVault()

  const result = await restoreEncryptedMemoryBackup({
    backup: source.backup,
    filePath,
    auditPath,
    vault,
    passphrase: PASSPHRASE,
  })
  assert.deepEqual(result, { restored: true, recordCount: 1, auditBytes: (await readFile(source.auditPath)).length })
  assert.equal(vault.creates, 1)
  await assert.rejects(readFile(join(target, 'memory.writer.lock', 'owner.json')), { code: 'ENOENT' })
  const restoredKey = await vault.getSecret(MEMORY_KEY_PURPOSE)
  assert.deepEqual(restoredKey, KEY)
  const restoredStore = new MemoryStore({ filePath, encryptionKey: restoredKey })
  await restoredStore.init()
  const records = await restoredStore.listMemories({ includeSensitive: true })
  assert.equal(records.length, 1)
  assert.equal(records[0].id, source.saved.id)
  assert.equal(records[0].content, 'Synthetic backup recovery record')
  await restoredStore.close()
  restoredKey.fill(0)
  assert.equal((await readFile(auditPath, 'utf8')).includes(source.saved.id), true)
})

test('rejects an incorrect passphrase without creating a vault key or target files', async (t) => {
  const source = await createSource(t)
  const target = await mkdtemp(join(tmpdir(), 'jarvis-memory-backup-wrong-pass-'))
  t.after(() => rm(target, { recursive: true, force: true }))
  const vault = fakeVault()
  await assert.rejects(restoreEncryptedMemoryBackup({
    backup: source.backup,
    filePath: join(target, 'memory.enc'),
    auditPath: join(target, 'audit.jsonl'),
    vault,
    passphrase: 'incorrect horse battery staple 2026',
  }), /passphrase is incorrect or backup was tampered with/)
  assert.equal(vault.creates, 0)
})

test('rejects a tampered backup before touching the vault', async (t) => {
  const source = await createSource(t)
  const tampered = Buffer.from(source.backup)
  tampered[tampered.length - 8] ^= 1
  const target = await mkdtemp(join(tmpdir(), 'jarvis-memory-backup-tampered-'))
  t.after(() => rm(target, { recursive: true, force: true }))
  const vault = fakeVault()
  await assert.rejects(restoreEncryptedMemoryBackup({
    backup: tampered,
    filePath: join(target, 'memory.enc'),
    auditPath: join(target, 'audit.jsonl'),
    vault,
    passphrase: PASSPHRASE,
  }), /passphrase is incorrect or backup was tampered with/)
  assert.equal(vault.creates, 0)
})

test('refuses to overwrite an existing memory store', async (t) => {
  const source = await createSource(t)
  const target = await mkdtemp(join(tmpdir(), 'jarvis-memory-backup-existing-'))
  t.after(() => rm(target, { recursive: true, force: true }))
  const filePath = join(target, 'memory.enc')
  await writeFile(filePath, 'do not overwrite')
  const vault = fakeVault()
  await assert.rejects(restoreEncryptedMemoryBackup({
    backup: source.backup,
    filePath,
    auditPath: join(target, 'audit.jsonl'),
    vault,
    passphrase: PASSPHRASE,
  }), /refusing to overwrite/)
  assert.equal(await readFile(filePath, 'utf8'), 'do not overwrite')
  assert.equal(vault.creates, 0)
})

test('refuses a backup whose key conflicts with the existing OS vault', async (t) => {
  const source = await createSource(t)
  const target = await mkdtemp(join(tmpdir(), 'jarvis-memory-backup-key-conflict-'))
  t.after(() => rm(target, { recursive: true, force: true }))
  const vault = fakeVault(OTHER_KEY)
  const filePath = join(target, 'memory.enc')
  await assert.rejects(restoreEncryptedMemoryBackup({
    backup: source.backup,
    filePath,
    auditPath: join(target, 'audit.jsonl'),
    vault,
    passphrase: PASSPHRASE,
  }), /does not match this backup/)
  await assert.rejects(readFile(filePath), { code: 'ENOENT' })
  assert.equal(vault.creates, 1)
})

test('requires a sufficiently long backup passphrase', async () => {
  await assert.rejects(createEncryptedMemoryBackup({
    filePath: '/unused',
    auditPath: '/unused-audit',
    key: KEY,
    passphrase: 'short',
  }), /at least 16 characters/)
})


test('backup refuses to run while the Jarvis bridge owns the memory writer lock', async (t) => {
  const source = await createSource(t)
  const lockPath = join(source.directory, 'memory.writer.lock')
  await mkdir(lockPath)
  await assert.rejects(createEncryptedMemoryBackup({
    filePath: source.filePath,
    auditPath: source.auditPath,
    key: KEY,
    passphrase: PASSPHRASE,
  }), /locked by a running bridge/)
});

test('restore refuses to run while another process owns the memory writer lock', async (t) => {
  const source = await createSource(t)
  const target = await mkdtemp(join(tmpdir(), 'jarvis-memory-backup-locked-'))
  t.after(() => rm(target, { recursive: true, force: true }))
  await mkdir(join(target, 'memory.writer.lock'))
  const vault = fakeVault()
  await assert.rejects(restoreEncryptedMemoryBackup({
    backup: source.backup,
    filePath: join(target, 'memory.enc'),
    auditPath: join(target, 'audit.jsonl'),
    vault,
    passphrase: PASSPHRASE,
  }), /locked by a running bridge/)
  assert.equal(vault.creates, 0)
});
