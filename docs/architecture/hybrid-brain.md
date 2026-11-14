# JARVIS cloud-first brain and action architecture

Status: target architecture. The cloud chat/memory foundation exists; the full server-side tool execution plane is not yet shipped.
Authority: `JARVIS_MASTER_RECORD.md`.

## Product rule

JARVIS itself is the assistant and the only user-facing control surface. The iPhone app and other approved clients connect directly to cloud JARVIS. **Normal operation must not depend on a Windows PC, a local Node bridge, local MCP servers, Apple Shortcuts, Siri Shortcuts, or a manual hand-off to another assistant.**

## Target responsibility split

1. **Cloud conversation plane:** authenticated conversation, approved-memory retrieval, reasoning, response synthesis and structured action planning.
2. **Cloud capability/action plane:** typed integration registry, per-user authorization, policy/risk evaluation, approval lifecycle, server-side vendor adapters and audit.
3. **JARVIS client:** renders the holographic HUD, handles user voice/text, displays progress/approval cards, streams responses, cancels turns and shows verified outcomes.
4. **Optional developer tooling:** local tools may support development only. They are not part of the production mobile path and cannot be required for a core feature.

## Proposed turn flow

1. The client starts a turn using the authenticated account's access token and account-owned conversation ID.
2. The cloud model streams a normal answer or emits a versioned, typed capability request. A plan contains capability ID, validated arguments and intended outcome — never credentials or executable code.
3. The cloud policy gateway validates identity, ownership, capability allowlist, argument schema, risk class, rate limits and current approval policy.
4. READ operations execute within the user's authorized scope. APPROVAL_REQUIRED actions create a one-shot pending approval and pause before the side effect.
5. JARVIS displays the exact request in its own UI and notifies the user through supported native notification mechanisms. Notification/haptic behaviour is subject to iOS permission and background restrictions.
6. After a valid approval, the cloud action plane invokes the vendor adapter using server-side credentials and records the outcome.
7. The cloud model synthesizes the result. JARVIS reports only what the provider confirmed, distinguishing requested, accepted, completed and externally confirmed.
8. Barge-in, cancellation, sign-out or account switch cancels active streams and invalidates pending requests. Late results from the previous account are discarded.

## Required API and client changes

- Extend the authenticated cloud API with versioned typed capability requests and structured execution results.
- Add a server-side capability registry with JSON schemas and provider-specific allowlists.
- Persist pending approvals with user/session/tool invocation/argument digest/expiry and enforce one-use decisions atomically.
- Keep all vendor credentials and provider keys server-side.
- Preserve one conversation interface consumed by App; do not create competing chat clients or duplicate auth stores.
- Keep approved-memory retrieval and pending-only auto-capture scoped to the authenticated cloud account.
- Keep user-visible progress, cancellation, notifications, approval cards and audit history in JARVIS itself.

## Account and security boundaries

- Cloud API derives `user_id` from the validated Supabase bearer token. Never accept a client-supplied user ID as an ownership boundary.
- Owner and spouse are distinct identities. Account switching cancels work, clears previous account UI state and invalidates pending approvals.
- The model cannot grant itself permissions. Emails, websites, images, documents and device content are untrusted input.
- Vendor secrets never enter the browser bundle, model context, logs or approval notifications.
- High-impact or uncertain actions fail closed. No action is executed because a user asked for "full autonomy" in general.
- No banking/payment/trading actions and no employer/SAP integration.

## Fallback semantics

- If cloud services or a provider are unavailable, JARVIS may answer only where it has sufficient grounded information; it must clearly state that live integrations/actions are unavailable.
- If an adapter fails, report the failure and do not silently retry an effectful action.
- Do not fall back to a Windows bridge, Shortcut, UI automation or vendor-app launching as the normal production path.
- Cancellation must stop streams, settle pending requests and prevent stale results from being spoken or shown after an account switch.

## Release gates

1. Contract tests for typed action plans, unknown events and malformed arguments.
2. Unit tests for capability schema validation, risk classes, one-shot approval and replay protection.
3. Integration tests for cloud -> adapter -> verified outcome using fake read-only providers.
4. Tests proving writes remain denied until the correct approval is accepted.
5. Tests for cancellation at every stage and strict two-account isolation.
6. iPhone end-to-end for voice, interruption, approval cards and native notification handling.
7. Provider outage/429 tests and clear unsupported-capability states.
8. Only after all gates pass, enable narrowly scoped read-only and low-risk actions. Keep emergency write-disable and rollback.

## Current implementation truth

The deployed Supabase Edge Function supports authenticated chat, provider routing and semantic memory. The current app branch now combines the cloud authentication/memory foundation with the amber HUD and account-switch clearing. It does **not** yet ship a cloud tool-execution loop or direct BMW, Blink, Dreame, email, WhatsApp, call-metadata, maps or CarPlay adapters. The local bridge/action-approval prototypes are not the production action system. Do not claim autonomous external actions are available until the cloud capability plane and release gates pass.
