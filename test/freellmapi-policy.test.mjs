import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir, homedir } from 'node:os'
import { fileRoots } from '../bridge/policy.mjs'
import { createFreeLlmMcpAuthorizer } from '../bridge/freellmapi-policy.mjs'

const workspace = mkdtempSync(join(tmpdir(), 'jarvis-freellmapi-policy-'))
const authorize = createFreeLlmMcpAuthorizer({
  cwd: workspace,
  roots: fileRoots({ workspace }),
})

test('reuses existing read-only MCP decisions', () => {
  assert.equal(authorize('mcp__notes__list_notes', {}).allow, true)
  assert.equal(authorize('mcp__notes__delete_note', {}).allow, false)
})

test('reuses existing workspace and credential path restrictions', () => {
  const inside = join(workspace, 'note.txt')
  writeFileSync(inside, 'safe')
  assert.equal(authorize('Read', { file_path: inside }).allow, true)
  assert.equal(authorize('Read', { file_path: join(homedir(), '.ssh', 'id_ed25519') }).allow, false)
})

test('write access only changes the existing write policy', () => {
  const write = createFreeLlmMcpAuthorizer({
    allowWrites: true,
    cwd: workspace,
    roots: fileRoots({ workspace }),
  })
  assert.equal(write('mcp__notes__delete_note', {}).allow, true)
})
