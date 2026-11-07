import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createMemoryStore } from '../bridge/memory.mjs'

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'jarvis-memory-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  return { directory, store: createMemoryStore({ filePath: join(directory, 'nested', 'memories.json') }) }
}

test('starts empty and persists approved memories across store instances', async (t) => {
  const { directory, store } = await fixture(t)
  assert.deepEqual(await store.list(), [])
  const saved = await store.save({ content: 'Prefers concise answers', tags: ['Preference'] })
  const reopened = createMemoryStore({ filePath: join(directory, 'nested', 'memories.json') })
  assert.deepEqual(await reopened.list(), [saved])
  const file = await stat(join(directory, 'nested', 'memories.json'))
  assert.equal(file.mode & 0o077, 0)
})

test('search ranks content and tag matches', async (t) => {
  const { store } = await fixture(t)
  await store.save({ content: 'Lives in Ireland', tags: ['location'] })
  await store.save({ content: 'Prefers concise answers', tags: ['writing', 'preference'] })
  const results = await store.search('preference concise')
  assert.equal(results.length, 1)
  assert.equal(results[0].content, 'Prefers concise answers')
})

test('updates and deletes records by id', async (t) => {
  const { store } = await fixture(t)
  const saved = await store.save({ content: 'Old fact' })
  const updated = await store.update(saved.id, { content: 'Corrected fact', tags: ['corrected'] })
  assert.equal(updated.content, 'Corrected fact')
  assert.deepEqual(updated.tags, ['corrected'])
  assert.equal(await store.delete(saved.id), true)
  assert.equal(await store.delete(saved.id), false)
  assert.deepEqual(await store.list(), [])
})

test('rejects secrets and oversized content', async (t) => {
  const { store } = await fixture(t)
  await assert.rejects(store.save({ content: 'api_key=super-secret-value' }), /secret/)
  await assert.rejects(store.save({ content: 'x'.repeat(2001) }), /at most/)
  assert.deepEqual(await store.list(), [])
})

test('does not overwrite a corrupt memory file', async (t) => {
  const { directory, store } = await fixture(t)
  const path = join(directory, 'nested', 'memories.json')
  await store.save({ content: 'A valid memory' })
  await (await import('node:fs/promises')).writeFile(path, '{broken', 'utf8')
  await assert.rejects(store.save({ content: 'Another memory' }), /valid JSON/)
  assert.equal(await readFile(path, 'utf8'), '{broken')
})

test('serializes concurrent writes without losing records', async (t) => {
  const { store } = await fixture(t)
  await Promise.all(Array.from({ length: 12 }, (_, index) =>
    store.save({ content: `Fact number ${index}` })))
  assert.equal((await store.list()).length, 12)
})
