import test from 'node:test'
import assert from 'node:assert/strict'

test('Kokoro TTS remains importable with the patched Transformers.js runtime', async () => {
  const kokoro = await import('kokoro-js')
  assert.equal(typeof kokoro.KokoroTTS, 'function')
  assert.equal(typeof kokoro.TextSplitterStream, 'function')
  assert.equal(typeof kokoro.KokoroTTS.from_pretrained, 'function')
})
