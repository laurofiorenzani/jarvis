# Encrypted memory integration — development branch

## Scope

The memory foundation from the isolated workbench has been copied into this application on the separate branch `work/memory-integration`. The bridge can now compose a per-process encrypted store and expose a per-connection `jarvis_memory` MCP server. Browser approval messages are correlated to the exact operation, record ID, payload digest, payload preview and active turn.

This is an opt-in integration. It is **disabled by default** and is not ready for personal data.

## Safe local commands

- `npm run memory:doctor` runs a disposable Windows Credential Manager round-trip using a unique temporary credential and removes it afterward. It does not enable memory or create the real Jarvis memory key.
- `npm run bridge:memory` is the explicit opt-in launcher. It sets `JARVIS_MEMORY_ENABLED=1` for that bridge process only; the normal `npm run bridge` remains memory-disabled.

Do not use the opt-in launcher until you have reviewed the data scope, retention behavior, and the on-screen approval prompt. The doctor command can be run first without enabling the memory feature.

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



## Windows memory diagnostic

Run this on the actual Windows account that will run Jarvis:

```powershell
npm run memory:doctor
```

The diagnostic creates isolated, randomly named Credential Manager entries and synthetic data. It checks binary key round-trip, creates an encrypted store, makes a passphrase-encrypted backup, restores it into a second isolated Credential Manager entry, reads the synthetic record back through the production store loader, and deletes both temporary credentials. It does not read or alter the user's real memory store.

## Encrypted backup and restore

The development branch now includes a local, passphrase-encrypted backup format. It packages the encrypted memory store, the 32-byte Credential Manager key needed to decrypt it, and the metadata-only audit log inside an AES-256-GCM envelope. The envelope key is derived from a passphrase with scrypt (N=32768, r=8, p=1). The backup file does not contain the memory key in plaintext.

Commands (Windows PowerShell or Windows Terminal):

```powershell
npm run memory:backup
npm run memory:backup -- "E:/JarvisBackups/jarvis-memory.jmbak"
npm run memory:restore -- "E:/JarvisBackups/jarvis-memory.jmbak"
```

- The passphrase must be at least 16 characters. It is typed into a hidden terminal prompt, never supplied as a command-line argument, and is not stored by Jarvis. Use a strong randomly generated passphrase and keep it separately in a password manager.
- Backup and restore use the same exclusive `memory.writer.lock` as the bridge. Stop Jarvis before creating a backup; the operation fails rather than taking an inconsistent snapshot while the bridge is running.
- Restore refuses to overwrite an existing memory store or audit log. It requires an empty target and atomically inserts the recovered key only if Credential Manager has no key; if an existing key differs, restore fails closed.
- The restore operation validates the staged encrypted store through the production `MemoryStore` loader before moving it into place.
- The backup file itself is encrypted, but still store copies on a BitLocker-protected external drive or another protected destination. Do not send it through ordinary email or chat.
- The backup module is currently Windows-only because the integrated OS vault is Windows Credential Manager. No cloud backup service is configured.

This implementation is covered by synthetic cross-platform tests. It has **not** yet been exercised against the user's actual Windows profile, a real external drive, a real passphrase manager, or a production memory store. Keep personal data disabled until those checks and the remaining ACL/recovery release gates are complete.

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

GitHub Actions run [#42636299853](https://github.com/laurofiorenzani/jarvis/actions/runs/42636299853) completed successfully on both Ubuntu and Windows using Node 24. Ubuntu ran **115 tests: 113 passed, 0 failed, 2 skipped**; Windows ran **115 tests: 114 passed, 0 failed, 1 skipped**. Both TypeScript/Vite production builds succeeded. The Windows-only native test exercised two simultaneous first-run callers against Windows Credential Manager and verified both receive the same stored 32-byte key; the separate `npm run memory:doctor` command also passed on the Windows runner. The lockfile update job completed successfully, with write permission isolated from the test matrix. This covers concurrent startup/writer-lock tests, cancellation of pending approvals when a turn is interrupted, and denial of undeclared memory MCP tools.

This validates the current integration code and its synthetic test fixtures. It does not validate a real Windows Credential Manager adapter, target-PC permissions, or real user-data operation; those remain explicit release gates above.


## Validation

The integration branch's cross-platform workflow [#42634588630](https://github.com/laurofiorenzani/jarvis/actions/runs/42634588630) passed on Ubuntu and Windows with Node 24. Each platform reported **110 passed, 0 failed, 1 skipped**; `npm run build` also passed on both platforms. The workflow covers the complete existing test suite, memory modules, policy boundary, bootstrap locking, and production TypeScript/Vite build.

This validates the guarded integration code, not the missing native Windows vault adapter or the release gates above.

## Automated validation evidence

GitHub Actions run [#42644021691](https://github.com/laurofiorenzani/jarvis/actions/runs/42644021691) passed on both Ubuntu and Windows with Node 24:
- 131 tests discovered on each platform; 129 passed on Ubuntu and 128 on Windows, with 0 failures. The platform-specific skip counts were 2 on Ubuntu and 3 on Windows.
- Windows `npm run memory:doctor` passed the native Credential Manager binary secret round-trip and the complete passphrase-encrypted backup/restore cycle using two isolated Credential Manager entries and synthetic memory.
- The production build and lockfile check passed on both platforms.

This validates the implementation on a hosted Windows runner, not on the user's own Windows profile, device security policy, antivirus, or actual memory directory ACL. The user must still run `npm run memory:doctor` on the target PC before enabling personal memory. The branch remains opt-in and must not be merged or deployed without the remaining release gates.
## Audit log retention and shutdown

The local audit log is metadata-only and serialized across concurrent tool calls. It is capped at 1 MiB; when rotation is needed, the logger validates every existing line, retains only events within the 90-day window and at most 5,000 recent events, then atomically replaces the log before appending the new event. Malformed or non-metadata audit history fails closed and blocks the memory mutation rather than being silently discarded.

The memory runtime exposes an idempotent close operation. It waits for queued writes, clears plaintext records from the in-memory map, and zeroes its private encryption-key buffer. The bootstrap releases the exclusive writer lock only after the store has closed.