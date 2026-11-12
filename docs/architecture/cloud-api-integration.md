# Cloud API integration contract

Status: authentication/session client, memory approval panel, conversation client, and SSE parser are implemented in the preview branch. Live browser E2E and production rollout remain pending.

## Runtime configuration
- `VITE_SUPABASE_URL`: public Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: public anon/publishable key only; never a service-role key.
- `VITE_SUPABASE_FUNCTION_NAME`: defaults to `jarvis-api`.

These variables are configured only for the preview branch `work/jarvis-amber-production-track`. Production has not been changed.

## Authentication boundary
`src/lib/cloud-auth.ts` provides password sign-in, project-scoped session persistence, refresh-token renewal, access-token freshness checks, and sign-out. The UI never asks the user to paste credentials into a chat. The API validates the bearer token with Supabase Auth and derives the user ID server-side. Never accept a user ID supplied by the browser as an ownership boundary.

## Memory boundary
- Preference is OFF unless the signed-in user explicitly enables it.
- Candidate creation is explicit; chat turns do not auto-save memory.
- Candidate approval/rejection is explicit and server-side scoped to the current user.
- Retrieval is limited to approved, normal-sensitivity facts and is performed only when preference is enabled.
- The UI must distinguish pending candidates from approved memory.

## API routes exposed by `src/lib/cloud-api.ts`
- `GET /provider-status`
- `GET|POST /conversations`, `GET|DELETE /conversations/:id`
- `POST /turns` (SSE) and `POST /turns/cancel`
- `GET|PUT /memory-preferences`
- `GET /semantic-memory/candidates`
- `POST /semantic-memory/candidates`
- `PUT /semantic-memory/candidates/:id`
- `GET /semantic-memory/search?q=...`

## Remaining release gates
1. Implement sign-in/sign-out/session refresh and secure session persistence with Supabase Auth.
2. Wire the cloud conversation lifecycle and streaming `POST /turns` into the main conversation experience; the typed client methods and SSE frame parser now exist.
3. Added the exact stable preview branch alias to the Edge Function CORS allowlist (function version 31); verify preflight from the deployed browser preview.
4. Validate with two distinct real accounts: no cross-account conversation, memory, or candidate visibility.
5. Memory tab now includes explicit opt-in and candidate approve/reject controls; verify both accounts independently and keep opt-in off until each owner chooses.
6. Verify FreeLLMAPI provider routing through provider-status and a real authenticated turn; do not expose provider keys in Vite variables.
7. Only then consider production rollout.
