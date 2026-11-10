# JARVIS first-time setup

## Public web/PWA address

Open:

`https://jarvis-lauro-fiorenzani.vercel.app`

The production site is public, but the assistant's cloud routes require a valid
Supabase Auth user session. There are no default credentials and no users have
been pre-created.

## Supabase Auth configuration

In Supabase Dashboard:

1. Open **Authentication → Providers → Email** and ensure email/password
   sign-up is enabled.
2. Open **Authentication → URL Configuration** and set:
   - **Site URL:** `https://jarvis-lauro-fiorenzani.vercel.app`
   - **Redirect URLs:** add `https://jarvis-lauro-fiorenzani.vercel.app/**`

Keep email confirmation enabled unless the owner deliberately changes the
account-recovery policy. The app requests a redirect back to the current
production origin after email confirmation. After both accounts have been
created and tested, disable public new-user sign-up in Supabase Auth settings
to prevent arbitrary additional registrations; existing sign-ins continue to
work.

## Create the two separate accounts

1. Open the JARVIS address above.
2. Choose **Create account**.
3. Register with the owner's own email address and a unique password.
4. Complete the email confirmation if Supabase requests it, then sign in.
5. Repeat the same process separately using Isabelle's own email address and
   her own password.

Do not share one login between the two people. Supabase assigns each account a
different user ID; conversations and memories are scoped to that user. The
project currently has zero Auth users, so no account-isolation test can be
claimed until both accounts are registered and exercised.

## Install on iPhone

Use Safari (not an in-app browser):

1. Open the production address.
2. Tap **Share**.
3. Choose **Add to Home Screen**.
4. Keep the name as JARVIS and tap **Add**.
5. Launch JARVIS from the new Home Screen icon and sign in with that person's
   own account.

On desktop, use the browser's **Install JARVIS** / **Install app** option if it
is offered. Otherwise the normal responsive website remains fully usable.

## Enable the cloud model

The cloud API is deployed and healthy, but no model-provider key has been
configured. The existing local FreeLLMAPI key is not a cloud credential.

Privacy-first free option documented in
`docs/architecture/SUPABASE_DEPLOYMENT_RUNBOOK.md`:

- Create an OpenRouter account and API key.
- Add `OPENROUTER_API_KEY` as a Supabase Edge Function secret.
- Add `JARVIS_MODEL_PROVIDERS` as a Supabase Edge Function secret using the
  runbook's `openrouter/free` example with `privacyMode: "zdr"`.

The router sends OpenRouter's `provider.zdr: true` and
`provider.data_collection: "deny"` controls, and accepts ZDR mode only for the
official OpenRouter host with a server-side key. Important: OpenRouter says
request-level ZDR can still admit its separate Safety Retention tier unless
the account or a guardrail is configured for ZDR-only routing. Before using
private family conversations, set the OpenRouter account privacy mode to
**ZDR only** and exclude Safety Retention. If you cannot verify that setting,
do not treat the route as strict zero-retention. If no eligible free endpoint
is available, JARVIS fails closed rather than downgrading to standard routing.

OpenRouter Free is quota-limited and does not provide EU-only routing; do not
send data that must remain in the EU. Do not buy credits or enable paid billing
for this prototype.

Never paste API keys into ChatGPT, GitHub, source code, Vite variables, or the
browser. Add them only in Supabase Dashboard → Edge Functions → Secrets.

## What is not enabled yet

- Model inference until the owner adds and verifies a provider secret.
- Server-side tool execution and permission registry.
- My BMW, Blink, Dreame and other vendor integrations.
- Native iOS app / CarPlay. The responsive web/PWA is the approved release
  fallback and does not depend on a Windows PC remaining online.
