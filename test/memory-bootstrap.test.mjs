import test from 'node:test'
import assert from 'node:assert/strict'
import { loadMemoryRuntime } from '../bridge/memory-bootstrap.mjs'

test('memory runtime remains disabled unless explicitly enabled', async () => {
  assert.equal(await loadMemoryRuntime({ env: {}, home: '/tmp/jarvis-memory-test' }), null)
  assert.equal(
    await loadMemoryRuntime({
      env: { JARVIS_MEMORY_ENABLED: '0' },
      home: '/tmp/jarvis-memory-test',
    }),
    null,
  )
})

test('enabled memory runtime fails closed without an OS-vault adapter path', async () => {
  await assert.rejects(
    () => loadMemoryRuntime({
      env: { JARVIS_MEMORY_ENABLED: '1' },
      home: '/tmp/jarvis-memory-test',
    }),
    /requires JARVIS_MEMORY_VAULT_MODULE/,
  )
})

test('enabled memory runtime rejects relative adapter paths', async () => {
  await assert.rejects(
    () => loadMemoryRuntime({
      env: {
        JARVIS_MEMORY_ENABLED: '1',
        JARVIS_MEMORY_VAULT_MODULE: './vault.mjs',
      },
      home: '/tmp/jarvis-memory-test',
    }),
    /must be an absolute local file path/,
  )
})

test('enabled memory runtime rejects an adapter without createVault', async () => {
  await assert.rejects(
    () => loadMemoryRuntime({
      env: {
        JARVIS_MEMORY_ENABLED: '1',
        JARVIS_MEMORY_VAULT_MODULE: '/definitely/not/a/jarvis-vault-adapter.mjs',
      },
      home: '/tmp/jarvis-memory-test',
    }),
  )
})
