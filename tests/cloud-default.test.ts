import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BACKEND, USE_ELEVENLABS, env, activeServers } from '../src/config'
import { ask, cancel, connectedLabels, isConnected, usingBridge, usingDirect, warm } from '../src/lib/brain'

test('production default is cloud and does not start the local bridge', async () => {
  assert.equal(BACKEND, 'cloud')
  assert.equal(usingBridge, false)
  assert.equal(usingDirect, false)
  assert.equal(USE_ELEVENLABS, false)
  assert.equal(env.anthropicKey, '')
  assert.equal(env.elevenKey, '')
  assert.equal(isConnected(), false)
  assert.deepEqual(connectedLabels(), ['CLOUD SIGN-IN REQUIRED'])

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


test('cloud builds never activate demo MCP endpoints or credentials', () => {
  assert.deepEqual(activeServers(), [])
})
