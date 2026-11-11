import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeSemanticMemoryLimit,
  normalizeSemanticMemoryQuery,
  parseSemanticMemorySearch,
} from '../supabase/functions/jarvis-api/semantic-memory.ts'

test('normalizes and bounds semantic memory queries', () => {
  assert.equal(normalizeSemanticMemoryQuery('  BMW   climate  '), 'BMW climate')
  assert.equal(normalizeSemanticMemoryQuery('x'), null)
  assert.equal(normalizeSemanticMemoryQuery(null), null)
  assert.equal(normalizeSemanticMemoryQuery('a\u0000b'), 'a b')
  assert.equal(normalizeSemanticMemoryQuery('a'.repeat(200)), 'a'.repeat(160))
})

test('clamps semantic memory result limits', () => {
  assert.equal(normalizeSemanticMemoryLimit(null), 8)
  assert.equal(normalizeSemanticMemoryLimit('0'), 1)
  assert.equal(normalizeSemanticMemoryLimit('999'), 20)
  assert.equal(normalizeSemanticMemoryLimit('not-a-number'), 8)
})

test('parses a bounded search request', () => {
  const parsed = parseSemanticMemorySearch(new URL('https://jarvis.test/semantic-memory/search?q=Family%20CFO&limit=5'))
  assert.deepEqual(parsed, { query: 'Family CFO', limit: 5 })
  assert.equal(parseSemanticMemorySearch(new URL('https://jarvis.test/semantic-memory/search?q=x')), null)
})
