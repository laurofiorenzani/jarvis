import test from 'node:test'
import assert from 'node:assert/strict'
import { loadMemoryRuntime } from '../bridge/memory-bootstrap.mjs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

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


test('memory runtime enforces a single writer and releases its lock cleanly', async () => {
  const home = await mkdtemp(join(tmpdir(), 'jarvis-memory-lock-'))
  const adapterPath = fileURLToPath(new URL('./fixtures/memory-vault-adapter.mjs', import.meta.url))
  const env = {
    JARVIS_MEMORY_ENABLED: '1',
    JARVIS_MEMORY_VAULT_MODULE: adapterPath,
  }
  let runtime
  try {
    runtime = await loadMemoryRuntime({ env, home })
    assert.equal(typeof runtime.close, 'function')
    await assert.rejects(
      () => loadMemoryRuntime({ env, home }),
      /already locked by another process or a stale lock/,
    )

    runtime.close()
    runtime = await loadMemoryRuntime({ env, home })
    assert.ok(runtime.store)
  } finally {
    runtime?.close()
    await rm(home, { recursive: true, force: true })
  }
})
