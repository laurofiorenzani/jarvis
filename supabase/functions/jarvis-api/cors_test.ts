import { getPublicHealthPreflightHeaders } from './cors.ts'

Deno.test('public health preflight permits the regional x-region header', () => {
  const headers = new Headers(getPublicHealthPreflightHeaders())
  const allowed = (headers.get('Access-Control-Allow-Headers') || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
  if (!allowed.includes('x-region')) {
    throw new Error('public health preflight must allow x-region')
  }
})

Deno.test('public health preflight remains limited to GET and OPTIONS', () => {
  const headers = new Headers(getPublicHealthPreflightHeaders())
  if (headers.get('Access-Control-Allow-Methods') !== 'GET, OPTIONS') {
    throw new Error('public health preflight methods were broadened')
  }
  if (headers.get('Access-Control-Allow-Origin') !== '*') {
    throw new Error('public health endpoint must remain non-sensitive and CORS-readable')
  }
})
