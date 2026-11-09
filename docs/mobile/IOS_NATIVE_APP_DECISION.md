# JARVIS iPhone app — implementation decision

> **Architecture authority:** `docs/architecture/CLOUD_FIRST_ARCHITECTURE.md`. This document covers the iOS client only and must not redefine backend hosting or connectivity.

## Decision

Deliver a real installable iOS application, not a Home Screen website/PWA as the final product. Use **Capacitor around the existing React/Vite application** for the first release. This reuses the existing HUD and React components inside a signed native iOS app container; the UI remains web-rendered and is not fully SwiftUI-native.

**The iPhone app connects directly to the cloud-hosted JARVIS backend. It must not depend on the Windows PC, a Windows-hosted bridge, or a Windows-to-phone relay for core chat or approved memory.** Windows remains a development/admin environment and optional host for local-only tools.

## Native iOS responsibilities

Add and test platform adapters for:
- Microphone permission and audio capture.
- Speech recognition / transcription.
- Text-to-speech and audio session lifecycle.
- Audio interruptions and route changes (headphones, Bluetooth, phone calls).
- Foreground/background lifecycle and reconnect behaviour.
- Secure device enrollment, credential storage, token refresh, and revocation.

Push-to-talk is the initial baseline. Do not promise always-listening wake-word operation while the app is backgrounded or the phone is locked. Preserve the existing desktop/browser implementation behind shared interfaces where practical.

## Connectivity and security

- Connect directly to the authenticated cloud API over HTTPS/WSS.
- Use short-lived access tokens, secure device enrollment, revocation, per-user authorization, and least-privilege capability scopes.
- Keep all provider and integration secrets server-side; never ship Claude, MCP, cloud, bridge, or Windows vault credentials in the iOS bundle.
- Do not expose the current local Windows bridge to the internet or LAN.
- Do not use a Windows relay as the production path.
- Do not migrate personal memory until cloud encryption, isolation, backup/recovery, export, retention, and deletion have been designed and tested.

## Delivery stages

1. Complete the cloud-first architecture and current-code dependency audit.
2. Define the cloud API/auth contracts before mobile integration.
3. Add Capacitor iOS target and app identity while keeping Vite/browser builds working.
4. Adapt HUD layout, safe areas, touch targets, navigation, and mobile diagnostics.
5. Implement native audio/lifecycle adapters and connect to the cloud API.
6. Test on a physical iPhone; build/sign via macOS/Xcode and TestFlight when the Apple environment and credentials are available.
7. Complete privacy disclosures and App Store review preparation.

## Acceptance criteria

- A real JARVIS app icon and signed iOS app install.
- Direct authenticated connection to cloud JARVIS.
- Core chat and approved memory work while the Windows PC is off.
- Push-to-talk, transcription, spoken replies, and interruption work on a physical iPhone.
- No privileged secrets in the app bundle.
- Windows-only tools are optional and clearly marked unavailable when not hosted.
- No always-on background listening is advertised without a separately validated and policy-compliant design.

## Status — 9 November 2026

**Completed foundation**
- Cloud-first architecture and current-code dependency audit recorded.
- Versioned cloud API and Supabase Auth client contracts implemented.
- Supabase schema with row-level security and rate limiting deployed.
- Authenticated cloud API Edge Function deployed.
- Cloud API transport, SSE parser, cloud-brain adapter, and explicit cloud-runtime composition root implemented.
- Automated tests cover API transport, stream parsing, brain lifecycle/cancellation, and secure token-store injection.
- CI and the full `Jarvis tests` workflow passed on commit `101a064c7c9e4c26c6d164ff92e4663b8d303537`, including Ubuntu and Windows jobs.

**Still pending**
- Wire the cloud runtime into the running HUD with a real sign-in/session UX.
- Select and implement a native Keychain-backed token store before enabling persistent mobile sign-in.
- Verify configured Groq provider credentials/model and a real authenticated model turn; provider invocation has not yet been confirmed.
- Cloud memory, device enrollment/revocation, and cloud tools.
- Capacitor iOS target, native audio/lifecycle adapters, physical-device testing, Xcode signing, and TestFlight.

This status does not claim that Capacitor, an Xcode project, a signed app, a TestFlight build, cloud memory, or an end-to-end authenticated model turn already exists.
