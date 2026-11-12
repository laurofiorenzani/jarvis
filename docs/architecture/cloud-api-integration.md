# Cloud API integration contract

Status: authenticated Supabase session, account-scoped cloud API, memory approval/retrieval panel, and SSE conversation client are implemented on the preview branch. CI validates TypeScript, production build, regression tests, and lint. Live browser E2E with both household accounts remains a release gate.

## Runtime configuration
- `VITE_SUPABASE_URL`: public Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: public anon/publishable key only; never a service-role key.
- `VITE_SUPABASE_FUNCTION_NAME`: defaults to `jarvis-api`.

The production Supabase Edge Function currently serves the cloud API. The latest account-isolation and auth-race fixes are committed to `work/jarvis-amber-production-track`; they are not yet confirmed in a Vercel deployment. Vercel's free daily deployment API quota recently blocked new preview builds. Do not report branch code as live UI until a READY deployment contains the exact commit.

## Authentication boundary
- `src/lib/cloud-auth.ts` provides password sign-in, project-scoped session persistence, refresh-token renewal, access-token freshness checks, and sign-out.
- Async auth responses are guarded by an identity revision so a delayed refresh/sign-in/sign-out cannot overwrite a newer household session.
- The API validates the bearer token with Supabase Auth and derives the user ID server-side. Never accept a user ID supplied by the browser as an ownership boundary.
- Never ask the user to paste credentials or tokens into ChatGPT.

## Memory boundary
- `jarvis_memory_preferences.context_enabled` controls retrieval of approved memory; it does not mean new conversation turns are automatically captured.
- The user's own account currently has retrieval enabled by explicit instruction; the other household account remains unchanged and disabled until its owner opts in.
- There are currently no saved legacy memories or semantic facts for the user's account.
- Candidate creation is currently an explicit API operation; chat turns do not automatically create candidates yet.
- Candidate facts remain pending until that account's owner approves them. Rejection is also explicit and account-scoped.
- Retrieval is limited to approved, normal-sensitivity facts and occurs only when that account's context preference is enabled.
- Do not auto-approve extracted facts. Sensitive categories (health, financial account credentials, authentication secrets, intimate data, and other sensitive personal data) must be excluded from automatic extraction unless a separate explicit consent and policy design exists.

## API routes exposed by `src/lib/cloud-api.ts`
- `GET /provider-status`
- `GET|POST /conversations`, `GET|DELETE /conversations/:id`
- `POST /turns` (SSE) and `POST /turns/cancel`
- `GET|PUT /memory-preferences`
- `GET /semantic-memory/candidates`
- `POST /semantic-memory/candidates`
- `PUT /semantic-memory/candidates/:id`
- `GET /semantic-memory/search?q=...`

## Main-brain integration boundary
The cloud test console is intentionally isolated from the default bridge brain. Do not switch the default backend to direct/cloud mode until parity exists for local MCP tools, camera capture, UI push events, panels/blades, cancellation, and error recovery. A hybrid adapter must preserve the local bridge as the action/tool plane and use cloud conversation only as a model route, with explicit routing and fallback semantics.

## Release gates
1. Validate account-switch, delayed auth response, SSE framing, cancellation, and memory ownership behavior.
2. Run live browser E2E using both distinct real accounts; verify that conversation, memory, preferences, and candidates never cross identities.
3. Add opt-in automatic candidate extraction as a separate preference from memory retrieval. It must create pending, provenance-linked candidates only; never auto-approve. Exclude sensitive content and avoid storing secrets or transient chat text.
4. Verify provider routing with a real authenticated turn; provider keys must remain server-side and free-tier claims must be verified against billing settings.
5. Integrate cloud model routing into the main voice/chat brain only after tool/camera/panel/cancellation parity is demonstrated.
6. Publish a READY Vercel deployment containing the exact validated commit and verify browser CORS/preflight from that deployed origin.
7. Only then promote the UI to production and consider broader production changes.
