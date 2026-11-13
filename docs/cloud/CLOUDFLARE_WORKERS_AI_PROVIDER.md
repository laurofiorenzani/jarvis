# Cloudflare Workers AI — JARVIS cloud provider

## Why this provider

The connected Cloudflare account exposes Workers AI model discovery. The current catalog includes models suitable for a zero-cost, server-side JARVIS runtime.

- Primary chat model: `@cf/google/gemma-4-26b-a4b-it` — 256k context, function calling, reasoning and vision. Cloudflare's 28 July 2026 Free-plan notice explicitly lists Gemma 4 among models available on Workers Free.
- Speech-to-text: `@cf/openai/whisper` — multilingual transcription and language identification; Cloudflare marks the model Zero Data Retention.
- Alternative chat candidate: `@cf/zai-org/glm-4.7-flash` — 131k context, function calling and reasoning; also listed as available on Workers Free.
- Do not select `@cf/nvidia/nemotron-3-120b-a12b`: its catalog lists planned deprecation on 20 November 2026.
- Do not assume every model in the catalog is free. For example, the account also exposes models that are not in Cloudflare's published Free-plan model list.

References:
- Workers AI Free-plan model availability: https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/
- OpenAI-compatible Workers AI endpoint: https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/
- Whisper model: https://developers.cloudflare.com/workers-ai/models/whisper/
- Workers AI data use: https://developers.cloudflare.com/workers-ai/platform/data-usage/
- Workers AI pricing and limits: https://developers.cloudflare.com/workers-ai/platform/pricing/

## Zero-cost guardrail — owner confirmation required

Workers Free includes 10,000 Neurons per day. When that daily free allocation is exhausted, Workers AI returns HTTP 429 / error 3036 until the quota resets. Workers Paid also includes the 10,000 daily allocation, but usage above it is billed.

**Only activate this provider after confirming the account is on Workers Free, not Workers Paid.** The connected Cloudflare tool can inspect the model catalog but does not have Billing Read permission, so the current account plan could not be verified. No inference request has been sent and no usage has been consumed by this audit.

If the account is on Workers Free, the daily limit fails closed rather than converting the JARVIS app into a paid service. Do not upgrade or enable paid billing to bypass quota exhaustion.

## Data handling and cross-border processing

Cloudflare states that standard, stateless Workers AI inference requests have zero data retention and that Customer Content is not used to train AI models. Operational metadata such as model IDs, timestamps, sizes, latency and neuron counts may still be retained. Do not enable AI Gateway content logging/caching or stateful features for this route. Third-party model licenses still apply; review the selected model's license.

**This is not an EU-only data-residency service.** Cloudflare's DPA governs processing of personal data and includes Standard Contractual Clauses for restricted international transfers; that is a transfer safeguard, not a promise that every inference request stays inside the EEA. The account owner must explicitly accept this cross-border processing before personal content is routed. Each JARVIS account holder must accept the provider notice in their own account; the owner must not pre-accept on behalf of the second account.

## Required Supabase Edge Function secrets

Create a Cloudflare API token with the minimum permission **Account → Workers AI → Read**. Do not paste the token into chat or a source file.

Add these secrets in the Supabase project's Edge Function secrets:

- `CLOUDFLARE_ACCOUNT_ID` — the Cloudflare account ID (32 hexadecimal characters).
- `CLOUDFLARE_API_TOKEN` — the scoped Workers AI token.

The same credentials serve the chat model router and Whisper STT. **Do not add these secrets yet.** First confirm Workers Free, accept the cross-border processing terms, and implement the per-account provider notice/acceptance gate. Each account must accept separately. The Supabase connector available to this session cannot inspect or set Edge Function secrets; the account owner must perform this step in the Supabase Dashboard after those gates are complete.

## Model router configuration

Set `JARVIS_MODEL_PROVIDERS` as a Supabase Edge Function secret. Replace the account ID placeholder with the account ID shown in Cloudflare. The API token is read only from the server-side secret named by `apiKeyEnv`.

```json
[
  {
    "name": "cloudflare-gemma-4-free",
    "baseUrl": "https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/ai/v1",
    "model": "@cf/google/gemma-4-26b-a4b-it",
    "tier": "free",
    "billingMode": "free_quota_only",
    "apiKeyEnv": "CLOUDFLARE_API_TOKEN",
    "privacyMode": "zdr"
  }
]
```

The direct Workers AI endpoint is used, not AI Gateway. Cloudflare's native zero-retention commitment applies to standard stateless inference; the JARVIS router rejects mixed privacy-tier failover and does not send OpenRouter-only routing flags to Cloudflare.

## Speech

- STT uses the Cloudflare Workers AI REST endpoint for `@cf/openai/whisper`, with automatic language detection and no transcript/audio logging.
- Native device speech remains the TTS default for Portuguese and English.
- Cloud TTS is disabled in this release because the available Cloudflare Aura 2 model in this account is English-only; do not route Portuguese text to it.
- The app detects Cloudflare's daily allocation error 3036 and cools down until 00:00 UTC rather than retrying every few minutes.

## Release verification

After the owner confirms Workers Free, the per-account notice/acceptance gate is implemented, both account holders have accepted, and the owner adds the secrets:

1. Check authenticated `GET /v1/provider-status` shows the Gemma model.
2. Run one synthetic, non-personal chat completion.
3. Run one short synthetic Whisper test in Portuguese and one in English.
4. Confirm the transcript is non-empty, a model turn completes, and native TTS is audible on the iPhone.
5. Inspect Cloudflare usage to confirm requests consume only the free daily allocation.

Do not use personal messages, memories or recordings for the first smoke test.
