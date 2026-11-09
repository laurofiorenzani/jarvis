import { appendFile, mkdir } from 'node:fs/promises'
import { rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createMemoryRuntime } from './memory-runtime.mjs'

/**
 * Opt-in process bootstrap for Jarvis's encrypted memory runtime.
 *
 * Windows Credential Manager is the built-in vault; an absolute local
 * adapter module may override it when explicitly configured. There is no
 * environment-variable, plaintext-file, or generated-key fallback. Memory
 * remains off unless the dedicated opt-in launcher is used.
 */
export async function loadMemoryRuntime({
  env = process.env,
  home = homedir(),
  sdk,
  z,
  platform = process.platform,
} = {}) {
  if (env.JARVIS_MEMORY_ENABLED !== '1') return null

  const adapterPath = env.JARVIS_MEMORY_VAULT_MODULE
  let adapter
  if (typeof adapterPath === 'string' && adapterPath.trim()) {
    if (!isAbsolute(adapterPath.trim())) {
      throw new TypeError('JARVIS_MEMORY_VAULT_MODULE must be an absolute local file path')
    }
    const moduleUrl = pathToFileURL(resolve(adapterPath.trim())).href
    adapter = await import(moduleUrl)
  } else if (platform === 'win32') {
    adapter = await import('./windows-credential-vault.mjs')
  } else {
    throw new Error(
      'JARVIS_MEMORY_ENABLED=1 requires Windows Credential Manager or an explicit JARVIS_MEMORY_VAULT_MODULE adapter',
    )
  }
  if (typeof adapter.createVault !== 'function') {
    throw new TypeError('The memory vault module must export createVault()')
  }
  const vault = await adapter.createVault()
  if (!vault || typeof vault.getSecret !== 'function' ||
      typeof vault.createSecretIfAbsent !== 'function') {
    throw new TypeError('The memory vault adapter does not satisfy the secure-vault contract')
  }

  const directory = join(home, '.jarvis', 'memory')
  await mkdir(directory, { recursive: true, mode: 0o700 })

  // The encrypted JSON store serializes writes within one process. Refuse a
  // second bridge process so two independent in-memory snapshots cannot race
  // to replace the same file. A crash leaves a stale lock intentionally:
  // recovery is manual and fail-closed rather than guessing whether a writer
  // is still alive.
  const lockPath = join(directory, 'memory.writer.lock')
  try {
    await mkdir(lockPath, { mode: 0o700 })
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throw new Error(
        'The Jarvis memory store is already locked by another process or a stale lock; verify no bridge is running before removing memory.writer.lock',
      )
    }
    throw error
  }

  const releaseLock = () => {
    try {
      rmSync(lockPath, { recursive: true, force: true })
    } catch {
      // A leftover lock is safer than allowing a second writer.
    }
  }
  try {
    writeFileSync(
      join(lockPath, 'owner.json'),
      JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
      { encoding: 'utf8', flag: 'wx', mode: 0o600 },
    )
  } catch (error) {
    releaseLock()
    throw new Error('Unable to establish the exclusive Jarvis memory writer lock', { cause: error })
  }

  let released = false
  const release = () => {
    if (released) return
    released = true
    releaseLock()
  }
  process.once('exit', release)

  const auditPath = join(directory, 'audit.jsonl')

  const audit = async (event) => {
    if (!event || !['save', 'update', 'delete'].includes(event.operation) ||
        !(event.memoryId === null || typeof event.memoryId === 'string') ||
        event.outcome !== 'authorized' ||
        typeof event.timestamp !== 'string' ||
        !Number.isFinite(Date.parse(event.timestamp))) {
      throw new TypeError('Invalid metadata-only memory audit event')
    }
    // Construct a fresh allowlisted record; never serialize the handler input.
    const record = {
      operation: event.operation,
      memoryId: event.memoryId,
      outcome: event.outcome,
      timestamp: new Date(event.timestamp).toISOString(),
    }
    await appendFile(auditPath, JSON.stringify(record) + '\n', {
      encoding: 'utf8',
      flag: 'a',
      mode: 0o600,
    })
  }

  try {
    const runtime = await createMemoryRuntime({
      filePath: join(directory, 'memory.enc'),
      vault,
      audit,
      sdk,
      z,
    })
    return Object.freeze({
      ...runtime,
      close() {
        process.removeListener('exit', release)
        release()
      },
    })
  } catch (error) {
    process.removeListener('exit', release)
    release()
    throw error
  }
}
