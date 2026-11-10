# JARVIS — canonical product and deployment architecture

> **Source of truth.** Read this document before making architecture, hosting, mobile, backend, memory, or deployment changes. If another planning document conflicts with this one, this document wins and the conflicting document must be corrected.

**Status:** Approved product direction; cloud prototype deployed, client integration and production hardening remain in progress.  
**Working branch:** `work/memory-integration-ready`  
**Last decision update:** 2026-11-09

## 1. Product outcome — non-negotiable

JARVIS is being built as a **cloud-hosted personal AI assistant**, accessible from an installable iPhone app and other approved clients. **The Windows PC must not be required to be powered on, logged in, or running a local bridge for JARVIS's normal day-to-day operation.**

The Windows PC is a development, administration, and optional local-tools environment — not the production brain or a mandatory relay.

## 2. Target architecture

- **Cloud backend / brain:** Hosts the conversation orchestration and application APIs so the assistant remains available independently of the user's PC.
- **Cloud data and memory:** Provides durable, access-controlled storage for conversations and approved JARVIS memory. Define encryption, key ownership, backup, export, retention, recovery, and deletion before migrating personal data.
- **iPhone app:** A real installable iOS application, initially using Capacitor to package and reuse the existing React/Vite HUD. It connects to the cloud backend over authenticated HTTPS/WSS.
- **Other clients:** The existing browser/desktop UI may remain as an additional client, using the same cloud identity and backend where appropriate.
- **Windows local runtime:** Retained for development and explicitly local capabilities (for example, filesystem, desktop automation, or local MCP servers). These capabilities are optional extensions and must not be prerequisites for core chat, memory, or mobile use.
- **Integrations:** Connect external services through server-side OAuth/token handling or approved secure connectors. Provider credentials and privileged MCP secrets must never be embedded in the iOS bundle or browser JavaScript.

## 3. What is explicitly NOT the target

- Do not design the iPhone app to depend on a Windows-hosted JARVIS session.
- Do not make a Windows-to-phone tunnel/relay the production architecture.
- Do not expose the current local bridge port to the internet or LAN.
- Do not treat a PWA as the final iPhone product; the target is an installable signed iOS app. A PWA may be used only as a temporary development/test fallback if useful.
- Do not claim that cloud hosting, memory sync, or an iOS build exists until implemented and verified.

## 4. Migration from the current repository

The current codebase is a React 19 + Vite + TypeScript client with a Node bridge that uses the Claude Agent SDK and local MCP configuration. The current default backend is `bridge`, and bridge URLs default to localhost. This is the current implementation, **not the approved final deployment architecture**.

Migrate incrementally:

1. Inventory all browser-to-bridge calls, bridge-owned session state, tools, memory, secrets, and local-only dependencies.
2. Define provider-neutral cloud service boundaries and API contracts before selecting or provisioning infrastructure.
3. Extract core conversation orchestration behind a backend interface so the client is not coupled to localhost or a Windows process.
4. Implement a cloud runtime for core chat and approved integrations; keep local-only tools behind a clearly optional capability boundary.
5. Design authenticated user/device identity, authorization, rate limits, auditability, secret management, and secure transport.
6. Design cloud memory with encryption, isolation, backup/recovery, export, retention, and deletion controls. Migrate no personal memory until these are tested and explicitly approved.
7. Point the existing web client and the Capacitor iOS client at the cloud API.
8. Validate that core chat and memory continue to work with the Windows PC completely off or disconnected.

## 5. iOS product decision

Use **Capacitor around the existing React/Vite application** for the first iPhone app. This produces a signed, installable iOS app while reusing the HUD; the UI is web-rendered inside the native app container. It is not a claim that the UI is fully SwiftUI-native.

Add iOS-specific adapters for microphone/audio, speech recognition, text-to-speech, interruptions, permissions, app lifecycle, secure device credentials, and reconnect handling. Push-to-talk is the initial supported interaction. Do not promise an always-listening wake word while the app is backgrounded or locked.

## 6. Security rules

- No Claude, provider, MCP, bridge, or Windows vault secrets in client bundles.
- Use server-side secret storage and least-privilege service credentials.
- Authenticate every user and device; support revocation and short-lived access tokens.
- Enforce per-user data isolation and an explicit capability allowlist.
- Require explicit confirmation for consequential or destructive actions.
- Keep local bridge bound to loopback; never make it a public mobile endpoint.
- Do not provision paid services, public endpoints, domains, tunnels, or production databases without the user's explicit approval.
- Do not copy Windows Credential Manager keys into the phone or browser.

## 7. Delivery sequence and gates

### Phase A — architecture and dependency audit
Map current bridge routes, tools, session state, memory, configuration, and client dependencies. Produce a migration matrix: cloud core, optional Windows-only, or replace/remove.

### Phase B — cloud backend foundation
Specify and implement API/auth contracts and a deployable cloud service. Choose the provider only after comparing operational fit, security, cost, portability, and required capabilities. Local emulation/tests first; production provisioning is an approval gate.

### Phase C — durable cloud memory and integrations
Implement isolated, encrypted, recoverable memory and server-side integration credentials. Test authorization, revocation, export, retention, and deletion.

### Phase D — client migration
Move the existing web UI to the cloud API. Add Capacitor iOS target and mobile UI/audio adapters. Keep desktop/local development working without making it a production dependency.

### Phase E — verification and release
Prove core chat and memory work while Windows is off. Test iPhone on a physical device; build/sign through macOS/Xcode and distribute through TestFlight only after required credentials and approvals are available. Complete privacy disclosures before App Store release.

## 8. Definition of done

- Core JARVIS chat is available when the Windows PC is off.
- Approved memory is cloud-backed, securely isolated, durable, and user-manageable.
- The iPhone app authenticates directly to the cloud backend and supports the agreed voice workflow.
- No privileged secrets are present in client bundles.
- Local Windows tools are optional extensions, not dependencies for core operation.
- Failure/reconnect states are explicit and tested.
- No production infrastructure or paid resources are created without approval.

## 9. Current implementation truth

As of 10 November 2026, the Supabase `jarvis-api` Edge Function is deployed and active at version 9. The repository contains Supabase Auth-backed API routes, RLS-protected conversation/message/turn tables, rate limiting, a provider-neutral server-side model router, and client modules for authentication, API transport, SSE parsing, cloud brain, and runtime composition. The React HUD now includes a Cloud Access panel: after the user explicitly signs in, it activates the cloud brain for the current page session, loads saved conversations and approved memories, and supports explicit conversation resume. The cloud path is therefore wired into the HUD behind manual sign-in, and the application now defaults to cloud at startup. The local bridge is only selected explicitly with `VITE_BACKEND=bridge`; unauthenticated cloud turns fail closed and do not fall back to localhost or a browser-exposed provider key. No authenticated end-to-end model inference has been verified and provider reachability/free-quota availability remains unconfirmed. The cloud memory UI and database routes exist, but encryption/key management, backup/recovery, export/retention lifecycle, device enrollment/revocation, server-side integrations/tools, production monitoring, Capacitor, native Keychain/audio adapters, Xcode project, signed app, and TestFlight remain pending. No personal memory has been migrated. This remains a prototype, not a production-ready release.
