# JARVIS mobile companion plan

> **Architecture authority:** `docs/architecture/CLOUD_FIRST_ARCHITECTURE.md` is the canonical source of truth. Read it before changing mobile, backend, hosting, memory, or deployment plans.

## Product decision

The JARVIS product is **cloud-first**. The iPhone app connects directly to the cloud backend. The Windows PC is for development, administration, and optional local-only tools; it is not the production host, relay, or a requirement for normal JARVIS operation.

The iPhone deliverable is a real installable signed iOS app, initially built with Capacitor around the existing React/Vite interface. A PWA is not the final product.

Working branch: `work/memory-integration-ready`. Do not merge to `main` without an explicit release decision.

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

1. **Audit current coupling:** complete. The existing bridge, local memory, MCP tools and browser-direct path are documented; the bridge remains local-only.
2. **Define cloud contracts:** initial v1 API, auth, conversation and streaming contracts are implemented.
3. **Build cloud backend foundation:** Supabase schema, RLS, rate limits and the `jarvis-api` Edge Function are deployed. The provider router is implemented, but provider credentials and a real authenticated model turn are not yet verified.
4. **Move core memory and integrations:** pending. Cloud memory, device enrollment and cloud tool registry are not implemented; no personal memory has been migrated.
5. **Migrate clients:** cloud API, auth and cloud-brain adapters exist but are not yet wired into the running HUD. Capacitor iOS target and native audio/Keychain adapters are pending.
6. **Verify independence:** pending. Core chat must be proven with Windows powered off before calling the mobile path ready.
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

Architecture and cloud backend foundation implemented. Supabase schema and API are deployed (`jarvis-api` version 9); cloud auth/API/brain adapters and regression tests exist. The HUD includes a Cloud Access panel and switches to the cloud brain after explicit sign-in, but the initial backend still defaults to the local bridge. A real authenticated model inference is not yet verified and no provider configuration is confirmed. Cloud memory security/lifecycle hardening, device enrollment/revocation, cloud tool/integration registry, Capacitor, native Keychain/audio adapters, physical-device testing, Xcode signing and TestFlight remain pending.
