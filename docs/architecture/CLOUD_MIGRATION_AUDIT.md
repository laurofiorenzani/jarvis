# Cloud migration audit — current implementation

**Branch:** `work/mobile-companion`  
**Audit date:** 2026-11-09  
**Authority:** `docs/architecture/CLOUD_FIRST_ARCHITECTURE.md`

This is a code-backed audit of the current implementation. It is intentionally separate from the target architecture: findings describe what exists today, not what production should become.

## Executive finding

The repository is currently a **local-first desktop/browser application**, not a cloud-ready service. The React/Vite client defaults to a WebSocket at `ws://localhost:8787`; the Node bridge launches the Claude Agent SDK using the host's Claude Code installation/login, reads the host's `~/.claude.json`, and exposes local MCP/desktop capabilities. The current memory runtime is opt-in and Windows Credential Manager-backed by default. Deploying this bridge unchanged to a generic cloud host would fail or create unsafe assumptions.

The correct next move is to separate the core assistant runtime from the local desktop adapter, define a server-side cloud runtime boundary, and migrate one capability at a time. Do not simply expose the existing bridge.

## Current dependency map

| Area | Current implementation | Cloud migration implication |
|---|---|---|
| Client backend selection | `src/config.ts` defaults `VITE_BACKEND=bridge`; `src/lib/brain.ts` selects bridge or direct Anthropic client | Replace binary local/direct selection with a first-party authenticated API transport. |
| Client transport | `src/lib/bridge.ts` uses a WebSocket session; URL defaults to localhost | Introduce a cloud API client with identity, token refresh, reconnect and session resume. Keep local transport only as a development adapter. |
| Local orchestration | `bridge/server.mjs` imports Claude Agent SDK and owns WebSocket sessions, tool dispatch and HTTP endpoints | Extract reusable orchestration/service modules from the local host and HTTP/WebSocket adapter. |
| Claude authentication | Agent SDK uses Claude Code's host login/CLI | Cloud runtime needs a supported server-side authentication/billing arrangement and deployment-safe credentials. Do not assume a Windows login can be reused in cloud. |
| MCP discovery | Reads `~/.claude.json` and home-scoped project MCP config | Replace implicit host discovery with explicit per-environment, server-side integration registry and allowlists. |
| Local capabilities | Browser/Chrome, camera, filesystem, workspace, shell/desktop and local stdio MCP integrations | Keep local-only capabilities behind an optional Windows agent/adapter. Never expose these by default to mobile/cloud clients. |
| Workspace | Defaults to `~/.jarvis/workspace`; file roots are host filesystem paths | Cloud workspace must be isolated per user, sandboxed, quota-limited and backed by controlled object storage; no host filesystem exposure. |
| Memory | `bridge/memory.mjs` is encrypted JSON on local disk; key provider requires OS vault; bootstrap selects Windows Credential Manager on Windows | Cloud memory needs a different KMS/secret-manager adapter and multi-user database design. Existing encrypted file store is single-process and not a cloud multi-instance database. |
| Memory authorization | Confirmation broker and transport are coupled to the bridge socket and active turn | Move approval challenges to authenticated API events with server-side user/session binding, expiry and replay protection. |
| Speech | Browser mic capture and browser speech engines; optional bridge endpoints for ElevenLabs | Client audio adapters can remain local, but any premium STT/TTS credentials and proxy calls must be server-side. iOS needs native audio adapter work. |
| Configuration | `VITE_*` values are bundled into browser assets; comments warn direct mode exposes provider/MCP secrets | Client configuration must contain only public API origin and non-secret feature flags. All privileged credentials move server-side. |
| Startup/deployment | `scripts/start.mjs` starts local bridge and Vite together; `scripts/setup.mjs` checks local Claude CLI and local MCP config | Separate local developer launcher from production server entrypoint, health checks, migrations and deployment manifests. |

## Code evidence and important files

- `src/config.ts`: backend defaults to `bridge`; bridge URL defaults to `ws://localhost:8787`; direct mode can bundle Anthropic and MCP credentials.
- `src/lib/brain.ts`: exposes bridge-only channels for panels, blades, UI operations, camera capture, memory confirmation, and connection state.
- `src/lib/bridge.ts`: owns the browser WebSocket client and event protocol; socket loss is treated as loss of the agent session.
- `src/lib/anthropic.ts`: direct browser-to-Anthropic path explicitly enables `dangerouslyAllowBrowser` and includes MCP credentials in client configuration. Not suitable for production.
- `bridge/server.mjs`: imports `homedir`, reads `~/.claude.json`, creates `~/.jarvis/workspace`, starts a local WebSocket server, and loads the memory runtime at process startup.
- `bridge/memory-bootstrap.mjs`: default vault implementation is Windows Credential Manager; non-Windows requires an explicit absolute local adapter module.
- `bridge/memory-runtime.mjs` and `bridge/memory.mjs`: one process-owned store, JSON file, in-process serialized writes and an exclusive writer lock. This is not suitable as-is for horizontally scaled cloud instances.
- `scripts/start.mjs` and `scripts/setup.mjs`: developer workflow assumes local Node, Claude CLI login and local MCP configuration.

## Cloud blockers — resolve before any production deployment

1. **Identity and authorization:** no first-party user/device identity, account isolation or cloud token lifecycle is present in the current client/bridge protocol.
2. **Conversation persistence:** the bridge session is held by a live socket; reconnect starts a fresh session. A durable cloud conversation/session store and resume contract are needed.
3. **Runtime authentication:** cloud hosting cannot rely on a developer's interactive Claude Code login. Select and validate a supported server-side model access method before production.
4. **Tool execution boundary:** local filesystem, Chrome, desktop automation and arbitrary configured stdio MCP servers must not become cloud-exposed capabilities. Define server-side allowlists and approval requirements.
5. **Memory storage:** replace single-process JSON + OS vault coupling with a multi-user persistence design and managed key lifecycle. No memory data migration until tested.
6. **Secrets:** remove all privileged credentials from `VITE_*` configuration. Keep secrets in a cloud secret manager and use scoped service identities.
7. **Transport and approvals:** define authenticated streaming/events, expiry, replay protection, per-user authorization, rate limiting and audit metadata.
8. **Operations:** add structured redacted logs, health/readiness, error reporting, backup/restore, migrations, cost controls and incident recovery.

## Recommended extraction sequence

### A. Stabilize contracts before choosing infrastructure
- Define `AssistantRuntime`, `ConversationStore`, `MemoryStore`, `IdentityProvider`, `ToolRegistry`, and `EventTransport` contracts.
- Keep model orchestration independent of HTTP/WebSocket and independent of local filesystem/vault assumptions.
- Define versioned client/server event schemas, including text deltas, tool status, panels/blades, UI events, camera requests and memory approvals.
- Define the core cloud capability allowlist separately from optional Windows-only capabilities.

### B. Split the current runtime into adapters
- Preserve the existing local bridge as a development/Windows adapter.
- Extract shared prompt assembly, tool policy interfaces and turn orchestration into server-side modules.
- Implement a cloud adapter using managed credentials and explicit integration configuration.
- Add contract tests that run against both local and cloud adapters.

### C. Move state and memory safely
- Introduce durable conversation IDs and resumable event streams.
- Design user-scoped memory records and encrypted storage with key rotation, backup/recovery, export, retention and deletion.
- Move memory approvals to the authenticated user session and keep explicit confirmation for writes.
- Add migration tooling only after the destination passes isolation and recovery tests.

### D. Connect clients
- Replace client direct Anthropic access with the first-party backend.
- Keep the UI-facing `ask/watch/cancel` semantics behind a transport interface to minimize App.tsx changes.
- Add Capacitor only after the cloud API contract and auth lifecycle are stable.
- Validate core chat and memory with the Windows PC off.

## Safe work that can proceed without user input

- Repository code audit and architecture/interface design.
- Unit/contract tests and local emulation.
- Refactoring that preserves current local desktop behaviour.
- Non-secret configuration cleanup and documentation.
- A provider-neutral cloud service skeleton with no public endpoint or paid resources.

## Approval gates — stop and ask the user

- Selecting or creating a paid cloud account/resource where charges or contractual terms apply.
- Creating a public production endpoint/domain/tunnel or changing network exposure.
- Enabling external integrations or migrating personal data/memory.
- Storing provider credentials or creating production secrets.
- Deploying to production, publishing an iOS build, or initiating App Store/TestFlight release.

## Current status

Audit complete; no production resources were provisioned and no personal data was moved. The next code milestone is to define versioned backend/event contracts and extract the existing bridge behind a transport/runtime boundary while preserving the Windows development path.
