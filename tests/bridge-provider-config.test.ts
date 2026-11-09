import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveBridgeProvider } from '../bridge/provider-config.mjs'

test('Claude Code remains the default local provider', () => {
  const result = resolveBridgeProvider({})
  assert.equal(result.provider, 'claude')
  assert.equal(result.model, 'claude-opus-5')
  assert.equal(result.effort, 'high')
  assert.equal(result.sdkEnv, undefined)
})

test('FreeLLMAPI uses its Anthropic-compatible local endpoint and auto model', () => {
  const result = resolveBridgeProvider({
    JARVIS_PROVIDER: 'freellmapi',
    FREELLMAPI_API_KEY: 'freellmapi-test-key',
  })
  assert.equal(result.provider, 'freellmapi')
  assert.equal(result.model, 'auto')
  assert.equal(result.effort, undefined)
  assert.equal(result.sdkEnv.ANTHROPIC_BASE_URL, 'http://127.0.0.1:3001')
  assert.equal(result.sdkEnv.ANTHROPIC_API_KEY, 'freellmapi-test-key')
  assert.equal(result.sdkEnv.ANTHROPIC_MODEL, 'auto')
})

test('FreeLLMAPI accepts explicit loopback endpoint and model', () => {
  const result = resolveBridgeProvider({
    JARVIS_PROVIDER: 'FREELLMAPI',
    FREELLMAPI_BASE_URL: 'http://localhost:3001/',
    FREELLMAPI_API_KEY: 'local-key',
    FREELLMAPI_MODEL: 'auto:fast',
  })
  assert.equal(result.sdkEnv.ANTHROPIC_BASE_URL, 'http://localhost:3001')
  assert.equal(result.model, 'auto:fast')
})

test('FreeLLMAPI requires a local API key', () => {
  assert.throws(
    () => resolveBridgeProvider({ JARVIS_PROVIDER: 'freellmapi' }),
    /FREELLMAPI_API_KEY is required/,
  )
})

test('FreeLLMAPI refuses remote hosts even when HTTPS is used', () => {
  assert.throws(
    () => resolveBridgeProvider({
      JARVIS_PROVIDER: 'freellmapi',
      FREELLMAPI_BASE_URL: 'https://gateway.example.com',
      FREELLMAPI_API_KEY: 'must-not-leak',
    }),
    /loopback URL/,
  )
})

test('FreeLLMAPI refuses URL credentials, paths, queries and fragments', () => {
  for (const url of [
    'http://user:pass@127.0.0.1:3001',
    'http://127.0.0.1:3001/v1',
    'http://127.0.0.1:3001?token=x',
    'http://127.0.0.1:3001#fragment',
  ]) {
    assert.throws(
      () => resolveBridgeProvider({
        JARVIS_PROVIDER: 'freellmapi',
        FREELLMAPI_BASE_URL: url,
        FREELLMAPI_API_KEY: 'local-key',
      }),
      /loopback URL/,
    )
  }
})

test('unknown provider fails closed', () => {
  assert.throws(
    () => resolveBridgeProvider({ JARVIS_PROVIDER: 'some-provider' }),
    /must be either/,
  )
})
