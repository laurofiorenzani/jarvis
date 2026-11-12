# Hybrid brain architecture — design before integration

Status: design only; the cloud test console is not the main JARVIS brain yet.

## Current state

- `src/lib/brain.ts` selects exactly one backend: `bridge` or `direct`.
- The bridge is the local action/tool plane. It owns the Claude Agent SDK session, configured MCP servers, camera requests, UI push events, panels/blades, and the existing tool permission gate.
- The direct backend is a one-shot browser-to-model path and has no bridge tool or UI push channel.
- The authenticated Supabase Cloud API is a separate test console. It streams text, persists account-scoped conversations, retrieves approved memory, and can create pending memory suggestions after explicit per-account opt-in.
- Do not replace the bridge with cloud text streaming. That would remove MCP tools, camera capture, UI events, panels/blades, and the current cancellation/fallback behavior.

## Target responsibility split

1. **Cloud model plane:** authenticated conversation, approved-memory retrieval, reasoning, response synthesis, and a structured action plan when local capabilities are needed.
2. **Local action plane:** bridge session and MCP tools, camera capture, browser/device integrations, UI events, panels/blades, and the existing default-deny permission gate.
3. **Browser orchestrator:** owns the user-visible turn, routes work between the two planes, forwards tool progress, joins results, and cancels both sides on barge-in.

The cloud API must never receive local MCP credentials or provider secrets. The browser sends only the Supabase user access token to the cloud API and uses the existing local bridge connection for actions.

## Proposed turn flow

1. The browser starts a cloud turn using the signed-in account's access token and the current cloud conversation ID.
2. The cloud model either streams a normal answer or emits a typed `action.plan` event. A plan describes the requested outcome, constraints, and read/write intent; it does not contain credentials.
3. The browser sends the plan to the local bridge as a bounded execution request. The bridge's agent chooses configured MCP tools and remains subject to `decideTool()` and `PreToolUse`.
4. The bridge streams its existing `onTool`, `onText`, camera, UI, panel, and blade events. The browser forwards only the final tool result summary to the cloud turn.
5. The cloud model synthesizes a final response. The browser speaks it through the existing TTS pipeline.
6. Barge-in cancels the cloud stream and the active bridge request. Stale callbacks are ignored using the existing monotonic turn ID/generation guards.

## Required API and client changes

- Extend `CloudTurnEvent` with a versioned, schema-validated `action.plan` event. Unknown event types must be ignored safely or fail closed; never execute arbitrary model-authored code.
- Add an authenticated endpoint for submitting a bounded local-action result to the existing cloud turn. Validate conversation ownership from the bearer token and turn ownership server-side.
- Keep model provider keys and service-role keys server-side.
- Add a typed bridge request/response path for a single bounded plan. Do not expose raw shell, arbitrary MCP tool names, or credential-bearing tool configuration to the browser.
- Keep `src/lib/brain.ts` as the single interface consumed by `App.tsx`. Add an explicit `hybrid` backend only after the orchestrator can preserve all existing bridge handlers.
- Preserve bridge-originated `watchPanels`, `watchBlades`, `watchUi`, `watchCapture`, server status, and tool progress in hybrid mode.
- Keep approved-memory retrieval and pending-only automatic capture scoped to the authenticated cloud account. Local bridge transcripts must not silently become cloud memory.

## Account and security boundaries

- A cloud account switch cancels both planes, clears the previous cloud conversation ID and all account-scoped UI state, and prevents late responses from either account updating the new session.
- The local bridge session must not be treated as the user's cloud identity. If the bridge is shared between household accounts, either isolate bridge sessions/workspaces per account or clear the session at account switch before enabling hybrid mode.
- The cloud API derives `user_id` from the validated Supabase bearer token. Never accept a browser-supplied user ID as an ownership boundary.
- The bridge remains default-deny for effectful tools. Cloud action plans cannot bypass the bridge permission gate.
- Voice-triggered writes, sending messages, deleting files, changing device state, or spending money require explicit confirmation through a UI control, not an inferred approval from the model.
- Sensitive facts stay excluded from automatic memory extraction; all extracted facts remain pending until the account owner approves them.

## Fallback semantics

- If the cloud provider is unavailable or rate-limited, route the whole turn to the bridge if it is connected. Do not leave half a cloud turn active while the bridge starts another.
- If the bridge is unavailable, cloud may answer informational questions but must say that local actions are unavailable. Never claim an action was executed.
- If a tool plan fails, send the structured failure summary to the cloud model for recovery or a clear explanation. Do not silently retry effectful actions.
- Cancellation must stop both streams and release readers/controllers; no stale result may be spoken after barge-in.

## Release gates

1. Contract tests for every cloud event and malformed/unknown event handling.
2. Unit tests for plan validation, size limits, allowed intent classes, and account ownership.
3. Integration tests for cloud -> bridge -> cloud result round-trip using a fake read-only MCP tool.
4. Tests proving write-capable tools remain denied unless the bridge's existing explicit writes mode and user confirmation are both present.
5. Tests for cancellation at every stage: cloud stream, bridge tool execution, result submission, and final synthesis.
6. Two-account browser E2E: account A cannot see account B conversations, memory, preferences, plans, or results after switching while requests are in flight.
7. Browser E2E for microphone barge-in, panels/blades, camera capture, and UI events.
8. Provider outage and 429 fallback tests.
9. Only after all gates pass, make hybrid the default. Keep the bridge-only mode available as a rollback.

## Non-goals for the first hybrid release

- Replacing the bridge agent with direct browser-side tool execution.
- Exposing arbitrary MCP schemas or credentials to the cloud provider.
- Automatically approving memory facts.
- Automatically enabling memory for the wife's account.
- Claiming BMW, Blink, Dreame, email, or messaging integrations are connected until each has a real authenticated end-to-end test.
