# J.A.R.V.I.S. — Personal Cloud Assistant

JARVIS is a single personal assistant with an amber holographic interface, cloud-hosted conversation and memory, multilingual voice, and secure integrations. The user speaks or writes directly to JARVIS. **JARVIS itself is the only assistant and control surface. There are no Apple Shortcuts, Siri Shortcuts, or manual shortcut workflows.**

## Project authority

Read **[JARVIS_MASTER_RECORD.md](./JARVIS_MASTER_RECORD.md)** before changing code. It is the single authoritative record for product decisions, architecture, repository/branch inventory, verified progress, blockers, approvals and handoff instructions. Update it after every meaningful change so work can resume without relying on chat history.

## Product invariants

- Preserve the current amber holographic HUD and visual identity.
- Cloud-first: iPhone connects directly to the cloud. Windows is development/admin only; no Windows relay or local Node process is required for normal use.
- Preserve existing owner and spouse accounts. Keep their sessions, conversations, memory and integrations strictly separated.
- Portuguese and English are first-class languages (pt-BR default, en-GB/en-US selectable).
- Durable JARVIS-owned cloud memory and project continuity; do not rely on ChatGPT conversation memory.
- Native iOS app is the final mobile deliverable. PWA/browser builds are interim and must not be represented as a finished native app.
- Direct integrations are the target. Vendor apps may be used for initial account linking/consent, not as the ordinary user-facing assistant workflow.
- Use already-configured free/approved model providers first. No paid APIs, subscriptions or provisioning without explicit approval.
- Autonomous diagnostics and isolated code proposals are allowed; production changes, merges, deployments, account changes, destructive actions and external messages require the relevant approval.

## Current implementation

The codebase is React + TypeScript + Vite with a Three.js holographic interface. The cloud foundation uses Supabase Auth, a server-side Edge Function and a provider router. The current integration candidate is tracked in [PR #12](https://github.com/laurofiorenzani/jarvis/pull/12); it is not yet the production release.

Do not assume a feature is shipped merely because its design or prototype exists. Consult the master record for the verified/unverified matrix, exact commit references, CI evidence and release blockers.

## Development and validation

Use Node.js 22+ and npm.

```bash
npm ci
npm run build
npm test
npm run lint
```

The CI workflow also validates provider privacy routing, Supabase Edge Function types, migrations and two-user memory isolation. Run the complete workflow before merging an integration branch.

## Security

- Never commit API keys, provider credentials, Supabase service-role keys, passwords, session tokens, private keys or recovery codes.
- Provider credentials stay server-side. Browser bundles may contain only public Supabase client configuration.
- All user data is scoped to the authenticated user and enforced server-side with row-level security and authorization checks.
- The model cannot grant itself permissions. Tool calls must pass typed capability allowlists, policy checks, audit and approval gates.
- Never delete branches or repositories until their unique work has been migrated, tested and verified against the master record.

## Continuity

At the beginning of every JARVIS work session, read the latest master record and reconcile live GitHub, CI, Supabase and deployment state. At the end of each meaningful task, record the exact changes, commit, tests, evidence and next action in the same canonical project record.
