# JARVIS — handoff for the next ChatGPT conversation

Last updated: 2026-11-12 (UTC)
Repository: https://github.com/laurofiorenzani/jarvis
Active work branch: `work/jarvis-amber-production-track`
Main UI PR: https://github.com/laurofiorenzani/jarvis/pull/7 (draft; do not merge automatically)

## User instruction
Continue autonomously across independent workstreams wherever safe. Do not ask for routine approval. Stop and ask only for critical actions that affect production, billing, secrets, account security, or irreversible personal data. User and wife must have separate accounts and isolated data.

## Current verified state
- Latest previously completed CI on this branch passed install, production build/typecheck, tests, and lint (run 43274522744; commit 16c2a891f8bc27c74d8b61f8cc2886b9b01462e1).
- Supabase project is active; `jarvis-api` Edge Function version 31 is deployed.
- CloudMemoryPanel provides Supabase email/password login, per-account memory consent, pending fact review, approved-memory search, provider status, and an isolated cloud model test console.
- Cloud memory remains opt-in. Do not enable it on behalf of either account.
- Cloud test console is not yet the main voice/chat brain. Existing bridge backend provides MCP tools, camera capture, UI events, and device integrations; do not replace it with cloud text streaming until feature parity or an explicit hybrid design exists.
- Vercel preview deploys were blocked by the free daily deployment limit: `api-deployments-free-per-day` (100+; retry after 24h). Last READY deployment is older than current branch changes. Do not call current branch deployed.
- No authenticated end-to-end memory workflow has yet been verified in the live browser.
- Semantic memory retrieval currently uses PostgreSQL full-text search, not vector embeddings.
- PRs #4, #5, and #7 remain draft/unmerged; do not merge or change production without explicit approval.

## Latest code change
- Fixed a confirmed SSE parsing defect in `src/lib/cloud-api.ts`: subsequent streamed frames now split on the actual blank-line delimiter, not a literal backslash-n sequence.
- Commit: `cf2d82d1a0e459bc904456677163763def0d1a94`.
- Confirm CI for this commit before proceeding.

## Next work — prioritize parallel, low-risk tasks
1. Confirm CI on the latest commit; inspect logs if any job fails.
2. Add unit tests for SSE framing: multiple frames in one chunk, frames split across chunks, CRLF, trailing final frame, malformed JSON, and abort.
3. Review CloudMemoryPanel and cloudAuth for token refresh, sign-out, race conditions, stale state, and cross-account isolation.
4. Verify Edge Function CORS/preflight and route contracts against the frontend client.
5. Add authenticated integration tests for two users: account A cannot read, approve, reject, search, or delete account B data.
6. Design (do not blindly switch) a hybrid main-brain adapter preserving bridge MCP tools, camera capture, UI push events, and cancellation.
7. Retry Vercel preview deployment only when the rate limit window has elapsed; verify actual deployment URL and test it before claiming success.
8. Continue device adapters (BMW, Blink, Dreame, lighting), communications, and Family CFO only after secure foundations and real credentials/consent are available.

## Safety / release rules
- Never put secrets, access tokens, passwords, or personal records in GitHub issues, commits, or ChatGPT messages.
- Never enable memory automatically or merge family accounts.
- Never merge draft PRs, alter production auth settings, production secrets, or irreversible DB state without explicit user approval.
- Label simulated, visual-only, unverified, and connected states accurately.
