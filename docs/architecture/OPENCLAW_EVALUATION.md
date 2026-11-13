# OpenClaw architecture evaluation for JARVIS
**Review date:** 2026-11-13  
**Decision status:** evaluated; no runtime installed or connected  
**Scope:** assess reuse of OpenClaw capabilities without replacing JARVIS CORE, duplicating memory/auth, or adding recurring costs.

## Executive decision

Use OpenClaw as an architectural reference and possible future optional device/edge-node adapter, not as JARVIS's second brain or production dependency.

JARVIS remains the single owner of:
- household identity and account isolation (Lauro / Isabelle);
- Supabase Auth, conversations, semantic memory, consent, audit and action approvals;
- provider policy, FreeLLMAPI routing, zero-cost enforcement and fallback;
- the web/PWA and planned native iOS experience;
- integration adapters and their capability/permission registry.

Do not install or deploy a second OpenClaw Gateway as part of the current cloud release. Do not copy OpenClaw's session store or Markdown memory into JARVIS. Do not make the JARVIS app depend on the OpenClaw iOS app.

## What is useful

### 1. Device nodes and capability-scoped pairing — HIGH architectural value
OpenClaw models a companion device as a paired node. Its Gateway has device identity, role/scope handshake, device token rotation/revocation, node pairing, and a second approval layer for the node's declared capabilities. Node commands are invoked through a typed Gateway RPC surface.

JARVIS can adopt the design principles in its own device registry:
- per-device cryptographic identity and revocable credentials (Keychain on iOS);
- separate device pairing from capability approval;
- capabilities declared explicitly (camera.capture, screen.snapshot, location.read, voice.capture, notification.read, etc.);
- narrow scopes and owner/account binding; no client-supplied user ID as authority;
- request IDs, idempotency keys, deadlines, cancellation and bounded response payloads;
- capability changes require re-approval; audit metadata never includes secrets or media payloads;
- READ-only device operations remain separate from side-effecting actions, which use the persistent action-approval lifecycle in PR #26.

This aligns with JARVIS PR #26 (server-backed approval records and atomic state transitions) and the planned iOS secure-storage adapter in PR #28. It is a design reuse, not an OpenClaw protocol dependency.

### 2. iPhone multimodal edge capabilities — HIGH potential, constrained by iOS lifecycle
OpenClaw's official iOS companion can act as a paired node for camera capture, screen snapshots, location, Talk/voice-wake and optional Health summaries. Camera and screen capabilities are user-controlled; camera operations require the app in foreground, and iOS may suspend background node connections. The official iOS app currently documents iOS/iPadOS 26.2+.

Potential JARVIS use: learn from the node capability model for a native SwiftUI client that sends approved camera/screen/location/voice requests to the JARVIS cloud brain. Do not assume continuous background camera, screen capture or always-on WebSocket availability on iPhone. JARVIS should keep its own first-party iOS UI and Keychain lifecycle.

### 3. Tool/skill packaging and agent separation — MEDIUM value
OpenClaw supports channel/provider/tool plugins, skills, multi-agent routing and isolated sessions. JARVIS can reuse the concepts of narrow tool contracts, typed schemas, per-agent allowlists, cancellation and explicit agent boundaries. Prefer JARVIS-owned TypeScript/Deno capability modules and SKILL.md-compatible task documentation over importing the OpenClaw runtime.

OpenClaw's plugin SDK is documented as experimental. Avoid depending on it for the JARVIS production contract.

### 4. Browser automation — MEDIUM value, high risk
An isolated agent browser profile is a useful pattern. A signed-in personal browser profile exposes more sensitive sessions and requires a separate trust decision. JARVIS should keep browser access read-only by default, isolate profiles, treat page/email/document content as untrusted, and require approval for writes, sends, purchases or account changes.

## What should NOT be adopted now

- **Second Gateway / second memory:** duplicates session routing and state ownership, violating the single JARVIS CORE and single-memory requirement.
- **OpenClaw as hosted/cloud brain:** it is self-hosted software, not a free hosted inference service. Its quick start still requires an AI provider API key or a locally hosted model. Open-source software does not make inference, compute, hosting or storage free.
- **Laptop as 24/7 server:** OpenClaw's Gateway must run on a host. Running it on the company laptop is not acceptable for JARVIS cloud availability and may add resource load.
- **Local models as the default today:** Ollama/llama.cpp can avoid per-token API charges but need persistent hardware, memory, storage, power and operations. Keep as optional fallback only after a real hardware benchmark; do not make the laptop a server.
- **WhatsApp personal-account automation:** OpenClaw documents its WhatsApp channel as WhatsApp Web via Baileys, QR-linked session state and pairing/allowlists. This is not the same as an official WhatsApp Business API integration. Do not connect the family's personal account or rely on this as a production integration without a separate policy, reliability and account-risk review.
- **Unrestricted host tools:** OpenClaw security docs explicitly warn that tool execution can run with host-user permissions; sandboxing is opt-in and prompt injection can arrive through webpages, emails, files and attachments. JARVIS must not copy permissive host-execution defaults.

## JARVIS implementation mapping

| OpenClaw concept | JARVIS decision |
|---|---|
| Gateway owns sessions and routing | Keep Supabase/JARVIS CORE as sole owner |
| Device pairing + capability approval | Adopt concept in JARVIS device registry |
| Node invoke with scopes | Adopt typed capability API, user/device-bound |
| Token rotation/revocation | Use Keychain + server-side revocation |
| Multi-agent routing | Keep JARVIS agent registry and shared permission engine |
| Plugin/skill contracts | JARVIS-owned modules; optionally SKILL.md-compatible |
| Browser isolated profile | Adopt only as a security design pattern |
| WhatsApp Web/Baileys | Do not adopt for family production messaging |
| OpenClaw iOS companion | Reference only; JARVIS retains first-party SwiftUI app |

## Recommended next engineering slice

1. Finish PR #26 approval API integration with a UI that displays exact capability, target, impact, reversibility, argument digest and expiry. The API is metadata-only; it does not execute integrations.
2. Define a JARVIS-owned `device_registry` and `device_capabilities` contract only after the native iOS secure-storage PR is reconciled. Device enrollment and capability approval must be separate.
3. Add a narrow node transport adapter (WebSocket or authenticated HTTPS) only when the first-party iOS client can store a device key in Keychain and revoke it server-side.
4. Pilot read-only camera/screen/location capabilities with explicit foreground and per-device consent; do not add background capture.
5. Keep the action executor separate from approvals; no external action until a capability-specific adapter, idempotency, expiry, audit and explicit user approval all pass tests.

## Cost, security and release gates

- No OpenClaw package, service, plugin, server, provider, subscription or credential was installed or created in this evaluation.
- No production changes, user data access, device pairing or external API requests.
- Any later pilot must demonstrate €0 recurring provider/hosting cost, no automatic billing/overage, EEA data handling, per-account isolation, revocation and restore behavior.
- Recheck OpenClaw release/docs and plugin API stability before any future implementation; docs and interfaces change frequently.

## Official sources reviewed

- OpenClaw overview: https://docs.openclaw.ai/
- Security model and hardening: https://docs.openclaw.ai/gateway/security
- Prompt-injection guidance: https://docs.openclaw.ai/gateway/security/prompt-injection
- Gateway WebSocket protocol: https://docs.openclaw.ai/gateway/protocol
- Node pairing and capabilities: https://docs.openclaw.ai/nodes
- Official iOS companion: https://docs.openclaw.ai/ios
- Tool plugin SDK: https://docs.openclaw.ai/plugins/tool-plugins
- Local model providers: https://docs.openclaw.ai/providers/ollama and https://docs.openclaw.ai/gateway/local-models
- WhatsApp channel: https://docs.openclaw.ai/channels/whatsapp
