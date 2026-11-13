# FreeLLMAPI → JARVIS Cloud integration

Status: implementation decision and security contract; no gateway is deployed or connected yet.

## Objective

Use the official [FreeLLMAPI](https://github.com/tashfeenahmed/freellmapi) project as one multi-provider inference pool behind JARVIS. JARVIS remains the only user-facing assistant. The pool must preserve conversation context when a provider/model changes and must fail over automatically on eligible transient failures and exhausted free quotas.

FreeLLMAPI advertises a large catalog (currently described upstream as 87 providers and 1,313 endpoints). Those are catalog counts, not a promise that every endpoint is currently free, callable, available in Ireland/EEA, or permitted for this workload. The live usable set is the intersection of configured credentials, current provider terms, regional eligibility, model readiness, privacy policy, and actual free quota.

## Verified upstream constraints

The upstream README and architecture/install/API documentation were inspected on 2026-11-13:

- FreeLLMAPI exposes OpenAI-compatible `/v1/chat/completions` and related endpoints, and maintains a fallback chain, key quotas/cooldowns, and an encrypted SQLite key store.
- It is local-first and single-user by design; upstream explicitly says not to expose it to the internet.
- Its default Docker bind is loopback. The upstream documentation says exposing it on all interfaces is only for a trusted LAN because the proxy is single-user and guarded by the unified API key.
- Provider keys are encrypted at rest using AES-256-GCM; the unified API key authenticates inference requests.
- Free catalog installs receive a monthly snapshot that can lag the live catalog by 30 days. Premium live catalog is paid and must not be enabled.
- Upstream terms review is informational and dated May 2026; every provider must be revalidated before activation.

References:
- https://github.com/tashfeenahmed/freellmapi
- https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/install/01-install.md
- https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/api/01-rest-api.md
- https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/architecture/00-high-level-index.md

## Target topology

```text
iPhone / JARVIS UI
      |
      | Supabase user JWT (owner or spouse)
      v
JARVIS Cloud API (auth + per-user conversation/memory isolation)
      |
      | server-to-server request; bounded timeout; no client-visible gateway key
      v
Private JARVIS Provider Adapter
      |
      | authenticated private network/tunnel; no public dashboard
      v
FreeLLMAPI (single-user inference gateway)
      |
      +--> individually approved and eligible provider endpoints
```

The adapter is a trust boundary, not a second assistant. It must not accept arbitrary URLs, arbitrary provider configuration, or browser-originated gateway credentials. It must expose only the minimum inference operations needed by JARVIS.

## Required security properties

1. **No public FreeLLMAPI dashboard/API.** Do not publish port 3001 to the public internet. Do not rely on the unified API key as the only internet-facing security control.
2. **Private transport.** Prefer a private network or authenticated outbound tunnel from the gateway to the adapter. If a public HTTPS ingress is unavoidable, put a separate authenticated reverse proxy/WAF in front, restrict ingress to the adapter, enforce request-size/rate limits, and keep the dashboard unreachable. Do not treat an obscured URL as security.
3. **Server-side secrets only.** The FreeLLMAPI unified key and provider keys must never enter the iPhone bundle, browser storage, logs, Git, or user-visible API responses. Use secret storage on the hosting platform.
4. **Strict user isolation.** JARVIS authenticates the Supabase JWT and scopes conversation, memory, and tool data to that user before calling the provider adapter. Never use one account's authorization to route the other account's personal content.
5. **Provider consent and data transfer.** Consent is per account and per policy version. Both household accounts default to no external provider pool. Do not send either account's personal content to an external provider until that account holder explicitly accepts the current provider/data-transfer notice in JARVIS. Synthetic CI tests use only isolated synthetic accounts and content.
6. **No billing.** Disable paid catalog features, paid provider paths, paid fallbacks, paid overage, automatic upgrades, and trials that convert to paid. A provider that requires a payment method or cannot be hard-capped at zero spend stays disabled until zero-billing behavior is proven.
   The cloud model router additionally requires the exact server-side `JARVIS_FREE_PROVIDER_BILLING_ATTESTATION=2026-11-13-v1` secret before it will expose or invoke any provider. Set it only after the owner verifies the actual provider account plans and no-overage behavior. This operator attestation is separate from per-user privacy/data-transfer consent.
7. **Terms and geography.** A provider is eligible only if its current terms and regional availability permit this actual use from the user's actual location and for this private personal workload. Never spoof geography, rotate identities to evade quotas, bypass access controls, or resell/relay access for others.
8. **Privacy tier consistency.** Do not fail over from a stricter privacy/data-retention class to a weaker class without an explicit policy decision. Do not log prompts, completions, audio, credentials, or personal context in the adapter.
9. **Bounded operations.** Enforce request/response size limits, concurrency limits, provider attempt budgets, connection/read deadlines, cancellation propagation, and cooldowns. Never retry indefinitely.
10. **Audit without content.** Record request ID, selected provider/model, status class, latency, retry count, and quota/cooldown metadata. Exclude prompt/response bodies, user secrets, and personal identifiers.

## Routing and failover contract

- JARVIS selects a capability pool (chat/reasoning, coding, vision, embeddings, STT, TTS/media) before invoking the gateway. Do not assume every FreeLLMAPI provider supports every capability.
- The gateway's active fallback chain must be capability-compatible. Use named profiles/chains where supported, or separate gateway instances/configurations if the upstream implementation cannot guarantee capability isolation.
- Retry another provider for network/connect failures, timeouts, HTTP 408/409/425/429, and eligible 5xx responses, subject to a strict attempt/time budget.
- Do not blindly retry malformed requests (400/422), policy denials, unsupported models, or authentication/configuration failures (401/403). Mark the failing provider/key unavailable and continue only when the gateway can prove another eligible endpoint exists.
- If any answer bytes have been streamed to the client, do not restart the turn with another model and concatenate two answers. Return a structured interruption or finish the existing stream; a new provider attempt is safe only before user-visible output begins.
- Preserve the original conversation messages, tool definitions, response format, and relevant system instructions across provider changes. If a provider-specific context limit is lower, use a bounded, explicit context-compaction strategy; never silently drop recent user instructions.
- Report the actual provider/model used in safe diagnostics. Do not imply that all 87 upstream providers are connected.

## Zero-cost provider eligibility registry

Each provider/key must have an explicit record before it enters a live chain:

- provider and model identifier;
- capability support and context limit;
- actual free quota and reset window;
- whether a payment method is required;
- hard spending/overage controls and evidence;
- allowed user location/EEA status and personal-use restrictions;
- retention/training/data-transfer classification;
- terms URL and last-checked date;
- credential configured/health state;
- enabled/disabled reason.

Unknown, stale, ambiguous, paid, or geographically ineligible entries are disabled by default. Catalog discovery is not activation.

## Implementation sequence

1. **Adapter contract and tests:** define a narrow authenticated internal interface and contract tests for authentication, body limits, cancellation, timeouts, provider failure classes, and no content logging.
2. **Private gateway deployment assessment:** verify an actually available zero-cost host with persistent encrypted storage and outbound connectivity. Do not assume the previously mentioned Oracle VM exists or is running. Avoid Vercel serverless for the persistent Node/SQLite gateway unless its storage/runtime constraints are proven suitable.
3. **Harden FreeLLMAPI deployment:** pin a reviewed upstream release/commit; disable public dashboard access; configure encrypted database/key material and backups; configure a strong unified key; keep paid/live-catalog features disabled; add host-level firewall and monitoring.
4. **JARVIS adapter integration:** add server-to-server auth and a provider adapter to the Supabase Edge Function or a separate private service. Keep the current direct provider router as a separate pool/fallback option only where privacy and billing policies match.
5. **Owner-only synthetic smoke tests:** use non-personal prompts, validate one successful request, force a controlled 429/503 to prove fallback, verify context continuity, and verify no credentials or content appear in logs.
6. **Provider onboarding:** add only providers whose current terms, region, privacy, and zero-billing properties are verified. Add credentials through the provider's secure dashboard/secret manager, never through chat or Git.
7. **Spouse boundary:** leave her external-provider routing disabled until she accepts the notice herself. Her JARVIS account and existing data remain intact.

## Current state and explicit non-claims

- The canonical JARVIS model router supports server-configured HTTPS OpenAI-compatible providers, strict ZDR validation, provider rotation and pre-stream retry. The separate FreeLLMAPI integration and per-account provider-preferences implementation are in PR #23 and are not yet merged into canonical development. No FreeLLMAPI host, unified key, provider keys, private tunnel, or adapter credentials have been configured.
- No provider inference request, personal prompt, or audio was sent during this documentation work.
- No production function, database, account, secret, or billing setting was changed.
- PR #23 now contains the provider-preferences contract/client, Cloud Access controls, authenticated backend routes, separate pool routing and regression tests. Exact-head CI must be rerun after the latest branch update; no provider runtime or physical-device E2E has been verified.


## Implementation progress — 2026-11-13

- PR #19 merged a private Node 22 reverse proxy with a separate 256-bit JARVIS bearer token, upstream-key replacement, bounded requests, streaming, rate limits, metadata-only logging, and a fail-closed `FREELLMAPI_ALLOWED_MODELS` allowlist.
- PR #23 (ready for review; exact-head CI #948 passed) adds an explicit `gateway: freellmapi` provider kind to the server-side model router. FreeLLMAPI entries are accepted only from the separate `JARVIS_MODEL_PROVIDERS_STANDARD` secret, must use HTTPS, require a server-side `apiKeyEnv`, and must select a named `auto:<profile>` route. Generic `auto` and `fusion` are rejected by both the JARVIS router and private proxy. The named profile is an enforcement label, not proof of downstream provider eligibility.
- The adapter sends `X-FreeLLM-Task-Type` (`auto`, `chat`, or `code`) through the private proxy so FreeLLMAPI can bias routing while retaining its configured fallback chain and quota tracking.
- Current diagnostics expose only the FreeLLMAPI gateway identity and pool; the actual downstream provider and fallback count are not yet surfaced. PR #23 adds a per-account provider-preferences API and Cloud Access controls for independently enabling/revoking the ZDR and standard pools; both pools remain off by default until each account holder accepts policy v2.
- The `JARVIS_MODEL_PROVIDERS` default pool is strict-ZDR only. `JARVIS_MODEL_PROVIDERS_STANDARD` is used for authenticated turns only when that account enabled the standard pool. If standard fails before streaming, JARVIS may fall back to the default pool only if the same account also enabled ZDR. User A's consent cannot enable user B.
- FreeLLMAPI is never labelled ZDR merely because its own gateway is self-hosted: downstream providers have independent retention and training terms. It is therefore isolated from the strict ZDR pool.
- PR #23 adds tests for named-only routing profiles, multilingual task classification, task-type headers, provider-preference default-off behavior, per-account enable/revoke, and two-user isolation. Cloud client error messages use Brazilian Portuguese with regression assertions.
- The FreeLLMAPI host, unified API key and provider credentials are not configured. No inference request has been sent and no user content has been routed through it.

### Infrastructure refresh

- Latest Cloudflare API read on 2026-11-13: zero Workers scripts, zero AI Gateway gateways, credit balance 0, no default payment method, and automatic top-up threshold/amount both 0. The account's plan/Workers AI paid-tier entitlement remains unverified; do not infer it from the balance. Workers AI catalog entries without an explicit paid-only flag are candidates only, not a verified free-plan allowlist.
- Supabase `jarvis-preview-api` is ACTIVE v23 and Production `jarvis-api` is ACTIVE v32. No function deployment or secrets were changed during this code work.
- Vercel's latest READY deployment is still the documentation-only commit a2c1248e5a193436e33fd4a8e3b63f27df731909; no deployment of the newer adapter code has been confirmed.
- PR #23 exact-head GitHub CI #948 passed all stages, including local Supabase migrations, SQL isolation, two-user integration and CORS smoke tests. The separate Vercel Preview status was rate-limited by the Hobby 100-deployments/day cap; no paid upgrade was attempted.
- Oracle Cloud is not exposed through an available connected account tool in this session. The previously mentioned VM and its runtime state remain unverified; no host has been provisioned.
- No production functions, production data, accounts, billing plans, secrets, branches or repositories were changed or deleted.


## Official FreeLLMAPI catalog and API surfaces — 2026-11-13

- The official FreeLLMAPI README currently advertises 87 providers, 736 model families and 1,313 free endpoints. The free self-hosted install receives the monthly signed catalog snapshot; new entries can lag the live feed by up to 30 days. The same README lists the live catalog as a Premium feature at $19/year. JARVIS will use the free monthly snapshot only; no Premium key or subscription is enabled.
- FreeLLMAPI's router enforces per-key RPM/RPD/TPM/TPD quotas, cooldowns and up to 20 fallback attempts. It supports named fallback profiles, automatic task routing and a multi-model Fusion mode. The JARVIS adapter accepts only named auto:<profile> routes through the private proxy; generic auto and fusion routes are rejected. The approved example is auto:jarvis-approved, but its actual downstream fallback chain must be audited before activation.
- The upstream OpenAI-compatible surfaces include chat completions, Responses, completions, models, embeddings, image generation, video generation, audio speech and audio transcription. JARVIS currently integrates chat completions only. Voice transcription/speech, vision, images/video and embeddings are separate follow-up integrations and are not claimed as active.
- FreeLLMAPI exposes X-Routed-Via, X-Fallback-Attempts and X-Fallback-Trail response headers. The next observability step is to surface the actual served model and fallback count in JARVIS diagnostics without exposing prompts, provider keys or raw upstream error text.
- Provider keys are encrypted at rest in the gateway's SQLite database, and clients use one unified bearer key. This does not make the gateway multi-tenant: the official architecture explicitly says it is single-user/local-first and must not be exposed directly to the public internet. JARVIS therefore places a private authenticated ingress/proxy in front of it and keeps per-account authorization in Supabase.


## Private VM proxy package — 2026-11-13

- Added `ops/freellmapi-gateway/` with a Node 22 reverse proxy, Dockerfile, Compose overlay, environment template and deployment guide. It exposes only `GET /v1/models` and `POST /v1/chat/completions`; dashboard/admin/MCP routes remain blocked.
- The proxy validates a separate 256-bit JARVIS token and replaces it with the FreeLLMAPI unified API key. The unified key stays on the VM; only the JARVIS gateway token is configured as a Supabase Edge Function secret.
- The official FreeLLMAPI compose file binds host port 3001 to `127.0.0.1` by default. Keep that setting. The proxy connects over the private Docker network; do not set `HOST_BIND=0.0.0.0`.
- An optional Cloudflare Quick Tunnel exposes only the authenticated proxy, not the FreeLLMAPI dashboard. Its random `trycloudflare.com` hostname can change after restart; a named tunnel/domain is required for a permanent hostname.
- Proxy tests cover route allowlisting, token validation, upstream-key replacement, SSE streaming and body-size limits. GitHub CI #871 passed on exact code head `495549ade7c5777fca0f0dd5b0b5c38ec6f0eac7`, including build/typecheck, all tests, lint, provider privacy, semantic-memory, Deno typecheck, local Supabase migrations, SQL isolation, two-user API integration and production/preview CORS smoke tests.
- Deployment has not occurred: no VM is connected, no provider credentials have been configured, and no inference request or personal prompt has been sent.

The detailed VM procedure and server-side secret shape are in `ops/freellmapi-gateway/README.md`.


## Provider and regional data-processing disclosure — 2026-11-13

The Cloud Access consent text must not imply that a selected region guarantees all processing remains in that region, or that self-hosting FreeLLMAPI makes downstream providers zero-retention.

- Supabase project `Jarvis` is configured in `eu-west-3` (Paris). Supabase's Data Residency and Transfers FAQ (version 1, 2026-10-06) says the primary database, Auth, Storage objects and backups are in the selected region, but account/billing information, global support access, usage telemetry/service metadata and Storage CDN delivery can involve processing outside that region. Its DPA/SCCs govern applicable international transfers; region selection alone is not a GDPR compliance determination.
- Cloudflare Workers AI's data-usage documentation (updated 2026-10-16) states that standard stateless inference inputs/outputs are processed only as needed to provide the service and are not used to train models. It also documents exceptions for stateful features, configured logging/caching and operational metadata. This statement applies to Workers AI, not automatically to AI Gateway routes or third-party models.
- FreeLLMAPI is a router. Prompts can be forwarded to independent downstream providers whose own retention, training, region, terms and quotas apply. Its encrypted local key store and self-hosted gateway do not change downstream processing terms.
- Therefore, provider pool consent is per account and per policy version; default off. The UI must explain these boundaries before activation. Provider eligibility remains individually verified; unknown, paid, geographically ineligible or ambiguous providers remain disabled.

Official references checked 2026-11-13:
- Supabase Data Residency and Transfers FAQ: https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq
- Supabase DPA: https://supabase.com/legal/customer-resources/data-processing-addendum
- Supabase available regions: https://supabase.com/docs/guides/platform/regions
- Cloudflare Workers AI data usage: https://developers.cloudflare.com/workers-ai/platform/data-usage/


## Runtime verification refresh — 2026-11-13 16:20 UTC

- Supabase project `Jarvis` remains ACTIVE_HEALTHY in `eu-west-3` (Paris), PostgreSQL 17.11.0.018.
- Read-only SQL confirms provider-preferences table row count remains 0 and exactly two relevant migrations (`20261113125425`, `20261113125437`) are recorded as applied. No live migration or provider preference write was performed.
- Latest Supabase security advisor: one INFO `rls_enabled_no_policy` on `jarvis_rate_limits` (intentional service_role-only access model; no public policy added) and one WARN `auth_leaked_password_protection` disabled. The Auth security setting was not changed because it requires a separate security decision. Eighteen unused-index INFO findings remain; no indexes were removed.
- Latest Cloudflare API read confirms zero Workers, zero AI Gateway gateways, credit balance 0, no default payment method, and no automatic top-up. Account plan/Workers AI entitlement remains unverified.
- PR #23 is ready for review after exact-head CI #948 passed. It is not merged and no production deployment has occurred.


## Provider eligibility audit and production suitability — 2026-11-13

### Upstream FreeLLMAPI limitations

The official upstream README currently advertises 87 providers, 736 model families and 1,313 free provider/model endpoints. Free installs receive the signed monthly catalog snapshot; a model may arrive up to 30 days after it enters the live feed. The live catalog is a paid Premium feature ($19/year), excluded by JARVIS's €0 recurring-cost rule.

More importantly, upstream explicitly describes FreeLLMAPI as a personal experimentation/learning project, says free tiers are not a stable supported inference substrate, and advises swapping in paid APIs before shipping a real product. That warning conflicts with JARVIS's production-reliability target. Therefore FreeLLMAPI may be used only as a controlled personal prototype/experimental inference route while its terms and providers permit it. Do not treat it as a production availability guarantee, 24/7 critical brain, or sole assistant backend. Keep a fail-closed path and a separate production architecture decision. No paid API is an acceptable default under this project's cost policy; an open-weight self-hosted route must be evaluated on already-available free compute before claiming production readiness.

### Curated fallback-chain rules

The official named-profile docs confirm that auto:<profile> resolves a specific profile; a missing/empty profile must fail rather than fall through to the global catalog. New profiles can start empty. For JARVIS:
- Create a profile from an empty chain and add only individually reviewed model/provider pairs.
- Set auto_include_new_models = 0; catalog sync must never silently add a new provider to an approved chain.
- Do not use plain auto, fusion, a global catch-all chain, or the entire free catalog for JARVIS personal data.
- Keep the exact profile name and provider/model membership in a versioned manifest; the name auto:jarvis-approved is not evidence of approval.
- Verify personal-use/proxy terms, free quota and reset, payment-method requirement, overage/paid fallback behavior, Ireland/EEA eligibility, retention/training, processing region, source URL and review date for every route.

### Initial provider screening (not an activation allowlist)

| Provider/route | Evidence found | JARVIS decision |
|---|---|---|
| Groq Free tier | Free-tier rate limits are documented. Developer-tier upgrade requires a valid payment method. Inference inputs/outputs are not retained by default, but reliability/abuse troubleshooting may retain them for up to 30 days unless ZDR is enabled; customer data is stored in US GCP buckets. | Candidate for separately consented standard pool only after verifying no-card free access, account billing lock, personal-use terms and exact model quota. Not ZDR in the current JARVIS router. |
| Cerebras Free | Official pricing page lists a $0 Free tier with lower rate limits. The separate Developer/PayGo tier uses a one-time $5 promotional credit that requires a valid payment method. | Free tier is only a research candidate; Developer/PayGo is excluded. Verify no-card access, negative-balance behavior, retention/region and personal-use terms before any use. |
| Cloudflare Workers AI | Official pricing lists 10,000 Neurons/day on Workers Free; usage above that requires Workers Paid and is billed at $0.011/1,000 Neurons. Some named models require a paid billing method. | Only explicitly eligible models within the free daily allocation may be considered. Paid-only models and any upgrade/overage path are forbidden. Current account plan entitlement remains unverified; no inference was sent. |
| Kilo Gateway | FreeLLMAPI platform notes say prompts and outputs are logged for training. | Exclude from all JARVIS pools. |
| OVHcloud AI Endpoints | Anonymous route is documented at roughly 2 requests/minute/IP; authenticated access requires a Public Cloud project with a payment method on file. | Authenticated route excluded. Anonymous route is not approved without current terms, region and quota validation. |
| Sail | Free monthly credit is conditional on a payment method and usage beyond credit can be charged. | Exclude. |
| SambaNova | Free tier retired; payment method required after its one-time trial credit. | Exclude. |
| Reka | New accounts require prepaid credits; no free tier. | Exclude. |
| OpenCode Zen | Free roster is locked to the OpenCode client; FreeLLMAPI marks it unavailable/disabled for generic routing. | Exclude. |
| NVIDIA NIM | Upstream FreeLLMAPI ToS review marks the free access evaluation-only. | Not approved for production personal-assistant traffic. |
| OpenRouter free models | :free models are identifiable, but every model/provider still needs independent region, retention, terms and availability review. | Candidate only; do not assume all OpenRouter routes are ZDR or EEA-only. |

This matrix is a screening snapshot, not legal advice or a live quota attestation. No provider is approved for activation by this table.

### Official sources checked 2026-11-13
- FreeLLMAPI README and production caveat: https://github.com/tashfeenahmed/freellmapi/blob/main/README.md
- FreeLLMAPI architecture and limitations: https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/architecture/00-high-level-index.md
- FreeLLMAPI named fallback profiles: https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/fallback/01-named-chains.md
- FreeLLMAPI supported platforms: https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/providers/01-supported-platforms.md
- Groq data controls, retention and US data location: https://console.groq.com/docs/your-data
- Groq paid-tier payment method requirements: https://console.groq.com/docs/billing-faqs
- Cerebras pricing tiers: https://inference-docs.cerebras.ai/support/pricing
- Cloudflare Workers AI pricing and daily free allocation: https://developers.cloudflare.com/workers-ai/platform/pricing/

### Current activation state
Both JARVIS account pools remain disabled by default. No provider keys/secrets were read or created, no FreeLLMAPI host was deployed, no inference request was sent, and no payment method, paid tier, credit or subscription was added. Provider activation remains blocked on a reviewed exact-chain manifest and explicit per-account consent.


### Downstream-chain attestation is a pre-inference gate

FreeLLMAPI's X-Routed-Via and X-Fallback-Trail headers are emitted after the gateway has already routed the request. They are useful for diagnostics, but checking them in the JARVIS proxy after the response cannot prevent an unapproved downstream provider from having already received the prompt. X-Fallback-Trail lists failed attempts in a bounded/truncated response header; it is not a preventive privacy boundary.

Before sending any personal content, the active named profile's exact provider/model membership must be independently verified before inference (for example by a read-only gateway manifest/config attestation or startup validation against the gateway's actual profile database). The attestation must fail closed if missing, stale, truncated, or mismatched; auto_include_new_models must remain disabled. Until this exists and is tested, keep standard provider routing disabled for real personal data and limit any gateway tests to synthetic/non-sensitive prompts.
