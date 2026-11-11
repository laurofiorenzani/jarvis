import test from 'node:test'
import assert from 'node:assert/strict'
import { getSafeConfirmationUrl } from '../src/lib/email-confirmation-url.ts'

function confirmation(type = 'invite', origin = 'https://undmhmdwhxvjgvezvucy.supabase.co', redirectTo = 'https://jarvis-lauro-fiorenzani.vercel.app/') {
  const url = new URL('/auth/v1/verify', origin)
  url.searchParams.set('token', 'one-time-token')
  url.searchParams.set('type', type)
  url.searchParams.set('redirect_to', redirectTo)
  return url.toString()
}

test('accepts invite and recovery links only for the Jarvis Supabase project and app origin', () => {
  for (const type of ['invite', 'recovery', 'signup']) {
    const raw = confirmation(type)
    assert.equal(getSafeConfirmationUrl(raw), raw)
  }
})

test('rejects links from an untrusted host or endpoint', () => {
  assert.equal(getSafeConfirmationUrl(confirmation('invite', 'https://attacker.example')), null)
  assert.equal(getSafeConfirmationUrl('https://undmhmdwhxvjgvezvucy.supabase.co/other?token=x&type=invite&redirect_to=https%3A%2F%2Fjarvis-lauro-fiorenzani.vercel.app'), null)
})

test('accepts the exact stable integration preview origin', () => {
  const preview = 'https://jarvis-git-work-memory-integration-ready-lauro-fiorenzani.vercel.app/'
  const raw = confirmation('signup', undefined, preview)
  assert.equal(getSafeConfirmationUrl(raw), raw)
})

test('rejects an unexpected redirect origin and Vercel lookalike subdomains', () => {
  assert.equal(getSafeConfirmationUrl(confirmation('invite', undefined, 'https://attacker.example/')), null)
  assert.equal(getSafeConfirmationUrl(confirmation('invite', undefined, 'https://jarvis-lauro-fiorenzani.vercel.app.attacker.example/')), null)
  assert.equal(getSafeConfirmationUrl(confirmation('invite', undefined, 'https://jarvis-git-other-branch-lauro-fiorenzani.vercel.app/')), null)
})

test('rejects unsupported types, missing tokens, and malformed values', () => {
  assert.equal(getSafeConfirmationUrl(confirmation('magiclink')), null)
  const missingToken = new URL(confirmation())
  missingToken.searchParams.delete('token')
  assert.equal(getSafeConfirmationUrl(missingToken.toString()), null)
  assert.equal(getSafeConfirmationUrl('not a URL'), null)
  assert.equal(getSafeConfirmationUrl(null), null)
})
