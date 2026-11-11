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


test('accepts only bounded, provenance-shaped explicit memory candidates', async () => {
  const { parseSemanticMemoryCandidate } = await import('../supabase/functions/jarvis-api/semantic-memory.ts')
  const conversationId = '10000000-0000-4000-8000-000000000001'
  const messageId = '20000000-0000-4000-8000-000000000001'
  assert.deepEqual(parseSemanticMemoryCandidate({
    version: 1, factType: 'preference', content: '  Prefers concise answers  ',
    sourceConversationId: conversationId, sourceMessageIds: [messageId],
  }), {
    factType: 'preference', content: 'Prefers concise answers',
    sourceConversationId: conversationId, sourceMessageIds: [messageId],
  })
  assert.equal(parseSemanticMemoryCandidate({ version: 1, factType: 'secret', content: 'x' }), null)
  assert.equal(parseSemanticMemoryCandidate({ version: 1, factType: 'fact', content: '   ' }), null)
  assert.equal(parseSemanticMemoryCandidate({ version: 1, factType: 'fact', content: 'x'.repeat(4001) }), null)
  assert.equal(parseSemanticMemoryCandidate({ version: 1, factType: 'fact', content: 'x', sourceMessageIds: [messageId] }), null)
  assert.equal(parseSemanticMemoryCandidate({ version: 1, factType: 'fact', content: 'x', sourceConversationId: 'not-a-uuid' }), null)
})

test('accepts only explicit approve or reject decisions and UUID candidate IDs', async () => {
  const { parseSemanticMemoryDecision, isSemanticMemoryId } = await import('../supabase/functions/jarvis-api/semantic-memory.ts')
  assert.equal(parseSemanticMemoryDecision({ decision: 'approved' }), 'approved')
  assert.equal(parseSemanticMemoryDecision({ decision: 'rejected' }), 'rejected')
  assert.equal(parseSemanticMemoryDecision({ decision: 'pending' }), null)
  assert.equal(parseSemanticMemoryDecision({ decision: true }), null)
  assert.equal(isSemanticMemoryId('10000000-0000-4000-8000-000000000001'), true)
  assert.equal(isSemanticMemoryId('not-a-uuid'), false)
})
