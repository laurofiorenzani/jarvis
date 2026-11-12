import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('PWA manifest declares an installable standalone app', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'),
  )
  assert.equal(manifest.name, 'J.A.R.V.I.S. Personal Cloud Assistant')
  assert.equal(manifest.short_name, 'JARVIS')
  assert.equal(manifest.start_url, '/')
  assert.equal(manifest.scope, '/')
  assert.equal(manifest.display, 'standalone')
  assert.ok(manifest.icons.some((icon) => icon.src === '/favicon.svg'))
})

test('PWA service worker caches only the app shell and same-origin hashed assets', async () => {
  const worker = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')
  assert.match(worker, /url\.origin !== self\.location\.origin/)
  assert.match(worker, /url\.pathname\.startsWith\('\/assets\/'\)/)
  assert.match(worker, /request\.mode === 'navigate'/)
  assert.doesNotMatch(worker, /supabase\.co|\/functions\/v1|\/auth\/v1/)
})

test('production entry point registers the PWA service worker', async () => {
  const entry = await readFile(new URL('../src/main.tsx', import.meta.url), 'utf8')
  assert.match(entry, /import\.meta\.env\.PROD/)
  assert.match(entry, /navigator\.serviceWorker\.register\('\/sw\.js'\)/)
})
