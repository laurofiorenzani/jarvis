import { countSpeechCandidates, extractSpeechTranscript } from './speech-transcript.ts'

Deno.test('extracts and joins transcript text from provider parts', () => {
  const actual = extractSpeechTranscript({
    candidates: [{ content: { parts: [{ text: 'Jarvis, ' }, { text: 'bom dia.' }] } }],
  })
  if (actual !== 'Jarvis, bom dia.') throw new Error('provider transcript parts were not joined')
})

Deno.test('returns empty for missing or malformed provider candidates', () => {
  for (const payload of [null, {}, { candidates: [] }, { candidates: [{}] }, { candidates: [{ content: {} }] }]) {
    if (extractSpeechTranscript(payload) !== '') throw new Error('malformed provider response produced a transcript')
  }
})

Deno.test('ignores non-text parts and trims whitespace', () => {
  const actual = extractSpeechTranscript({
    candidates: [{ content: { parts: [{ inlineData: { data: 'private-audio' } }, { text: '  hello  ' }] } }],
  })
  if (actual !== 'hello') throw new Error('transcript was not safely normalised')
})

Deno.test('counts candidates without logging transcript or audio content', () => {
  if (countSpeechCandidates({ candidates: [{}, {}] }) !== 2) throw new Error('candidate count mismatch')
  if (countSpeechCandidates({}) !== 0) throw new Error('missing candidate count should be zero')
})
