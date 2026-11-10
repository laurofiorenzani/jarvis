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
4. **Finish cloud client foundation:** implemented in the working branch. Cloud API/auth/brain are wired into the HUD and cloud is the default backend. Real model inference is still unverified.
5. **Build the native iPhone app:** pending. Add Capacitor 8 runtime/CLI and iOS platform, create the Xcode project, adapt the HUD for WKWebView, add native secure session storage and push-to-talk/audio adapters, app icon/splash and deep-link handling. This is an installable app, not a Safari shortcut or PWA.
6. **CarPlay companion:** separate native iOS workstream after the iPhone app foundation. Build a minimal voice-led CarPlay interface using Apple's approved templates and request the appropriate entitlement; do not assume an arbitrary full HUD can be mirrored to CarPlay.
7. **Verify independence:** prove core chat works with Windows powered off and test foreground/background, audio interruptions, reconnects and secure logout on a physical iPhone.
8. **Release:** macOS/Xcode simulator and physical-device builds, signing, TestFlight, privacy disclosures, then App Store readiness.

## iOS constraints

- The deliverable is a standalone installable iOS app with its own JARVIS icon and native app lifecycle. It must not require opening a website in Safari.
- Use Capacitor 8 to reuse the React/Vite HUD in a native iOS container; the interface itself remains web-rendered inside WKWebView. This is a native app shell, not a fully SwiftUI-rendered interface.
- Microphone access must be permissioned and visibly user-initiated.
- Push-to-talk is the baseline. Do not promise always-on wake-word operation while backgrounded or locked.
- Handle audio interruptions, route changes, foreground/background transitions, and reconnects.
- Do not embed provider, MCP, bridge, or Windows vault secrets in the app bundle.

## CarPlay constraints

- CarPlay is a separate approved native interface, not the iPhone HUD projected unchanged.
- Use Apple's supported CarPlay templates and the specific app category/entitlement Apple approves. Voice-based conversational and driving-task apps may be eligible, but approval is not guaranteed.
- The intended BMW experience is a minimal voice-led assistant surface with spoken responses and navigation hand-off to Apple Maps/Waze; never require visual interaction while driving.

## Acceptance criteria

- JARVIS is installed from a signed app build, launches from its own home-screen icon, and does not require Safari.
- iPhone connects directly to cloud JARVIS; Windows is not required.
- Core chat and approved memory continue working while Windows is off.
- User can install a signed iOS app with JARVIS identity/HUD.
- Voice interaction works on a physical iPhone with clear permission and capture state.
- Client cannot access arbitrary tools or another user's data.
- Windows local-only features remain optional and are clearly distinguished.
- Existing desktop development workflow remains functional.

## Current status

Architecture and cloud backend foundation implemented. Supabase schema and API are deployed (`jarvis-api` version 9); cloud auth/API/brain adapters and regression tests exist. The HUD includes a Cloud Access panel and switches to the cloud brain after explicit sign-in, and the production/default backend is now cloud; the local bridge requires explicit `VITE_BACKEND=bridge` selection. A real authenticated model inference is not yet verified and no provider configuration is confirmed. Cloud memory security/lifecycle hardening, device enrollment/revocation, cloud tool/integration registry, native iPhone app work (Capacitor dependency/config, iOS project, Keychain/audio adapters, app icon, Xcode build/signing and TestFlight), physical-device testing, and CarPlay entitlement/template work remain pending. No PWA or Safari shortcut is considered the final iPhone deliverable.
