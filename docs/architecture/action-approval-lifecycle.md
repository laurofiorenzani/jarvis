# JARVIS cloud action-approval lifecycle

Status: required architecture; production tool execution and per-action approvals are not yet implemented.
Authority: `JARVIS_MASTER_RECORD.md`.
**The policy gate runs in the cloud backend, not in a local Windows bridge. JARVIS is the only user-facing assistant. No Apple/Siri Shortcuts or manual workflow hand-offs.**

## Objective

Allow JARVIS to perform explicitly authorised, bounded actions through direct integration adapters while requiring a fresh, understandable approval for consequential effects. Approval is enforced server-side and is bound to one authenticated user, one exact tool invocation and one canonical argument digest.

## Threat model

Treat model output, tool names/descriptions, arguments, emails, web pages, device content, client messages and reconnecting sessions as untrusted. A login or a general request for autonomy is not approval for every future action. An approval authorises one exact invocation only. Prompt injection cannot grant permissions, create pre-authorisation rules or approve actions.

## Risk classes

- **READ** — no external or persistent side effect; allowed only under existing read scopes and provider limits.
- **ROUTINE** — low-impact, reversible action explicitly pre-authorised by a narrow, account-scoped rule (provider, exact capability, object scope, quantitative limit, expiry and revocation). No blanket permission by tool server or vendor.
- **APPROVAL_REQUIRED** — external communications, device-state changes, vehicle access, purchases, payments, bookings, publication, deletion, account/security changes, credential changes, production deployments, irreversible actions, or any uncertain effect.
- **DENY** — unsupported or unsafe action, invalid schema, policy violation, missing/expired identity, unknown owner, policy timeout, missing approval UI, cross-account mismatch, or inability to classify safely.

Unknown tools/verbs are at least APPROVAL_REQUIRED. High-impact unsupported operations are DENY. Validate arguments against a provider-specific schema before presenting an approval card.

## Approval request envelope

A server-generated request contains:
- protocol version and cryptographically random single-use request ID;
- authenticated user ID, session/device ID and conversation ID;
- exact tool invocation ID and capability ID;
- canonical validated argument digest (SHA-256);
- concise human-readable title, target, impact and reversibility;
- created/expiry timestamps and policy version;
- status: pending, approved, rejected, expired, cancelled or executed.

Do not put provider credentials, access tokens, raw private message bodies, or unnecessary personal data into an approval notification. Show enough information to understand the exact effect, destination, amount/object and reversibility. For messages, show recipient and final message preview. For money, show provider, account, amount, currency and destination.

## Lifecycle

1. The authenticated cloud API validates identity, ownership, capability, arguments, rate limits and risk class.
2. For APPROVAL_REQUIRED, it creates a pending approval record and pauses execution. The action has not happened yet.
3. JARVIS displays an approval card in its own UI and sends a native notification where permitted. Notifications may deep-link back into JARVIS; they do not approve by themselves.
4. The user approves/rejects inside JARVIS. The backend verifies exact request ID, user/session, tool invocation, argument digest, expiry, pending status and one-use semantics.
5. Approval authorises only that exact invocation. Reject, expiry, reconnect, sign-out, account switch, malformed decision, replay, mismatched digest or missing UI all deny by default.
6. The backend executes the adapter only after a valid approval and records a separate execution outcome. Distinguish requested, accepted, completed and externally confirmed.
7. Record an account-scoped audit event with request ID, capability, decision, timestamp and outcome. Redact credentials and sensitive payloads. Provide inspectable history and retention controls.
8. On sign-out/account switch, invalidate all pending approvals for that session immediately. Another household account cannot view or approve them.

## Pre-authorisation

A settings surface inside JARVIS may define narrow routine rules. Each rule includes provider, exact capability, object/account scope, quantitative limits, time window/expiry and revocation. Rules are opt-in and scoped to one account. They cannot authorise transfers, trades, external messages, purchases, bookings, deletion, security/credential changes or production releases. Those always require a fresh explicit approval.

## UI and notification requirements

- Approval card is visible, accessible and usable on iPhone and desktop.
- Clearly state that the action has not happened yet.
- Display exact target, effect, amount/content summary and reversibility.
- Approve and Reject are separate, equally clear actions; no default focus on Approve.
- Show expiry and a terminal result; remove the card after resolution.
- A notification or vibration is only a prompt to open JARVIS. iOS notification/haptic behaviour depends on permission and OS rules.
- No UI, no connection, stale session or unavailable notification must never trigger a spoken/model-generated approval fallback.
- Pending cards are cleared on account switch and cannot be approved from another account.

## Server-side implementation requirements

- Persist pending requests in an account-scoped database table with RLS and a server-only transition path.
- Enforce one-time decisions with an atomic state transition; never rely on client-side flags.
- Hash canonical JSON arguments after strict schema validation. Reject non-finite numbers, cyclic values, hidden properties and prohibited keys.
- Use short TTLs, bounded pending counts, idempotency keys and cancellation.
- Execute adapters server-side with least-privilege credentials and scoped capabilities.
- Never expose vendor secrets to the model or client.
- Keep a global emergency write-disable and per-capability kill switch.
- Tool execution must not depend on a Windows process for normal iPhone operation.

## Test and release gates

### Unit
- canonical argument digest stable across object key ordering;
- malformed/unsupported schemas denied;
- risk classification for every capability and unknown tool;
- expiry, duplicate, replay, wrong user/session/tool ID/digest;
- disconnect, interrupt, sign-out, account switch, timeout and process restart all deny/settle;
- approval for invocation A cannot authorise invocation B, even with same tool name.

### Integration
- cloud API pauses before any side effect;
- one-click JARVIS approval resumes exactly one invocation;
- reject/timeout never call provider;
- two household accounts cannot see or approve each other's requests;
- audit event is emitted without secrets;
- notifications link to JARVIS but do not approve automatically.

### End-to-end
- desktop and iPhone show the same exact request;
- keyboard and touch approve/reject;
- no UI, no connection and stale page fail closed;
- mocked provider operations before any live external action;
- verified result and audit record match the actual provider outcome.

## Current state

The current cloud API supports authenticated chat, provider routing and semantic memory. It does **not** yet implement a persistent cloud approval registry or a server-side tool execution loop for BMW, Blink, Dreame, email, messaging or other vendors. The local bridge approval prototypes are not the production approval system. Do not claim per-action approvals or autonomous writes are available until the cloud implementation and all release gates pass.
