// Explicit opt-in entrypoint. The ordinary bridge remains memory-disabled.
if (process.env.JARVIS_MEMORY_ENABLED && process.env.JARVIS_MEMORY_ENABLED !== '1') {
  throw new Error('JARVIS_MEMORY_ENABLED must be unset or exactly "1"')
}
process.env.JARVIS_MEMORY_ENABLED = '1'
await import('../bridge/server.mjs')
