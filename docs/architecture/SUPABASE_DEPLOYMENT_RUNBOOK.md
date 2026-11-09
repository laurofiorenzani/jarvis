# Supabase deployment runbook (free-tier capable)

This is a deployment recipe, not a deployed environment. The repository does
not contain a Supabase project reference, credentials, provider key, or user
data. The free plan is sufficient for an initial private prototype, subject
to Supabase's current quotas, inactivity/pause policy and regional availability.

## Architecture

- Supabase Auth verifies user identity and issues short-lived access tokens.
- Supabase Postgres stores conversations, messages and turn state.
- Row-level security isolates records by `auth.uid()`.
- The `jarvis-api` Edge Function validates the bearer token, derives the
  authenticated user from Supabase Auth, and performs scoped server-side writes.
- Anthropic credentials remain an Edge Function secret; they never enter Vite
  environment variables or the iOS bundle.
- Windows/local tools remain outside this cloud function.

## Setup required before deployment

1. Create a Supabase project on the free plan; do not select a paid compute tier.
2. Apply `supabase/migrations/20261109000100_jarvis_cloud_v1.sql`.
3. Deploy `supabase/functions/jarvis-api` with JWT verification enabled.
4. Set Edge Function secrets: `SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`,
   and optionally `JARVIS_MODEL` and `JARVIS_ALLOWED_ORIGIN`.
   Supabase supplies `SUPABASE_URL`; never put the service-role key in client
   config. Do not use `VITE_*` for any secret.
5. Configure an Auth provider and allowed redirect URLs. Start with email
   magic-link or email/password only after deciding the account recovery policy.
6. Restrict Auth signup if the instance is intended for one user; do not assume
   obscurity of the project URL provides access control.
7. Test user A cannot read or mutate user B's conversations, messages or turns.
8. Verify deletion, export, backup/restore, token revocation and rate limits
   before storing personal memory or enabling production use.

## Client endpoint and token adapter

The cloud API base URL is the full function endpoint, for example
`https://PROJECT_REF.supabase.co/functions/v1/jarvis-api`. The current
client appends `/v1/health`, `/v1/conversations`, `/v1/turns`, and
`/v1/turns/cancel`. The server accepts these versioned paths.

The client token provider must return a current Supabase access token from the
platform auth SDK. On iOS, credentials must be held by the native secure-storage
adapter (Keychain) and not localStorage. Refresh must be serialized and
revocation/sign-out must clear the native credential.

## Important implementation limits

- Model streaming and conversation persistence are implemented as a prototype.
  There is no first-party memory API, tool execution registry, device registry,
  usage metering, abuse detection, or administrative console yet.
- Cancellation is cooperative: the stream checks durable cancellation state
  between upstream chunks. It is not a hard real-time interruption guarantee.
- Rate limits, provider spend caps, retry budgets, audit logging and operational
  alerts must be added before a public release.
- The free tier is suitable for validation, not a promise of permanent free
  hosting or production availability. Do not upgrade automatically.
- No migration of local bridge history or encrypted memory is part of this
  runbook. Such migration needs a separate explicit approval and export plan.

## Implemented prototype rate limits

The Edge Function currently applies database-backed per-user limits of 30
conversation creations per hour and 10 turns per five minutes plus 60 turns
per hour. The limiter table is inaccessible to end-user roles; its RPC is
granted only to the service role. Old window records are pruned after two days.
These are initial abuse controls, not a substitute for provider spend budgets,
IP/device throttling or monitoring before public access.

The function config disables gateway-only JWT parsing so browser preflight and
public health requests can reach the handler. This is intentional: every
non-health route explicitly validates the bearer token with Supabase Auth
(`auth.getUser`) before any user-scoped operation. Do not remove that
application-level verification.
