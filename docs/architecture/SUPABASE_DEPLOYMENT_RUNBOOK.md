# Supabase deployment runbook (free-tier capable)

This runbook describes the deployed cloud-first prototype and its remaining
owner-only setup gates. As of 10 November 2026, the Supabase `Jarvis` project
(`undmhmdwhxvjgvezvucy`, region `eu-west-3`) is ACTIVE_HEALTHY on the Free
plan. The `jarvis-api` Edge Function is active (version 17), with application-
level Supabase Auth bearer validation, production-origin CORS and the required
`apikey` CORS header. Its public health route and production CORS are covered
by a passing deployed smoke test. The deployed function files match the
working branch.

The Vercel `jarvis` project is on the Hobby plan. SSO deployment protection
has been disabled as explicitly authorised. The stable public PWA origin is
`https://jarvis-lauro-fiorenzani.vercel.app`; the app's Supabase Auth login
remains the user-level access gate. The production origin serves the PWA
manifest and service worker. The web/PWA route is the approved cross-device
release fallback for desktop and both iPhones; native iOS remains a later
enhancement.

This does **not** yet prove that a real user can complete sign-up/sign-in, that
a model provider is configured, or that a model response can be generated and
persisted. Supabase Auth has **two existing user accounts** as verified by a count-only,
read-only query on 10 November 2026. Preserve both accounts: do not recreate,
delete, invite again, or change either account as part of routine deployment.
The `public` conversation, message, turn, and memory tables currently contain
zero rows; no personal conversations or memories have been migrated or seeded.
No model-provider secrets have been added. The free plan is suitable for a low-traffic prototype, subject to
Supabase's quotas, inactivity/pause policy and regional availability.

## Architecture

- Supabase Auth verifies user identity and issues short-lived access tokens.
- Supabase Postgres stores conversations, messages and turn state.
- Row-level security isolates records by `auth.uid()`.
- The `jarvis-api` Edge Function validates the bearer token, derives the
  authenticated user from Supabase Auth, and performs scoped server-side writes.
- Model-provider credentials remain Edge Function secrets; they never enter Vite
  environment variables or the iOS bundle. The router only calls explicitly
  configured HTTPS OpenAI-compatible endpoints.
- Windows/local tools remain outside this cloud function.

## Setup required for a fresh environment

1. Create a Supabase project on the free plan; do not select a paid compute tier.
2. Apply `supabase/migrations/20261109000100_jarvis_cloud_v1.sql`.
3. Deploy `supabase/functions/jarvis-api`. The function performs explicit
   Supabase Auth bearer-token validation itself; see the JWT note below.
4. Set Edge Function secrets: `SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `JARVIS_MODEL_PROVIDERS`, each provider's
   API-key secret (if required), and optionally `JARVIS_ALLOWED_ORIGIN`.
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

## Client authentication adapter

`src/lib/cloud-auth.ts` now implements password sign-in, refresh-token rotation,
access-token expiry checks and local sign-out. It requires an injected
`SecureTokenStore`; it does not default to localStorage, cookies or filesystem
storage. The refresh token is the only credential persisted by the adapter;
the access token remains in memory. The iOS integration must provide a
Keychain-backed store before sign-in is enabled in the mobile UI.

## Email verification link protection

The Supabase Auth logs on 10 November 2026 showed successful invite-email
sends followed by repeated `/auth/v1/verify` requests returning
`One-time token not found`. Supabase documents that corporate email security
scanners can prefetch single-use confirmation and recovery links, consuming
the token before the person opens the message. JARVIS now includes a
human-click interstitial at `/auth/email-link`; it validates that the embedded
URL belongs to this Supabase project and redirects only after an explicit
button click. It does not consume or auto-open the token during page load.

**Owner action still required in Supabase Dashboard:** in
**Authentication → Email Templates**, update the link in each relevant
template (Confirm signup, Invite user, and Reset password) to point to the
interstitial while retaining Supabase's generated confirmation URL:

```html
<a href="{{ .SiteURL }}/auth/email-link#confirmation={{ .ConfirmationURL | urlquery }}">
  Continue to JARVIS
</a>
```

Keep `{{ .ConfirmationURL }}` as the source of the one-time URL. It is carried in the URL fragment, so the browser does not send the token to Vercel in the HTTP request. Do not
manually construct the `/auth/v1/verify` URL or expose a token in any other
place. Set the Auth Site URL to
`https://jarvis-lauro-fiorenzani.vercel.app` and ensure that exact origin is
in the allowed redirect URL list. The interstitial currently accepts only
this production origin and this project's Supabase Auth host.

The same logs also recorded `429 over_email_send_rate_limit` responses from
`/auth/v1/recover`. Do not repeatedly request reset emails while this limit
is active. Wait for the built-in email quota window to reset, or configure
custom SMTP in **Authentication → SMTP Settings** to control delivery and
raise the limit. If custom SMTP has click tracking, disable it for Auth emails
because link rewriting can break one-time tokens. No SMTP credentials or Auth
settings have been changed by this work.

## Free-plan operating constraints (checked 9 Nov 2026)

Supabase currently lists two active free projects, 500 MB database per project,
50,000 monthly active users, 5 GB egress and 500,000 Edge Function invocations.
Free projects pause after one week of inactivity. Hosted Edge Functions have a
150-second wall-clock limit on the Free plan (and a 150-second request idle
timeout). The model request is therefore bounded to 130 seconds in this
prototype. This is appropriate for a low-traffic prototype, not an always-on
production SLA.

References: [Supabase billing and quotas](https://supabase.com/docs/guides/platform/billing-on-supabase),
[Edge Function limits](https://supabase.com/docs/guides/functions/limits).

## Manual deployment (no paid resources)

For this existing project, the Vercel web/PWA deployment and Supabase Edge
Function are already active. Vercel handles frontend deployments from the
connected GitHub branch; Supabase backend deployments remain explicitly
operator-controlled. The steps below are for recovery or a separate fresh
environment—do not re-run the migration on the existing project without first
checking its migration state.

1. In Supabase SQL Editor, run the migration file in
   `supabase/migrations/20261109000100_jarvis_cloud_v1.sql`.
2. Install/use the Supabase CLI locally, authenticate with `supabase login`,
   link the project with `supabase link --project-ref YOUR_PROJECT_REF`, then
   deploy with `supabase functions deploy jarvis-api`.
3. In the Supabase Dashboard, add Edge Function secrets
   `JARVIS_MODEL_PROVIDERS` and `JARVIS_ALLOWED_ORIGIN`, plus the API-key
   secrets referenced by the provider configuration. Never paste secret values
   into ChatGPT, source code, Vite environment variables or GitHub commits.
4. Verify `GET /functions/v1/jarvis-api/v1/health` returns
   `{"version":1,"status":"ok"}` and test with two separate Auth users before
   enabling the mobile client.

### Free model provider routing

The cloud function uses `supabase/functions/jarvis-api/model-router.ts`.
It rotates through a server-side ordered list of OpenAI-compatible endpoints
and retries the next endpoint when a provider is unreachable, rate-limited,
or returns a server error before streaming starts. It does not switch models
mid-answer after text has been delivered, because doing so could duplicate or
contradict the response. Provider keys are resolved from Supabase secrets and
never sent to the client.

Set `JARVIS_MODEL_PROVIDERS` to a JSON array in preferred order. Every
entry must explicitly declare `tier: "free"` and
`billingMode: "free_quota_only"`; the router rejects entries that omit them.
Example privacy-first OpenRouter configuration:

```json
[
  {
    "name": "OpenRouter-Free-ZDR",
    "baseUrl": "https://openrouter.ai/api/v1",
    "model": "openrouter/free",
    "tier": "free",
    "billingMode": "free_quota_only",
    "apiKeyEnv": "OPENROUTER_API_KEY",
    "privacyMode": "zdr"
  }
]
```

When `privacyMode` is `"zdr"`, JARVIS sends OpenRouter's
`provider: { "zdr": true, "data_collection": "deny" }` request options. The
router accepts this mode only for the official `openrouter.ai` host with a
configured server-side key, and rejects mixed ZDR/standard provider lists so
failover cannot silently weaken privacy. OpenRouter documents that request-
level `zdr: true` can still admit its separate Safety Retention tier unless
the account or a guardrail is configured for ZDR-only routing. Before sending
personal conversations, set the OpenRouter account privacy setting to ZDR-only
and exclude Safety Retention; otherwise do not claim strict zero retention.
If the ZDR key or route is unavailable, the request fails rather than falling
back to a retaining endpoint.
OpenRouter's Free plan currently offers free models with a 50-request/day cap
(20/minute); model availability and quota can change. OpenRouter states that
it does not train on customer data, and ZDR routing is available on every plan.
This does not provide EU-only processing: the Free plan has no EU in-region
routing guarantee. Do not use it for data that must remain in the EU. See the
[official ZDR guide](https://openrouter.ai/docs/guides/features/zdr) and
[provider-routing reference](https://openrouter.ai/docs/guides/routing/provider-selection).

References: [OpenRouter free models](https://openrouter.ai/collections/free-models),
[OpenRouter pricing and privacy](https://openrouter.ai/pricing),
[OpenRouter ZDR routing](https://openrouter.ai/docs/guides/get-started/sovereign-ai).

For each `apiKeyEnv`, create a Supabase Edge Function secret with that exact
name. Entries without `apiKeyEnv` are allowed only for endpoints that genuinely
permit unauthenticated access. The router rejects non-HTTPS endpoints and
URL-embedded credentials. It tries only configured entries; it cannot create
accounts, mint credits, or turn paid API access into free access.

Free quotas, model IDs, regional eligibility and provider terms change. Verify
that each configured account/model is currently free for your account and
region before adding it. DeepSeek, xAI/Grok, OpenAI and Anthropic APIs must not
be assumed free merely because their consumer chat products have free plans.
Do not add a paid API key or paid endpoint. The router intentionally has no
implicit paid-provider fallback. FreeLLMAPI can serve as one endpoint if it is
hosted and reachable over HTTPS; its self-hosted router still needs compute,
so do not deploy it to a paid host under this project.

### FreeLLMAPI cloud-hosting assessment (10 Nov 2026)

Do not deploy the standalone FreeLLMAPI dashboard/API as a public, always-on
multi-user service for JARVIS under the zero-cost constraint.

Reasons:
- FreeLLMAPI documents its server as a single-user service protected by one
  unified API key. Its own deployment guidance warns against exposing it
  publicly. JARVIS has two separate authenticated users, so a shared upstream
  key must never become a user-facing account boundary.
- FreeLLMAPI stores provider credentials and configuration in an encrypted
  SQLite database that requires a persistent volume and stable encryption key.
  A container with an ephemeral filesystem is not a safe deployment.
- Vercel Hobby Sandboxes are not an always-on host: the documented maximum
  continuous session is 45 minutes on Hobby, and traffic to exposed ports can
  be billable. They are therefore not a verified zero-cost production host
  for this service.
- The Supabase organization and Jarvis project are already on the Free plan.
  The existing `jarvis-api` Edge Function includes a server-side, ordered
  OpenAI-compatible provider router. It can call free-tier provider endpoints
  directly over HTTPS, stream the response, and keep provider keys in Edge
  Function secrets. This is the safer cloud equivalent for the current
  two-user architecture; it does not require a separate FreeLLMAPI server.

Keep FreeLLMAPI as a local developer/provider experimentation tool. For cloud
JARVIS, prefer direct provider entries in `JARVIS_MODEL_PROVIDERS` (for
example the Google AI Studio configuration in
`docs/cloud/GOOGLE_AI_STUDIO_PROVIDER.md`). Only configure providers whose
account-side free quotas and data-use terms have been checked. The router's
`tier=free` and `billingMode=free_quota_only` labels are assertions, not
billing enforcement. A strictly zero-cost setup must not have paid billing or
automatic paid fallback enabled.

The existing Google AI Studio key in the Windows FreeLLMAPI installation is
not available to Supabase automatically. Cloud activation requires the owner
to add a provider key as an Edge Function secret in the Supabase Dashboard;
never copy it into GitHub, ChatGPT messages, or browser code. The Supabase
connector available to this workflow cannot create or inspect Edge Function
secrets, so secret entry is an owner-only gate. Do not use Google AI Studio's
Free tier for private family conversations unless you accept its data-use
terms; its free-tier prompts may be used to improve Google products. For the
OpenRouter ZDR option above, create a free OpenRouter API key and add it as
`OPENROUTER_API_KEY`; no paid credits are required for the `:free` model
route. Do not add paid billing or a paid fallback.

This deployment remains a free-tier prototype, not a guaranteed always-on
service: Supabase Free projects may pause after inactivity and Edge Function
requests have a 150-second wall-clock limit. No paid service or billing
upgrade is approved.
