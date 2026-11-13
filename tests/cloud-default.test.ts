import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BACKEND, USE_ELEVENLABS, env, activeServers, MCP_SERVERS } from '../src/config'
import { ask, cancel, connectedLabels, isConnected, usingBridge, warm } from '../src/lib/brain'

test('production default is cloud and does not start the local bridge', async () => {
  assert.equal(BACKEND, 'cloud')
  assert.equal(usingBridge, false)
  assert.equal(USE_ELEVENLABS, false)
  assert.equal(env.anthropicKey, '')
  assert.equal(env.elevenKey, '')
  assert.equal(isConnected(), false)
  assert.deepEqual(connectedLabels(), [])

  // A cloud-mode boot must not attempt a localhost bridge or provider call.
  await warm()
  cancel()
})

test('cloud mode refuses unauthenticated turns instead of falling back locally', async () => {
  await assert.rejects(
    ask('Hello', [], { onText: () => {}, onTool: () => {} }),
    /Cloud sign-in required/,
  )
})


test('cloud builds never activate demo MCP endpoints or expose their credentials', () => {
  assert.deepEqual(activeServers(), [])
  assert.equal(MCP_SERVERS.every((server) => !server.enabled && !server.token), true)
  assert.equal(MCP_SERVERS.filter((server) => ['zapier', 'pipedream', 'home'].includes(server.name))
    .every((server) => server.url === ''), true)
})
