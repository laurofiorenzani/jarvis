# JARVIS action approval lifecycle

Status: design contract; not implemented yet.
Owner: JARVIS bridge + browser HUD.
Release gate: do not enable broad writes until all tests below pass.

## Objective

Allow JARVIS to complete routine, explicitly pre-authorised reversible work without interrupting the user, while requiring a clear one-click decision for consequential actions. The approval mechanism is enforced by the local bridge, not by model instructions.

## Threat model

Treat model output, MCP tool names/descriptions, tool arguments, browser messages and reconnecting clients as untrusted. An approval authorises one exact invocation only. Never infer approval from speech, a prior approval, a user being logged in, or a generic "autonomy" preference.

## Risk classes

- READ: no external or persistent side effect; run under existing read/path/network controls.
- ROUTINE: low-impact, reversible, explicitly pre-authorised action with a narrow allow-rule (specific provider, object scope, action, limits and expiry). Run without a prompt only while the rule is valid.
- APPROVAL_REQUIRED: external communication, device state changes outside a pre-authorised routine, file writes outside a disposable workspace, purchases, payments, trades, bookings, deletion, publication, credential/security changes, account changes, production deployments, or any uncertain effect.
- DENY: unsafe/unsupported action, policy violation, invalid arguments, no active authenticated owner session, missing approval UI, policy timeout, or risk cannot be classified.

Unknown tools and unknown verbs are APPROVAL_REQUIRED at minimum; unsupported high-impact operations are DENY. No blanket allow based on a tool server name. Validate tool arguments against a provider-specific schema before presenting them.

## Approval request envelope

```ts
type ApprovalRequest = {
  version: 1
  id: string                 // cryptographically random, single use
  sessionId: string          // current authenticated account + bridge session
  toolUseId: string          // exact SDK tool invocation
  toolName: string
  risk: 'approval_required'
  title: string
  target: string             // human-readable provider/object
  impact: string             // concise plain-language effect
  argumentsDigest: string    // SHA-256 over canonical validated arguments
  expiresAt: number          // short TTL, e.g. 60 seconds
}
type ApprovalDecision = {
  version: 1
  id: string
  sessionId: string
  toolUseId: string
  argumentsDigest: string
  decision: 'approve' | 'reject'
}
```

Do not expose secrets, access tokens, full message bodies, private file contents or unnecessary personal data in the card. Show the user enough information to understand the exact effect, destination, amount/object and reversibility. For communication, show recipient and final message preview. For money, show provider, account, amount, currency and destination.

## Lifecycle

1. PreToolUse validates tool name and full arguments, checks account/session ownership and existing policy, and classifies the action.
2. For APPROVAL_REQUIRED, the bridge creates a nonce-bound request and sends it only to the active authenticated client. The SDK hook remains pending; the tool has not run.
3. The HUD renders an explicit approval card with Approve and Reject. Neither voice transcription nor model-generated text can trigger the decision.
4. The browser returns a decision envelope. The bridge verifies exact request ID, session, toolUseId, argumentsDigest, expiry, pending state and single-use status.
5. Approve allows only that exact invocation; Reject denies it. Missing UI, disconnect, account switch, timeout, malformed message, duplicate/replayed response or mismatched digest denies by default.
6. Resolve pending promises on interruption, socket close, session shutdown and process termination. Never leave a tool hanging.
7. Record an audit event with request ID, account ID, tool name, risk class, decision, timestamp and outcome. Redact secrets and sensitive payloads. Provide an account-scoped history and retention policy.

## Pre-authorisation

A separate settings surface may define narrow routine rules. Each rule must include provider, exact action, object/account scope, quantitative limits where applicable, time window/expiry, and revocation. Rules are opt-in and account-specific. No rule may authorise transfers, trades, external messages, purchases, destructive changes, credentials/security changes, or production releases. These always require a fresh explicit approval.

## UI requirements

- Approval card is visible, accessible by keyboard and usable on iPhone.
- Clearly state that the action has not happened yet.
- Display exact target, effect, amount/content summary and reversibility.
- Approve and Reject are separate, equally clear actions; no default focus on Approve.
- Show expiry and a terminal result; remove the card after resolution.
- If there is no connected UI, deny rather than falling back to spoken confirmation.
- A pending card is cleared on account switch and cannot be approved from another account.

## Test and release gates

### Unit
- canonical argument digest stable across object key ordering
- malformed / unsupported argument schemas denied
- each risk class and unknown tool behavior
- expiry, duplicate, replay, wrong session, wrong toolUseId, wrong digest
- disconnect, interrupt, process shutdown and timeout all deny and settle
- approval for call A cannot authorise call B, even with same tool name

### Integration
- real PreToolUse hook pauses before side effect
- one-click approval resumes exactly one invocation
- reject and timeout never invoke provider
- reconnect/account switch invalidates old pending approvals
- audit event is emitted without secrets

### End-to-end
- desktop and iPhone HUD display the same request correctly
- keyboard and touch approve/reject
- no UI, no connection and stale page all fail closed
- test representative provider operations with mocked adapters before live provider actions

## Implementation sequence

1. Add pure risk classification, canonical argument hashing and unit tests.
2. Add bridge pending-request registry, expiry, one-shot resolver and fail-closed cleanup tests.
3. Add versioned WebSocket request/decision protocol and strict envelope validation.
4. Add accessible HUD approval card and account-switch handling.
5. Add mocked end-to-end tests and audit history.
6. Add narrowly scoped opt-in pre-authorisation rules.
7. Only after all gates pass, enable selected low-risk routines. Keep the emergency global write-disable and rollback path.

## Current state

The bridge currently uses a global `JARVIS_ALLOW_WRITES=1` / `--writes` gate and PreToolUse policy. This design is not yet implemented. Do not claim that per-action approvals or autonomous write execution are available until the release gates pass.
