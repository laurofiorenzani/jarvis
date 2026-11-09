# JARVIS mobile companion plan

> **Architecture authority:** `docs/architecture/CLOUD_FIRST_ARCHITECTURE.md` is the canonical source of truth. Read it before changing mobile, backend, hosting, memory, or deployment plans.

## Product decision

The JARVIS product is **cloud-first**. The iPhone app connects directly to the cloud backend. The Windows PC is for development, administration, and optional local-only tools; it is not the production host, relay, or a requirement for normal JARVIS operation.

The iPhone deliverable is a real installable signed iOS app, initially built with Capacitor around the existing React/Vite interface. A PWA is not the final product.

Working branch: `work/mobile-companion`. Do not merge to `main` without an explicit release decision.

## Required iPhone experience

- JARVIS opens from its own app icon.
- Authenticated connection directly to the cloud backend over HTTPS/WSS.
- Responsive HUD and touch-first interaction.
- User-initiated push-to-talk, transcription, spoken responses, and visible microphone state.
- Conversation and approved memory available without the Windows PC running.
- Clear offline, authentication-expired, and service-unavailable states.
- Secure device enrollment, token refresh, and revocation.

## Architecture boundaries

- Cloud backend owns core conversation orchestration and the production API.
- Cloud memory owns approved durable memory only after encryption, access isolation, backup/recovery, export, retention, and deletion are designed and tested.
- External integration credentials remain server-side; use OAuth or approved secure credential storage.
- Windows bridge remains loopback-only and is used for development and optional local capabilities such as filesystem or desktop automation.
- Local-only tools must be identified as unavailable on mobile unless a separate secure cloud-compatible implementation is designed.
- Never route the production iPhone app through a Windows tunnel or expose the current bridge port.

## Implementation sequence

1. **Audit current coupling:** map browser bridge calls, bridge-owned sessions, memory, tools, secrets, and local-only assumptions.
2. **Define cloud contracts:** provider-neutral API, identity, authorization, conversation/session, tool capability, and memory interfaces.
3. **Build cloud backend foundation:** implement and test locally first; choose hosting/database/provider based on security, cost, portability, and operational fit. Production provisioning and paid services require explicit approval.
4. **Move core memory and integrations:** server-side secrets, per-user isolation, encryption, recovery, revocation, export, retention, deletion, and confirmation gates.
5. **Migrate clients:** point web client to cloud API; add Capacitor iOS target and iOS-specific audio/lifecycle adapters.
6. **Verify independence:** prove core chat and memory work with Windows completely powered off/disconnected.
7. **Release:** physical-device testing, macOS/Xcode signing, TestFlight, privacy disclosures, then App Store readiness.

## iOS constraints

- Capacitor reuses the React/Vite HUD in a native iOS container; the interface itself remains web-rendered.
- Microphone access must be permissioned and visibly user-initiated.
- Push-to-talk is the baseline. Do not promise always-on wake-word operation while backgrounded or locked.
- Handle audio interruptions, route changes, foreground/background transitions, and reconnects.
- Do not embed provider, MCP, bridge, or Windows vault secrets in the app bundle.

## Acceptance criteria

- iPhone connects directly to cloud JARVIS; Windows is not required.
- Core chat and approved memory continue working while Windows is off.
- User can install a signed iOS app with JARVIS identity/HUD.
- Voice interaction works on a physical iPhone with clear permission and capture state.
- Client cannot access arbitrary tools or another user's data.
- Windows local-only features remain optional and are clearly distinguished.
- Existing desktop development workflow remains functional.

## Current status

Planning and architecture decision only. Cloud provider selection, backend implementation, production resources, memory migration, Capacitor integration, Xcode signing, and TestFlight have not yet been completed.
