# Google AI Studio provider for the cloud router

This is an optional configuration guide. It does not create a secret, enable a provider, or make a model call.

## Compatibility

The cloud model router accepts OpenAI-compatible Chat Completions endpoints. Google's Gemini API documents an OpenAI-compatible endpoint:

`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`

The router's URL normalizer accepts a full endpoint ending in `/chat/completions`, so use the complete URL above as `baseUrl`.

## Example configuration

The current Google pricing documentation lists `gemini-3.1-flash-lite` with free-tier input and output tokens. Confirm availability and quotas in the actual Google AI Studio project before enabling it; model access and limits can change.

Store these values as Supabase Edge Function secrets only:

- `GEMINI_API_KEY` — the Google AI Studio API key.
- `JARVIS_MODEL_PROVIDERS` — the JSON provider list:

```json
[
  {
    "name": "google-ai-studio-free",
    "baseUrl": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    "model": "gemini-3.1-flash-lite",
    "tier": "free",
    "billingMode": "free_quota_only",
    "apiKeyEnv": "GEMINI_API_KEY"
  }
]
```

The `tier` and `billingMode` fields are explicit operator assertions consumed by the router. They do not verify Google's account billing state or guarantee that requests cannot incur charges. Confirm the project is on the intended free tier and disable paid billing/upgrade paths if the goal is strictly zero-cost operation.

## Important privacy limitation

Google's published Gemini API pricing terms state that Free-tier content may be used to improve Google's products; Paid-tier content is not used for that purpose. Do not send private conversations, personal records, or approved JARVIS memories through a Free-tier provider unless the account owner explicitly accepts those terms. JARVIS's memory-context switch is off by default, but ordinary user prompts still reach the configured provider.

For private/personal production use, choose a provider and plan whose data-handling terms meet the required privacy standard. Do not treat a free quota as equivalent to private processing.

## Verification sequence

1. Confirm the model and free quota in Google AI Studio.
2. Review Google's current data-use terms for the account/project.
3. Add the two secrets in Supabase only after explicit approval.
4. Check `GET /provider-status` using an authenticated JARVIS session. This confirms declared configuration only.
5. Run one synthetic, non-personal, low-token inference and inspect the response. This is the first evidence of actual reachability; it still does not prove future quota availability.

The existing local FreeLLMAPI configuration is not automatically available to Supabase. Cloud provider credentials must be configured separately as server-side secrets.
