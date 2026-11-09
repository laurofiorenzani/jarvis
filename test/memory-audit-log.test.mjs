import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createMemoryAuditLogger } from '../bridge/memory-audit-log.mjs'

const NOW = Date.parse('2026-11-09T12:00:00.000Z')

function event(memoryId, timestamp = new Date(NOW).toISOString(), operation = 'save') {
  return { operation, memoryId, outcome: 'authorized', timestamp }
}

async function makeDirectory(t) {
  const directory = await mkdtemp(join(tmpdir(), 'jarvis-memory-audit-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  return directory
}

test('serializes concurrent metadata-only audit appends without interleaving JSONL', async (t) => {
  const directory = await makeDirectory(t)
  const auditPath = join(directory, 'audit.jsonl')
  const audit = createMemoryAuditLogger({ auditPath, now: () => NOW })
  await Promise.all(Array.from({ length: 50 }, (_, index) => audit(event('memory-' + index))))
  const lines = (await readFile(auditPath, 'utf8')).trim().split('\n')
  assert.equal(lines.length, 50)
  const records = lines.map((line) => JSON.parse(line))
  assert.equal(new Set(records.map((record) => record.memoryId)).size, 50)
  for (const record of records) {
    assert.deepEqual(Object.keys(record).sort(), ['memoryId', 'operation', 'outcome', 'timestamp'])
    assert.equal(record.outcome, 'authorized')
  }
});

test('rotates expired and excess audit metadata while keeping the byte and event budgets', async (t) => {
  const directory = await makeDirectory(t)
  const auditPath = join(directory, 'audit.jsonl')
  const old = event('old-record', new Date(NOW - 100 * 24 * 60 * 60 * 1000).toISOString())
  const recentA = event('recent-a', new Date(NOW - 2 * 24 * 60 * 60 * 1000).toISOString())
  const recentB = event('recent-b', new Date(NOW - 1 * 24 * 60 * 60 * 1000).toISOString())
  const initial = [old, recentA, recentB].map((item) => JSON.stringify(item)).join('\n') + '\n'
  await writeFile(auditPath, initial)
  const audit = createMemoryAuditLogger({
    auditPath,
    now: () => NOW,
    maxBytes: 260,
    maxEvents: 3,
    maxAgeMs: 90 * 24 * 60 * 60 * 1000,
  })
  await audit(event('new-record'))
  const output = await readFile(auditPath, 'utf8')
  const records = output.trim().split('\n').map((line) => JSON.parse(line))
  assert.ok(Buffer.byteLength(output) <= 260)
  assert.ok(records.length <= 3)
  assert.equal(records.some((record) => record.memoryId === 'old-record'), false)
  assert.ok(records.some((record) => record.memoryId === 'new-record'))
});

test('fails closed on malformed or non-metadata audit history', async (t) => {
  const directory = await makeDirectory(t)
  const auditPath = join(directory, 'audit.jsonl')
  await writeFile(auditPath, JSON.stringify({ ...event('bad'), content: 'PRIVATE_SENTINEL', padding: 'x'.repeat(300) }) + '\n')
  const audit = createMemoryAuditLogger({ auditPath, now: () => NOW, maxBytes: 200 })
  await assert.rejects(audit(event('new-record')), /metadata only/)
  const unchanged = await readFile(auditPath, 'utf8')
  assert.ok(unchanged.includes('PRIVATE_SENTINEL'))
  assert.equal(unchanged.includes('new-record'), false)
});

test('refuses symlinked audit paths', { skip: process.platform === 'win32' }, async (t) => {
  const directory = await makeDirectory(t)
  const realPath = join(directory, 'real.jsonl')
  const auditPath = join(directory, 'audit.jsonl')
  await writeFile(realPath, '')
  await symlink(realPath, auditPath)
  const audit = createMemoryAuditLogger({ auditPath, now: () => NOW })
  await assert.rejects(audit(event('new-record')), /regular file/)
  assert.equal(await readFile(realPath, 'utf8'), '')
});


test('snapshots validated audit metadata before asynchronous queueing', async (t) => {
  const directory = await makeDirectory(t)
  const auditPath = join(directory, 'audit.jsonl')
  const audit = createMemoryAuditLogger({ auditPath, now: () => NOW })
  const mutable = event('original-id')
  const pending = audit(mutable)
  mutable.memoryId = 'mutated-id'
  mutable.content = 'PRIVATE_SENTINEL'
  await pending
  const [record] = (await readFile(auditPath, 'utf8')).trim().split('\n').map((line) => JSON.parse(line))
  assert.equal(record.memoryId, 'original-id')
  assert.equal(Object.hasOwn(record, 'content'), false)
});
