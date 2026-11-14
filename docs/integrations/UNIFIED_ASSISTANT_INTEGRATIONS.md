# JARVIS unified assistant integrations

## Non-negotiable product rule

**JARVIS itself is the only user-facing assistant and control surface. No Apple Shortcuts, Siri Shortcuts, user-created shortcut automations, or per-conversation manual setup.** The user speaks or types once to JARVIS. JARVIS interprets intent, checks permissions and policy, invokes the relevant integration directly through its cloud/native adapter, and reports the verified outcome.

Vendor applications may remain installed for initial account linking, consent, firmware updates or recovery, but ordinary operation must not require the user to open them, invoke an automation, or repeat setup instructions. A Shortcut-based hand-off is not an acceptable substitute for a direct integration.

## Runtime architecture

```
JARVIS iPhone app / desktop client
              |
       JARVIS conversation
              |
  Cloud intent + policy engine
              |
  Capability / integration registry
    |          |          |        |
   BMW       Blink      Dreame    Email / messaging / maps
    |          |          |        |
 official or documented authorised vendor interfaces
```

- Client never stores vendor passwords, refresh tokens, API keys or privileged credentials.
- OAuth/vendor credentials remain server-side in a dedicated encrypted secret store, scoped per user and integration.
- The model may propose a tool call; backend validates identity, connected account, capability allowlist, argument schema, approval policy and rate limits before execution.
- Return structured outcomes: `success`, `pending`, `unsupported`, `needs_auth`, `approval_required`, `failed`. JARVIS must not claim success until a reliable integration response confirms it.
- Every integration can be connected, tested, disconnected and revoked from JARVIS settings. This is configuration of JARVIS, not a separate assistant or workflow.
- No silent fallbacks to Shortcuts, UI automation, vendor-app launching or manual user actions. If a direct supported integration is unavailable, JARVIS must explain the limitation and ask before considering a different architecture.

## Integration requirements

### BMW / My BMW
- Target capabilities include remote climate start/stop, vehicle status and trunk/door operations only where the specific vehicle, region and account API support them.
- First investigate official BMW APIs and documented ConnectedDrive customer-authorised interfaces. BMW CarData data-sharing APIs must not be assumed to include remote commands.
- If no official API exposes a requested command, assess a narrowly scoped unofficial protocol only in a separate security/risk proposal: MFA, credential handling, account lockout, regional compatibility, rate limits, vendor terms and maintenance risk. Do not connect credentials until owner approval.
- The adapter must distinguish dispatched, accepted, completed and vehicle-confirmed states. Never report climate active or trunk open without reliable vehicle-side confirmation.

### Blink
- JARVIS connects directly to the Blink account using an authorised integration adapter and retrieves camera/device state and available media inside JARVIS.
- Snapshot, recorded clip and live video are separate capabilities. Return explicit support states; never label a thumbnail as live video.
- Consumer Blink APIs may not provide a documented public third-party control surface. Assess protocol stability, MFA, session handling, rate limits, media streaming and account-lockout risks before any unofficial adapter. No credentials in browser/model context.

### Dreame
- JARVIS directly discovers robot status, maps, rooms and supported cleaning actions through a vetted API/protocol adapter.
- Room/zone cleaning is only enabled after discovering stable room identifiers and confirming that the exact model/firmware accepts the command.
- Identify exact model, firmware and region before enabling commands. Credentials and tokens stay server-side.

### Email, messaging and phone activity
- Integrate through authorised provider APIs/connectors and explicit per-account consent.
- WhatsApp, SMS, calls and notifications have different platform/provider access limits. Do not promise complete message/call access where iOS or the provider does not expose it.
- Operational counts and summaries must show source, time window, permissions and completeness. Distinguish received, drafted, sent, archived, deleted and pending approval. Sending/deleting externally requires the applicable approval policy.

### Waze, Apple Maps and CarPlay
- JARVIS should prepare destinations/routes and hand off through supported Maps/Waze interfaces where available.
- CarPlay is limited to Apple's supported categories, APIs and entitlements. Do not promise arbitrary HUD mirroring or unrestricted CarPlay UI.
- Keep the main assistant experience in the JARVIS app; CarPlay is a constrained companion surface.

### Smart lights and future devices
- Use direct official APIs or a vetted supported gateway adapter, with per-user authorization, device discovery and capability scopes.
- A gateway is an implementation detail, not a second assistant or required user-facing control surface. Cloud-first requirements and network reachability must be satisfied.

## Generic integration registry and tool execution

Before adding individual vendor adapters, implement:
1. Typed capability registry with versioned JSON schemas.
2. Per-user connection and consent records, secret references, scopes and revocation.
3. Backend policy gateway checking identity, ownership, action risk, confirmation and rate limits.
4. Structured tool execution loop with cancellation, timeout, idempotency and audit events.
5. UI states for connecting, approval, execution, verified completion, unsupported and failure.
6. Tests for cross-account isolation, prompt injection, invalid arguments, replay, expired credentials and denied actions.

The LLM never receives vendor secrets and cannot grant itself permissions. Untrusted messages, web pages and device content cannot change policies.

## Delivery order

1. Generic registry, policy gateway, audit and approval UI.
2. Read-only connection and device discovery.
3. BMW read-only status, then a specifically approved remote action after confirming API feasibility.
4. Blink snapshot/recording, then assess live view independently.
5. Dreame discovery/status, then room/zone commands.
6. Email/messaging/phone summaries using authorised APIs.
7. Maps/navigation and supported CarPlay companion experience.

## Current implementation truth

The deployed Supabase Edge Function has authenticated chat, provider routing and semantic-memory code. It does **not** currently prove a server-side integration registry, vendor OAuth/secret store, BMW commands, Blink media, Dreame control, phone-call access, or CarPlay support. No direct device action has been verified from JARVIS. This document is the target architecture, not a claim of shipped capability.
