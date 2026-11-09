import test from 'node:test'
import assert from 'node:assert/strict'
import { runFreeLlmToolLoop } from '../bridge/freellmapi-tool-loop.mjs'

function toolDelta(id, name, args) {
  return { index: 0, id, type: 'function', function: { name, arguments: JSON.stringify(args) } }
}

test('executes authorized tool calls and feeds results back to the model', async () => {
  const requests = []
  let turn = 0
  const client = {
    async streamChat(options) {
      requests.push(options)
      if (turn++ === 0) options.onToolCallDelta(toolDelta('call-1', 'mcp__notes__read', { path: 'a.txt' }))
      else options.onText('The note says hello.')
      return { aborted: false }
    },
  }
  const mcp = {
    tools: [{ type: 'function', function: { name: 'mcp__notes__read', parameters: { type: 'object' } } }],
    async execute(call) { assert.equal(call.function.arguments.path, 'a.txt'); return { content: [{ type: 'text', text: 'hello' }] } },
  }
  const result = await runFreeLlmToolLoop({ client, mcp, messages: [{ role: 'user', content: 'Read it' }] })
  assert.equal(result.rounds, 1)
  assert.equal(result.executed[0].ok, true)
  assert.equal(requests[1].messages.at(-2).content, 'The note says hello.')
  assert.equal(requests[1].messages.at(-1).content, 'The note says hello.')
})

test('returns tool errors to the model without bypassing authorization', async () => {
  let turn = 0
  const client = { async streamChat({ onToolCallDelta }) {
    if (turn++ === 0) onToolCallDelta(toolDelta('call-2', 'mcp__notes__delete', {}))
    return { aborted: false }
  } }
  const mcp = { tools: [], async execute() { throw new Error('denied by policy') } }
  const result = await runFreeLlmToolLoop({ client, mcp, messages: [{ role: 'user', content: 'Delete' }] })
  assert.equal(result.executed[0].ok, false)
  assert.match(result.messages.at(-1).content, /denied by policy/)
})

test('enforces maximum tool rounds', async () => {
  const client = { async streamChat({ onToolCallDelta }) {
    onToolCallDelta(toolDelta('call-3', 'mcp__notes__read', {}))
    return { aborted: false }
  } }
  const mcp = { tools: [], async execute() { return 'ok' } }
  await assert.rejects(runFreeLlmToolLoop({
    client, mcp, messages: [{ role: 'user', content: 'loop' }], maxRounds: 1,
  }), /maximum tool-call rounds/)
})

test('honours aborts without executing pending calls', async () => {
  const controller = new AbortController()
  const client = { async streamChat({ onToolCallDelta }) {
    onToolCallDelta(toolDelta('call-4', 'mcp__notes__read', {}))
    controller.abort()
    return { aborted: false }
  } }
  let called = false
  const mcp = { tools: [], async execute() { called = true } }
  const result = await runFreeLlmToolLoop({
    client, mcp, messages: [{ role: 'user', content: 'stop' }], signal: controller.signal,
  })
  assert.equal(result.aborted, true)
  assert.equal(called, false)
})
