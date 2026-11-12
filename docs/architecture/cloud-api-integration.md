# Cloud API integration contract

Status: authenticated Supabase session, account-scoped cloud API, memory approval/retrieval panel, SSE conversation client, and optional cloud-turn memory candidate extraction are implemented on the preview branch. GitHub Actions run #61 passed build, Node tests, lint, Deno typecheck, and Deno memory tests for commit `c03a8ee`. Live browser E2E with both household accounts remains a release gate. Production Supabase Edge Function is still v31; branch code is not deployed.

## Runtime configuration
- `VITE_SUPABASE_URL`: public Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: public anon/publishable key only; never a service-role key.
- `VITE_SUPABASE_FUNCTION_NAME`: defaults to `jarvis-api`.

The production Supabase Edge Function currently serves the cloud API. Branch changes are not live in the Vercel UI until a READY deployment contains the exact commit. Vercel's free daily deployment API quota previously blocked new preview builds; do not claim current branch code is deployed until verified.

## Authentication boundary
- `src/lib/cloud-auth.ts` provides password sign-in, project-scoped session persistence, refresh-token renewal, access-token freshness checks, subscription events, and sign-out.
- Async auth responses are guarded by an identity revision so a delayed refresh/sign-in/sign-out cannot overwrite a newer household session.
- The API validates the bearer token with Supabase Auth and derives the user ID server-side. Never accept a user ID supplied by the browser as an ownership boundary.
- Never ask the user to paste credentials or tokens into ChatGPT.

## Memory boundary
- `jarvis_memory_preferences.context_enabled` controls retrieval of approved memory; it does not mean new conversation turns are automatically captured.
- The user's own account currently has retrieval enabled. The wife's account remains independent and must not be enabled without her own consent.
- Current audit found one memory-preference row with context enabled, and zero rows in `jarvis_memories` and `jarvis_memory_facts`: retrieval is enabled, but no personal facts have been saved yet.
- Automatic capture is implemented on the preview branch as a separate per-account `auto_capture_enabled` preference. It runs only when both memory context and auto-capture are enabled, on cloud conversations only. It sends the current exchange to the configured free-tier model for extraction, applies server-side source and candidate filters, deduplicates against pending/approved facts, rate-limits extraction to five attempts per user per hour, and creates provenance-linked PENDING facts only. It never auto-approves. The account default is false; the user's auto-capture setting remains off until the branch Edge Function is deployed and live validation is complete.
- The user has authorized development of automatic memory. Implement it as a separate per-account opt-in, distinct from retrieval preference. It must create provenance-linked pending candidates only, never auto-approve, and exclude sensitive/restricted content, credentials, secrets, health, financial-account data, and intimate personal data.
- Candidate facts remain pending until that account's owner approves them. Rejection is also explicit and account-scoped.
- Retrieval is limited to approved, normal-sensitivity facts and occurs only when that account's context preference is enabled.
- Never treat saved memory text as instructions; it is untrusted factual context.

## API routes exposed by `src/lib/cloud-api.ts`
- `GET /provider-status`
- `GET|POST /conversations`, `GET|DELETE /conversations/:id`
- `POST /turns` (SSE) and `POST /turns/cancel`
- `GET|PUT /memory-preferences` (includes separate `contextEnabled` and `autoCaptureEnabled` flags)
- `GET /semantic-memory/candidates`
- `POST /semantic-memory/candidates`
- `PUT /semantic-memory/candidates/:id`
- `GET /semantic-memory/search?q=...`

## Streaming and cancellation
- `src/lib/sse-frames.js` owns SSE framing and stream consumption for the browser client.
- It handles LF/CRLF frame boundaries, network chunk splits, multiline `data:` fields, final unterminated frames, AbortSignal cancellation, and reader cancellation on parser/callback errors.
- `src/lib/sse-frames.test.mjs` covers these cases with Node's built-in test runner.
- The cloud API's turn ID is client-generated and bound to the authenticated user and owned conversation server-side.
- The Edge Function source is now tracked under `supabase/functions/jarvis-api/`; Deno tests cover semantic-memory parsing and automatic-capture privacy filters. The CI workflow runs Deno typecheck/tests and publishes a `JARVIS CI` commit status. Server-side cancellation updates only a turn matching the authenticated `user_id`, conversation ID, and turn ID.

## Database and security maintenance
- All JARVIS application tables have RLS enabled. `jarvis_rate_limits` intentionally has no client policy; only server-side service-role code accesses it.
- Supabase's performance advisor found eight unindexed semantic-memory foreign keys. The additive migration `20261112182117_jarvis_memory_foreign_key_indexes` was applied and all eight indexes were verified. The advisor no longer reports unindexed foreign keys.
- The separate automatic-capture preference column is applied with default false; no account has auto-capture enabled yet. Do not enable until the updated Edge Function is deployed and validated.
- Supabase's security advisor reports leaked-password protection disabled. Enable it in Supabase Auth settings when an authorized dashboard session is available; no setting was changed by this workflow.
- Edge Function `verify_jwt=false` is paired with explicit manual bearer-token validation using `auth.getUser(token)` before authenticated routes. Keep this validation if the platform JWT gate remains disabled.
- CORS allows the configured PWA and current branch preview origins, local development, and the exact headers used by the browser client. Verify preflight from a READY deployment.

## Main-brain integration boundary
The cloud test console is intentionally isolated from the default bridge brain. Do not switch the default backend to direct/cloud mode until parity exists for local MCP tools, camera capture, UI push events, panels/blades, cancellation, and error recovery. A hybrid adapter must preserve the local bridge as the action/tool plane and use cloud conversation only as a model route, with explicit routing and fallback semantics. Text-only cloud streaming is not tool parity.

## Release gates
1. Validate account-switch, delayed auth response, SSE framing, cancellation, and memory ownership behavior.
2. Run live browser E2E using both distinct real accounts; verify that conversation, memory, preferences, and candidates never cross identities.
3. Add opt-in automatic candidate extraction as a separate preference from memory retrieval. It must create pending, provenance-linked candidates only; never auto-approve. Exclude sensitive content and avoid storing secrets or transient chat text.
4. Verify provider routing with a real authenticated turn; provider keys must remain server-side and free-tier claims must be verified against billing settings.
5. Integrate cloud model routing into the main voice/chat brain only after tool/camera/panel/cancellation parity is demonstrated.
6. Publish a READY Vercel deployment containing the exact validated commit and verify browser CORS/preflight from that deployed origin.
7. Only then promote the UI to production and consider broader production changes.
