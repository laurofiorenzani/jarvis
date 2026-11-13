import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveBridgeProvider } from '../bridge/provider-config.mjs'

test('FreeLLMAPI is the only default local provider and requires an explicit key', () => {
  assert.throws(() => resolveBridgeProvider({}), /FREELLMAPI_API_KEY is required/)
  const result = resolveBridgeProvider({ FREELLMAPI_API_KEY: 'local-test-key' })
  assert.equal(result.provider, 'freellmapi')
  assert.equal(result.model, 'auto')
  assert.equal(result.effort, undefined)
  assert.equal(result.sdkEnv.ANTHROPIC_BASE_URL, 'http://127.0.0.1:3001')
  assert.equal(result.sdkEnv.ANTHROPIC_API_KEY, 'local-test-key')
  assert.equal(result.sdkEnv.ANTHROPIC_MODEL, 'auto')
  assert.equal(result.sdkEnv.ANTHROPIC_AUTH_TOKEN, undefined)
  assert.equal(result.sdkEnv.CLAUDE_CODE_OAUTH_TOKEN, undefined)
  assert.equal(result.sdkEnv.ANTHROPIC_BEDROCK_BASE_URL, undefined)
  assert.equal(result.sdkEnv.CLAUDE_CODE_USE_VERTEX, undefined)
})

test('Claude/Anthropic direct billing fallback is explicitly rejected', () => {
  assert.throws(
    () => resolveBridgeProvider({ JARVIS_PROVIDER: 'claude' }),
    /paid direct providers are disabled/,
  )
})

test('FreeLLMAPI uses its Anthropic-compatible local endpoint and auto model', () => {
  const result = resolveBridgeProvider({
    JARVIS_PROVIDER: 'freellmapi',
    FREELLMAPI_API_KEY: 'freellmapi-test-key',
    ANTHROPIC_AUTH_TOKEN: 'paid-auth-token-must-not-pass',
    CLAUDE_CODE_OAUTH_TOKEN: 'claude-oauth-must-not-pass',
    ANTHROPIC_BEDROCK_BASE_URL: 'https://bedrock.example.com',
    CLAUDE_CODE_USE_VERTEX: '1',
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
    /must be "freellmapi"/,
  )
})
