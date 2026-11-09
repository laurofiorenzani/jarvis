# Encrypted memory integration — development branch

## Scope

The memory foundation from the isolated workbench has been copied into this application on the separate branch `work/memory-integration`. The bridge can now compose a per-process encrypted store and expose a per-connection `jarvis_memory` MCP server. Browser approval messages are correlated to the exact operation, record ID, payload digest, payload preview and active turn.

This is an opt-in integration. It is **disabled by default** and is not ready for personal data.

## Runtime behavior

- `JARVIS_MEMORY_ENABLED` must be set to `1` before the memory runtime is loaded.
- On Windows, the built-in adapter uses Windows Credential Manager through `@napi-rs/keyring`. On another platform, `JARVIS_MEMORY_VAULT_MODULE` must point to an absolute local JavaScript module exporting `createVault()`.
- That module must return a vault adapter implementing:
  - `getSecret(name): Promise<Buffer | null>`
  - `createSecretIfAbsent(name, value): Promise<Buffer>`
- `createSecretIfAbsent` must be atomic across processes and return the single stored winner. A plain get-then-set implementation is not acceptable.
- The built-in adapter uses Windows Credential Manager generic credentials and stores the 32-byte key as a binary secret. A per-entry atomic lock serializes first-run creation across processes; waiters return the stored winner. A stale lock fails closed and requires manual inspection. No environment-variable, plaintext-file, PowerShell, or silent fallback is permitted.
- If the adapter is missing, invalid, unavailable, or the key is missing for an existing store, startup fails closed when memory is enabled.
- The encrypted store is placed at `~/.jarvis/memory/memory.enc`; metadata-only audit entries are appended to `~/.jarvis/memory/audit.jsonl`.
- One process owns the store. An atomic local lock directory prevents a second bridge process from opening the writer. A clean exit releases it; a crash leaves a stale lock that must be inspected and removed manually only after confirming no bridge process is alive. Per-WebSocket connections receive their own MCP server and confirmation transport.

## Model-facing tools

The `jarvis_memory` MCP server exposes search/save/update/delete operations. Sensitive records are hidden from model-facing search. Mutations require a trusted, correlated browser approval; model text or model-supplied flags cannot approve a write. The bridge policy allows these memory tools to reach the approval broker in read-only mode; the memory handlers still reject every mutation without the explicit dialog approval.

When a write is proposed, the UI displays the exact payload preview, operation, and target memory ID. Approval expires after 30 seconds. Denial, timeout, malformed reply, disconnect, mismatched metadata, or a user interrupt fails closed. Interrupting or abandoning a turn cancels outstanding approvals and dismisses their UI prompts.

The direct-browser backend does not load this local memory runtime.

## Enablement gate

Do not enable this feature until all of the following are true:

1. The built-in Windows Credential Manager adapter has passed CI integration tests and has been tested under the actual Windows account that runs Jarvis.
2. Concurrent first-run tests prove two processes receive the same key.
3. Missing/corrupt key behavior and encrypted-store recovery have been tested.
4. Windows ACLs on the memory directory and audit log have been verified.
5. A real UI approval test proves the displayed payload is exactly the payload written.
6. Bridge restart tests prove encrypted memory persists across process restarts.
7. Search isolation, retention, sensitive-memory denial, deletion, and backup/restore have been verified.
8. The exclusive writer lock and stale-lock recovery procedure have been tested on the target Windows filesystem.

Until those gates pass, leave `JARVIS_MEMORY_ENABLED` unset and use synthetic data only. The CI adapter test uses a disposable Windows runner credential; it does not prove the user's own Windows profile, Credential Manager policy, or ACL configuration is compatible. The feature is a guarded integration foundation, not a production-ready memory service.


## Automated validation

GitHub Actions run [#42635395490](https://github.com/laurofiorenzani/jarvis/actions/runs/42635395490) completed successfully on both Ubuntu and Windows using Node 24. Ubuntu ran **115 tests: 113 passed, 0 failed, 2 skipped**; Windows ran **115 tests: 114 passed, 0 failed, 1 skipped**. Both TypeScript/Vite production builds succeeded. The Windows-only native test successfully wrote, read, and deleted a disposable 32-byte credential through Windows Credential Manager. The lockfile update job also completed successfully, with write permission isolated from the test matrix. This covers concurrent startup/writer-lock tests, cancellation of pending approvals when a turn is interrupted, and denial of undeclared memory MCP tools.

This validates the current integration code and its synthetic test fixtures. It does not validate a real Windows Credential Manager adapter, target-PC permissions, or real user-data operation; those remain explicit release gates above.


## Validation

The integration branch's cross-platform workflow [#42634588630](https://github.com/laurofiorenzani/jarvis/actions/runs/42634588630) passed on Ubuntu and Windows with Node 24. Each platform reported **110 passed, 0 failed, 1 skipped**; `npm run build` also passed on both platforms. The workflow covers the complete existing test suite, memory modules, policy boundary, bootstrap locking, and production TypeScript/Vite build.

This validates the guarded integration code, not the missing native Windows vault adapter or the release gates above.
