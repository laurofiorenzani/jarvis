# Encrypted memory integration — development branch

## Scope

The memory foundation from the isolated workbench has been copied into this application on the separate branch `work/memory-integration`. The bridge can now compose a per-process encrypted store and expose a per-connection `jarvis_memory` MCP server. Browser approval messages are correlated to the exact operation, record ID, payload digest, payload preview and active turn.

This is an opt-in integration. It is **disabled by default** and is not ready for personal data.

## Runtime behavior

- `JARVIS_MEMORY_ENABLED` must be set to `1` before the memory runtime is loaded.
- `JARVIS_MEMORY_VAULT_MODULE` must point to an absolute local JavaScript module exporting `createVault()`.
- That module must return a vault adapter implementing:
  - `getSecret(name): Promise<Buffer | null>`
  - `createSecretIfAbsent(name, value): Promise<Buffer>`
- `createSecretIfAbsent` must be atomic across processes and return the single stored winner. A plain get-then-set implementation is not acceptable.
- The adapter must use a Windows OS-backed secret store (Credential Manager or a separately reviewed DPAPI design). No environment-variable, plaintext-file, PowerShell, or silent fallback is permitted.
- If the adapter is missing, invalid, unavailable, or the key is missing for an existing store, startup fails closed when memory is enabled.
- The encrypted store is placed at `~/.jarvis/memory/memory.enc`; metadata-only audit entries are appended to `~/.jarvis/memory/audit.jsonl`.
- One process owns the store. Per-WebSocket connections receive their own MCP server and confirmation transport.

## Model-facing tools

The `jarvis_memory` MCP server exposes search/save/update/delete operations. Sensitive records are hidden from model-facing search. Mutations require a trusted, correlated browser approval; model text or model-supplied flags cannot approve a write.

When a write is proposed, the UI displays the exact payload preview, operation, and target memory ID. Approval expires after 30 seconds. Denial, timeout, malformed reply, disconnect, or mismatched metadata fails closed.

The direct-browser backend does not load this local memory runtime.

## Enablement gate

Do not enable this feature until all of the following are true:

1. A real Windows Credential Manager adapter has been implemented and tested under the Windows account that runs Jarvis.
2. Concurrent first-run tests prove two processes receive the same key.
3. Missing/corrupt key behavior and encrypted-store recovery have been tested.
4. Windows ACLs on the memory directory and audit log have been verified.
5. A real UI approval test proves the displayed payload is exactly the payload written.
6. Bridge restart tests prove encrypted memory persists across process restarts.
7. Search isolation, retention, sensitive-memory denial, deletion, and backup/restore have been verified.

Until those gates pass, leave `JARVIS_MEMORY_ENABLED` unset and use synthetic data only. The feature is a guarded integration foundation, not a production-ready memory service.
