import {
  isSafeAutoMemoryContent,
  isSafeAutoMemorySource,
  mergeSemanticMemoryPreferences,
  normalizeSemanticMemoryLimit,
  normalizeSemanticMemoryQuery,
  parseAutoMemoryCandidates,
  parseSemanticMemoryCandidate,
  parseSemanticMemorySearch,
} from './semantic-memory.ts'

function equal(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)
}

Deno.test('preview memory search input is normalized and bounded', () => {
  equal(normalizeSemanticMemoryQuery('  Jarvis   project\n'), 'Jarvis project', 'query normalization')
  equal(normalizeSemanticMemoryQuery('x'), null, 'short query')
  equal(normalizeSemanticMemoryLimit('99'), 20, 'limit cap')
  const parsed = parseSemanticMemorySearch(new URL('https://jarvis.test/search?q=project+notes&limit=4'))
  equal(parsed?.query, 'project notes', 'parsed query')
  equal(parsed?.limit, 4, 'parsed limit')
})

Deno.test('preview candidate parser rejects invalid types and malformed provenance', () => {
  equal(parseSemanticMemoryCandidate({ version: 1, factType: 'credential', content: 'secret' }), null, 'unsupported fact type')
  equal(parseSemanticMemoryCandidate({
    version: 1,
    factType: 'fact',
    content: 'A useful stable fact',
    sourceMessageIds: ['not-a-uuid'],
  }), null, 'invalid message provenance')
})

Deno.test('preview automatic capture excludes sensitive, family, contact, address and date data', () => {
  equal(isSafeAutoMemorySource('Prefers concise project updates'), true, 'ordinary preference')
  equal(isSafeAutoMemorySource('My bank account balance is private'), false, 'financial data')
  equal(isSafeAutoMemorySource('My medical diagnosis is private'), false, 'health data')
  equal(isSafeAutoMemorySource('Contact me at person@example.com'), false, 'email')
  equal(isSafeAutoMemorySource('Call me at +353 87 123 4567'), false, 'phone')
  equal(isSafeAutoMemorySource('My home is 10 Main Street'), false, 'street address')
  equal(isSafeAutoMemorySource('My Eircode is D02 X285'), false, 'Eircode')
  equal(isSafeAutoMemorySource('My date of birth is 21/08/1992'), false, 'date of birth')
  equal(isSafeAutoMemorySource('My wife prefers quiet holidays'), false, 'family member')
  equal(isSafeAutoMemoryContent('My wife prefers quiet holidays'), false, 'candidate family detail')
})

Deno.test('preview extraction returns only unique safe pending candidates with provenance', () => {
  const conversationId = '123e4567-e89b-42d3-a456-426614174000'
  const messageIds = [
    '123e4567-e89b-42d3-a456-426614174001',
    '123e4567-e89b-42d3-a456-426614174002',
  ]
  const candidates = parseAutoMemoryCandidates({
    candidates: [
      { factType: 'preference', content: 'Prefers concise project status updates' },
      { factType: 'preference', content: 'Prefers concise project status updates' },
      { factType: 'fact', content: 'My bank account balance is private' },
      { factType: 'fact', content: 'My wife prefers quiet holidays' },
      { factType: 'goal', content: 'Wants to finish the Jarvis integration project' },
    ],
  }, conversationId, messageIds)
  equal(candidates.length, 2, 'safe unique candidate count')
  equal(candidates[0].sourceConversationId, conversationId, 'conversation provenance')
  equal(candidates[0].sourceMessageIds.length, 2, 'message provenance')
})

Deno.test('preview auto-capture consent cannot bypass retrieval consent', () => {
  const disabled = mergeSemanticMemoryPreferences(
    { contextEnabled: true, autoCaptureEnabled: true },
    { contextEnabled: false },
  )
  equal(disabled.contextEnabled, false, 'retrieval disabled')
  equal(disabled.autoCaptureEnabled, false, 'capture disabled')
})
