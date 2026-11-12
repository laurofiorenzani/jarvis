# JARVIS cloud personal memory

## Status

The cloud memory store is deployed to the configured Supabase project. It is separate from conversation history and is not populated automatically.

## Storage and isolation

- `public.jarvis_memories` stores user-approved records in the categories `preference`, `project`, `workflow`, and `fact`.
- Each record is scoped to an authenticated Supabase user.
- Row Level Security is enabled; authenticated clients have read-only table grants and can select only rows where `user_id = (select auth.uid())`.
- Direct client writes are revoked. Create, preference changes, and deletion go through the authenticated Edge Function, which validates the bearer session and scopes every service-role query by the authenticated user ID.
- The internal rate-limit table is accessible only to `service_role`; it has no client grants or client-facing RLS policy.
- Expired records are excluded from list and model context. Users can delete individual records.
- This is authenticated cloud storage with Supabase-managed protections. It is **not end-to-end encrypted**: the cloud function can read the records, and selected records are sent to the configured model provider only when the user enables memory context.

## Multiple household members

- Jarvis Cloud authenticates each person with an individual Supabase account; Isabelle can use her own account on her own device once that account is provisioned.
- Memories, conversations, preferences, and rate limits are scoped to the authenticated user ID. One household member cannot read or manage another member's personal records through the current API.
- A shared family workspace or shared household memory is **not implemented**. Do not share one login between spouses; that would combine identity and personal data rather than provide controlled sharing.
- The current Cloud Access screen supports sign-in, not self-service account registration or spouse invitations. An administrator must provision the second account before Isabelle can sign in.

## Explicit controls

- Saving a record is a separate, manual action in the Cloud Access panel.
- Memory context is off by default in `jarvis_memory_preferences`.
- The user must explicitly enable **Include approved memories in JARVIS replies**.
- When enabled, up to 20 non-expired records are selected, with a combined context budget of 6,000 characters.
- Context is limited to the user's own records. Saved text is treated as untrusted data, not instructions.
- Disabling the switch stops future memory injection. It does not delete saved records.
- Deleting a record removes it from future memory retrieval; already transmitted provider requests cannot be recalled.

## Model provider cost safety

The model router rejects provider entries unless each entry explicitly declares both `tier: "free"` and `billingMode: "free_quota_only"`. This is a fail-closed configuration check, not independent proof of a provider's billing state. The provider account must also have paid billing disabled or a hard spending limit of zero. Do not configure paid fallback endpoints.

Example provider entry shape (use only after verifying the provider account's free-only billing controls):

```json
[
  {
    "name": "groq-free",
    "baseUrl": "https://api.groq.com/openai/v1",
    "model": "openai/gpt-oss-120b",
    "tier": "free",
    "billingMode": "free_quota_only",
    "apiKeyEnv": "GROQ_API_KEY"
  }
]
```

The example describes a configuration shape, not proof that a key or provider is configured. Secret values must only be set in Supabase Edge Function secrets, never in chat or client-side code.

## Limitations

- Memory context is a bounded list, not semantic retrieval yet.
- It is not automatically summarized or deduplicated.
- The browser's volatile token store is lost on reload; native secure token persistence and iOS packaging remain separate work.
- Provider invocation has not been verified end to end until a real authenticated turn succeeds.
