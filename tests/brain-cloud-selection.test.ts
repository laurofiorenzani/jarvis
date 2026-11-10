import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ask,
  cancel,
  connectedLabels,
  selectCloudBrain,
  selectConfiguredBrain,
  warm,
} from '../src/lib/brain'
import type { CloudBrain } from '../src/lib/cloud-brain'

test('HUD routes turns and lifecycle to the selected cloud brain', async () => {
  const events: string[] = []
  const cloud = {
    async warm() { events.push('warm') },
    async ask(prompt: string, _history: unknown[], handlers: { onText: (text: string) => void; onTool: (name: string) => void }) {
      events.push(`ask:${prompt}`)
      handlers.onText('cloud reply')
      return { text: 'cloud reply', tools: [] }
    },
    cancel() { events.push('cancel') },
    getConversationId() { return 'conversation-test' },
    resetConversation() {},
  } as unknown as CloudBrain

  selectCloudBrain(cloud)
  try {
    await warm()
    const result = await ask('hello cloud', [], { onText: () => {}, onTool: () => {} })
    cancel()
    assert.equal(result.text, 'cloud reply')
    assert.deepEqual(events, ['warm', 'ask:hello cloud', 'cancel'])
    assert.deepEqual(connectedLabels(), ['SUPABASE CLOUD'])
  } finally {
    selectConfiguredBrain()
  }
})


test('signing out cancels an active cloud turn before restoring the configured backend', () => {
  const events: string[] = []
  const cloud = {
    async warm() {},
    async ask() { return { text: '', tools: [] } },
    cancel() { events.push('cancel') },
    getConversationId() { return null },
    resetConversation() {},
  } as unknown as CloudBrain

  selectCloudBrain(cloud)
  selectConfiguredBrain()
  assert.deepEqual(events, ['cancel'])
  assert.deepEqual(connectedLabels(), ['CLOUD SIGN-IN REQUIRED'])
})
