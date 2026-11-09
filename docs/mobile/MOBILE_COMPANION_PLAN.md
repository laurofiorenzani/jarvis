# JARVIS mobile companion plan

## Decision

Build one JARVIS experience across iPhone and Windows, preserving the existing React/Vite interface and Claude Agent SDK bridge. The iPhone is a companion client; Windows remains the trusted host for local tools, the primary bridge process, and the Windows Credential Manager.

Working branch: `work/mobile-companion`, based on `work/memory-integration-ready`. The existing `main` branch is not changed.

## What the iPhone should support

- Installable mobile web app (PWA) launched from the iPhone Home Screen.
- Responsive HUD with touch-first controls and layouts.
- User-initiated push-to-talk and spoken responses.
- Live text transcript, status, tool activity and memory approval prompts.
- Reconnect handling and clear offline/host-unavailable states.
- The same authenticated account and approved memory scope as the Windows client.

## Platform constraints

- iOS Safari requires a secure context (HTTPS) for microphone access and user permission.
- Audio playback and microphone capture must be started from a user gesture. A reliable always-on wake-word loop while the phone is locked or the app is backgrounded cannot be promised for a web app.
- The current bridge binds to loopback by default. This is correct for local security, but an iPhone cannot reach a Windows loopback address.
- Do not expose the bridge port directly to the public internet or LAN without a separately reviewed authentication and transport design.
- Windows Credential Manager is not available to the iPhone. The current local memory vault therefore remains Windows-hosted; cross-device memory requires a deliberate sync design and must not copy the Windows key to the browser.

## Proposed connection model

1. The Windows JARVIS host runs the existing local bridge and retains its local-only tools and Windows Credential Manager.
2. A separately authenticated, outbound-initiated secure connection makes a narrow mobile session available without opening the local bridge port to the internet.
3. The iPhone connects only to that authenticated mobile endpoint over HTTPS/WSS.
4. The mobile endpoint forwards an allowlisted set of conversation and UI events to the host. It must not expose arbitrary MCP tools, filesystem access, camera controls, or write-capable actions by default.
5. Memory reads and writes remain private by default. Writes require the existing explicit confirmation flow. Shared/synchronised memory is a separate release gate.

No tunnel, cloud Worker, database, domain, paid service, or public endpoint has been provisioned by this plan.

## Implementation sequence

### Phase 1 — iPhone interface readiness
- Audit viewport sizing, safe areas, touch targets, scroll and blade interactions.
- Add a PWA manifest and install metadata.
- Add a mobile interaction mode that uses push-to-talk instead of relying on desktop wake-word behaviour.
- Preserve desktop keyboard, camera and gesture controls.
- Add mobile-specific diagnostics for microphone permission, audio playback and connection state.

### Phase 2 — Secure Windows-to-iPhone session
- Specify the authenticated relay and device enrollment protocol.
- Use short-lived, revocable device credentials; never put bridge secrets or provider API keys in the browser bundle.
- Bind every mobile session to an authenticated user and an explicit capability allowlist.
- Add origin, replay, expiry, rate-limit, reconnect and audit tests.
- Keep the local bridge loopback-only.

### Phase 3 — Shared memory
- Decide the canonical encrypted memory location and key ownership model.
- Define device enrollment, revocation, recovery, retention, export and deletion.
- Do not reuse or export the Windows Credential Manager key into local storage, IndexedDB, or JavaScript.
- Test private/shared household boundaries and approval flows before any personal-data migration.

### Phase 4 — Real-device validation
- Test on the user's iPhone in Safari and from the Home Screen.
- Validate microphone permission, push-to-talk, audio playback, reconnects, background/foreground transitions and memory approvals.
- Then test the Windows host, Credential Manager and local MCP tools together.

## Acceptance criteria

- The iPhone can install and open the JARVIS companion over HTTPS.
- A deliberate tap starts microphone capture; the user can see and stop capture.
- Speech reaches the Windows-hosted JARVIS session and spoken/text responses return.
- The phone cannot call arbitrary local bridge endpoints or gain write-capable tools by default.
- Lost network/host sessions fail visibly and reconnect without silently pretending the conversation is still live.
- Memory is not claimed to be synchronised until encrypted cross-device storage, identity, recovery and deletion are implemented and tested.
- Desktop functionality and existing security defaults remain intact.

## Current status

Planning only. The branch exists, but no mobile code, relay, cloud resources, public endpoint, device credential, or production memory sync has been created by this plan.
