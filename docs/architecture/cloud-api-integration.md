# Cloud API integration contract

Status: adapter foundation committed; authentication UI and live cloud session flow remain pending.

## Runtime configuration
- `VITE_SUPABASE_URL`: public Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: public anon/publishable key only; never a service-role key.
- `VITE_SUPABASE_FUNCTION_NAME`: defaults to `jarvis-api`.

These variables are configured only for the preview branch `work/jarvis-amber-production-track`. Production has not been changed.

## Authentication boundary
The client adapter accepts an access token from a future authenticated session provider. It does not persist tokens, refresh sessions, or create credentials. The API validates the bearer token with Supabase Auth and derives the user ID server-side. Never accept a user ID supplied by the browser as an ownership boundary.

## Memory boundary
- Preference is OFF unless the signed-in user explicitly enables it.
- Candidate creation is explicit; chat turns do not auto-save memory.
- Candidate approval/rejection is explicit and server-side scoped to the current user.
- Retrieval is limited to approved, normal-sensitivity facts and is performed only when preference is enabled.
- The UI must distinguish pending candidates from approved memory.

## API routes exposed by `src/lib/cloud-api.ts`
- `GET /provider-status`
- `GET|PUT /memory-preferences`
- `GET /semantic-memory/candidates`
- `POST /semantic-memory/candidates`
- `PUT /semantic-memory/candidates/:id`
- `GET /semantic-memory/search?q=...`

## Remaining release gates
1. Implement sign-in/sign-out/session refresh and secure session persistence with Supabase Auth.
2. Add cloud conversation lifecycle and streaming `POST /turns` using authenticated conversation/turn IDs.
3. Add the exact preview origin to the Edge Function CORS allowlist before browser calls are enabled.
4. Validate with two distinct real accounts: no cross-account conversation, memory, or candidate visibility.
5. Add UI opt-in and explicit candidate approval controls; do not pre-enable memory.
6. Verify FreeLLMAPI provider routing through provider-status and a real authenticated turn; do not expose provider keys in Vite variables.
7. Only then consider production rollout.
