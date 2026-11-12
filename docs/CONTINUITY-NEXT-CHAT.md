# JARVIS — handoff for the next ChatGPT conversation

Last updated: 2026-11-12 (UTC)
Repository: https://github.com/laurofiorenzani/jarvis
Active work branch: `work/jarvis-amber-production-track`
Main UI PR: https://github.com/laurofiorenzani/jarvis/pull/7 (draft; do not merge automatically)

## User instruction
Continue autonomously across independent workstreams wherever safe. Do not ask for routine approval. Stop and ask only for critical actions that affect production, billing, secrets, account security, or irreversible personal data. User and wife must have separate accounts and isolated data.

## Current verified state
- Latest previously completed GitHub Actions CI on this branch passed install, production build/typecheck, tests, and lint (run 43274522744; commit 16c2a891f8bc27c74d8b61f8cc2886b9b01462e1).
- Commit cf2d82d1a0e459bc904456677163763def0d1a94 fixed the subsequent SSE frame delimiter. The commit's combined status only reports the Vercel deployment quota failure; the workflow-run lookup returned no GitHub Actions run for that SHA.
- Supabase project is active; `jarvis-api` Edge Function version 31 is deployed.
- CloudMemoryPanel provides Supabase email/password login, per-account memory consent, pending fact review, approved-memory search, provider status, and an isolated cloud model test console.
- Cloud memory remains opt-in. The user's account's retrieval preference was enabled by explicit instruction in a previous session; do not enable it for the wife's account.
- Cloud test console is not yet the main voice/chat brain. Existing bridge backend provides MCP tools, camera capture, UI events, and device integrations; do not replace it with cloud text streaming until feature parity or an explicit hybrid design exists.
- Vercel preview deploys are blocked by the free daily deployment limit: `api-deployments-free-per-day` (100+; retry after 24h). Do not call current branch deployed. Do not retry until the quota window has elapsed.
- No authenticated end-to-end memory workflow has yet been verified in the live browser.
- Semantic memory retrieval currently uses PostgreSQL full-text search, not vector embeddings.
- PRs #4, #5, and #7 remain draft/unmerged; do not merge or change production without explicit approval.

## Latest work in this continuation
- Refactored SSE frame splitting into `src/lib/sse-frames.js`, with TypeScript declarations in `src/lib/sse-frames.d.ts`.
- Updated `src/lib/cloud-api.ts` to support LF and CRLF separators, frames split across network chunks, multi-line data fields, and a final unterminated frame; decoder is flushed at EOF.
- Added `src/lib/sse-frames.test.mjs` with five Node built-in tests for multiple frames, chunk boundaries, CRLF, final-frame flush, and malformed JSON handling.
- These changes were written to `work/jarvis-amber-production-track` in commits:
  - `2697a608d661a201b85a7e2fa15fa288e38d3f19` — SSE client refactor
  - `0a76cd1f78b2dcc4594f6f945f2a6ccd6a19d0c8` — parser helper
  - `1ac460141fc7f37e363179d8831a27b899ff5a53` — TypeScript declarations
  - `9aced4cd89b6e99966053acd303e501280bddf86` — parser tests
- Files were fetched back from the active branch and their contents verified. However, CI has NOT yet been observed for these commits; do not claim tests/build pass until GitHub Actions reports it. The commit-status endpoint currently shows only the Vercel quota failure.
- A static review of `CloudMemoryPanel.tsx` and `cloud-auth.ts` confirmed identity-generation guards around account-scoped async UI updates and refresh-token race handling. Continue deeper review; this is not a substitute for two-account E2E.

## Next work — prioritize parallel, low-risk tasks
1. Find and verify GitHub Actions run for the latest branch commit; inspect logs if any job fails. If no run starts, inspect workflow triggers and safely add a CI trigger for branch pushes/PR synchronization.
2. Run `npm test`, `npm run build`, and `npm run lint` in a real checkout or CI. Fix any failures before calling the SSE work validated.
3. Add a stream-level test for AbortSignal cancellation and ensure the response reader is cancelled/released on parser errors.
4. Review CloudMemoryPanel and cloudAuth for token refresh, sign-out, race conditions, stale state, and cross-account isolation.
5. Verify Edge Function CORS/preflight and route contracts against the frontend client.
6. Add authenticated integration tests for two users: account A cannot read, approve, reject, search, or delete account B data.
7. Design (do not blindly switch) a hybrid main-brain adapter preserving bridge MCP tools, camera capture, UI push events, and cancellation.
8. Retry Vercel preview deployment only when the rate limit window has elapsed; verify actual deployment URL and test it before claiming success.
9. Continue device adapters (BMW, Blink, Dreame, lighting), communications, and Family CFO only after secure foundations and real credentials/consent are available.

## Safety / release rules
- Never put secrets, access tokens, passwords, or personal records in GitHub issues, commits, or ChatGPT messages.
- Never enable memory automatically or merge family accounts.
- Never merge draft PRs, alter production auth settings, production secrets, or irreversible DB state without explicit user approval.
- Label simulated, visual-only, unverified, and connected states accurately.
