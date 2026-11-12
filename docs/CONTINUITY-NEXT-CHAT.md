# JARVIS — handoff for the next ChatGPT conversation

Last updated: 2026-11-12 (UTC)
Repository: https://github.com/laurofiorenzani/jarvis
Active work branch: `work/jarvis-amber-production-track`
Main UI PR: https://github.com/laurofiorenzani/jarvis/pull/7 (draft; do not merge automatically)

## User instruction
Continue autonomously across independent workstreams wherever safe. User explicitly authorized broad development autonomy and memory work for their own account. The wife's account must remain independent and must not have memory enabled without her own consent. Preserve account isolation. Avoid irreversible production changes; additive reversible maintenance is allowed within the user's explicit autonomy instruction.

## Current verified state
- Latest UI PR #7 remains OPEN and DRAFT; base `main`. Do not merge automatically.
- Active branch head before the latest documentation update: `1d5e3cbe99b858602d229aec344d3e281fc28bf7`.
- GitHub Actions run `43278833174` completed SUCCESS for commit `fdf65c7e24399868a629a603a3daa326af1b7a91`: npm ci, TypeScript/Vite production build, tests, and lint all passed. This includes the SSE stream cancellation implementation and PR-triggered CI workflow.
- GitHub Actions run `43278949364` completed SUCCESS for commit `beab81377c6c34f1acfe94691f67402f9364b7bd`: npm ci, TypeScript/Vite production build, tests, and lint all passed.
- Subsequent documentation and sign-out error-reporting commits advanced the PR head to `2ee3abf61029268e3968aaf478b48fd0e980f0d1`. No run was returned for that exact SHA at the time of this update; confirm CI for the newest head before merging or promoting.
- Supabase project `Jarvis` (`undmhmdwhxvjgvezvucy`, eu-west-3) is ACTIVE_HEALTHY.
- Production `jarvis-api` Edge Function is ACTIVE, version 31, `verify_jwt=false`; the handler itself manually validates every bearer token using Supabase Auth before all authenticated routes. Health and OPTIONS are handled separately.
- The active Supabase database has RLS enabled on all JARVIS application tables. The rate-limit table intentionally has no client RLS policy; only server/service-role code should access it.
- Memory preference audit: exactly one preference row exists and `context_enabled=true`. This is the user's own previously opted-in account; do not enable the wife's account. There are currently zero rows in `jarvis_memories` and `jarvis_memory_facts`; therefore retrieval is enabled but there are no saved personal facts yet.
- Automatic memory candidate extraction is NOT implemented yet. Candidate creation remains an explicit authenticated API operation. The user has authorized development of automatic memory, but the safe implementation must be a separate per-account opt-in, create provenance-linked PENDING candidates only, exclude sensitive/restricted content and secrets, and never auto-approve.
- The cloud test console is not yet the main voice/chat brain. Existing bridge backend provides MCP tools, camera capture, UI events, and device integrations; do not replace it with cloud text streaming until a tool-calling hybrid adapter has parity and fallback tests.
- Vercel preview deployment quota previously blocked deployments with `api-deployments-free-per-day` (>100/day). The latest branch head has not yet been confirmed in a READY Vercel deployment. Do not retry deployment until the quota window has elapsed. A READY deployment for an earlier commit is not proof that current branch code is live.
- No authenticated end-to-end memory workflow has yet been verified in a live browser with both household accounts.
- Semantic memory retrieval currently uses PostgreSQL full-text search, not vector embeddings.
- Supabase security advisor reported leaked-password protection disabled (WARN). No tool is available here to change this Auth setting; document and direct the owner to Supabase Auth settings when required. The RLS-no-policy INFO on `jarvis_rate_limits` is intentional service-role-only isolation.
- PRs #4, #5, and #7 remain draft/unmerged; do not merge without explicit approval.

## Latest code and infrastructure work
- Refactored SSE frame splitting into `src/lib/sse-frames.js`, with TypeScript declarations in `src/lib/sse-frames.d.ts`.
- `src/lib/cloud-api.ts` now consumes streamed frames with LF/CRLF support, chunk-boundary buffering, multiline data fields, final-frame flushing, and correct reader cancellation.
- Added seven Node built-in tests in `src/lib/sse-frames.test.mjs`: multiple frames, chunk boundaries, CRLF, final frame, malformed JSON boundary, AbortSignal cancellation, and reader cancellation after callback/parser failure.
- Added `pull_request` triggers (opened, synchronize, reopened, ready_for_review) for PRs targeting `main` in `.github/workflows/jarvis-preview-validation.yml`; CI now runs for PR updates and can be observed via the commit workflow-run connector.
- Supabase performance advisor found eight unindexed semantic-memory foreign keys. Added and applied the additive, reversible migration `20261112182117_jarvis_memory_foreign_key_indexes`; all eight indexes were verified present. The advisor no longer reports unindexed foreign keys; remaining INFO findings are unused indexes (expected while these tables are new/empty).
- The migration is tracked in GitHub at `supabase/migrations/20261112182117_jarvis_memory_foreign_key_indexes.sql`, matching the applied Supabase migration version.
- Static review of `CloudMemoryPanel.tsx` and `cloud-auth.ts` found identity-generation guards around account-scoped async UI updates and revision checks around delayed sign-in/refresh/sign-out. Sign-out now catches remote revocation failures and reports that local sign-out has completed rather than producing an unhandled rejection. This is not a substitute for two-account browser E2E.
- Static review of the production Edge Function confirmed that conversation lookup, message history, cancellation, candidate listing/decisions, and approved-memory retrieval filter by the authenticated `userId`; candidate inserts derive `user_id` from the validated bearer token, never from browser input.
- CORS explicitly allows the current branch Vercel preview hostname on `jarvis-api`; allow headers match the frontend client (`apikey`, `authorization`, `content-type`, `x-jarvis-api-version`). Still verify an actual browser preflight from a READY deployment.
- Local git clone could not run because this execution environment cannot resolve github.com. Use GitHub Actions as the authoritative build/test environment.

## Next work — prioritize parallel, low-risk tasks
1. Confirm GitHub Actions run for the newest branch head; inspect failed logs and fix regressions.
2. Continue account-switch tests for overlapping refresh/sign-in/sign-out, and add tests for CloudMemoryPanel stale async responses.
3. Verify Edge Function CORS/preflight and route contracts from the exact READY preview origin once Vercel quota permits.
4. Add authenticated integration tests for two distinct users: account A cannot read, approve, reject, search, or delete account B data.
5. Design a separate opt-in automatic memory candidate extraction preference. Do not deploy or enable automatic extraction until the candidate pipeline is tested with provenance, sensitivity filtering, pending-only state, and account isolation.
6. Design (do not blindly switch) a hybrid main-brain adapter preserving bridge MCP tools, camera capture, UI push events, panels/blades, cancellation, and error recovery.
7. Continue BMW, Blink, Dreame, lighting, communications, and Family CFO adapters only after secure foundations and real credentials/consent are available.
8. Retry Vercel preview deployment only when the rate limit window has elapsed; verify the exact deployed commit and test iPhone rendering before claiming success.

## Safety / release rules
- Never put secrets, access tokens, passwords, or personal records in GitHub issues, commits, or ChatGPT messages.
- Never enable memory for the wife's account without her own consent; never merge household accounts.
- Automatic memory may only create pending, provenance-linked, non-sensitive candidates after the relevant account explicitly opts in. Never auto-approve.
- Never merge draft PRs or alter production auth settings, provider secrets, or irreversible personal data without explicit approval.
- Label simulated, visual-only, unverified, and connected states accurately.
