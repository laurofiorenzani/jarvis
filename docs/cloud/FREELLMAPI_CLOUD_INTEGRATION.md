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
5. **Provider consent and data transfer.** The owner has authorized use of his own data with eligible free providers. The spouse's account remains separately gated: do not send her personal content to external providers until she accepts the provider/data-transfer notice in her own account. This is not a blocker for owner-only synthetic smoke tests.
6. **No billing.** Disable paid catalog features, paid provider paths, paid fallbacks, paid overage, automatic upgrades, and trials that convert to paid. A provider that requires a payment method or cannot be hard-capped at zero spend stays disabled until zero-billing behavior is proven.
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

- The JARVIS model router in `supabase/functions/jarvis-api/model-router.ts` already accepts a server-configured list of HTTPS OpenAI-compatible endpoints, rotates the starting provider, and retries before streaming begins.
- That existing router is not yet a FreeLLMAPI integration. No FreeLLMAPI host, unified key, provider keys, private tunnel, or adapter credentials have been configured by this change.
- No provider inference request, personal prompt, or audio was sent during this documentation work.
- No production function, database, account, secret, or billing setting was changed.
- The feature branch contains this integration contract only; implementation and runtime verification remain outstanding.


## Implementation progress — 2026-11-13

- Added an explicit gateway: freellmapi provider kind to the server-side model router.
- FreeLLMAPI entries are accepted only from the separate JARVIS_MODEL_PROVIDERS_STANDARD secret, must use HTTPS, require a server-side apiKeyEnv, and must select a supported FreeLLMAPI router profile (auto, auto:fast, auto:smart, auto:reliable, fusion, or a named auto:<profile>).
- The adapter sends X-FreeLLM-Task-Type (auto, chat, or code) so FreeLLMAPI can bias its own routing while retaining its configured fallback chain and quota tracking.
- Provider diagnostics report the FreeLLMAPI gateway identity and pool without exposing credentials. A per-account provider-preferences API and CloudAccess controls let each account enable/revoke the ZDR and standard pools independently.
- The existing JARVIS_MODEL_PROVIDERS default pool is strict-ZDR only. The separate JARVIS_MODEL_PROVIDERS_STANDARD pool is used by authenticated turns only when that account has enabled the standard pool in its own provider preferences. If the standard pool fails before streaming, JARVIS falls back to the default pool only when the same account has also enabled the ZDR pool. The spouse's account remains off by default and is isolated.
- FreeLLMAPI is never labelled ZDR merely because its own gateway is self-hosted: downstream providers have independent retention and training terms. It is therefore isolated from the strict ZDR pool.
- Added unit tests for accepted/rejected routing profiles, multilingual task classification and task-type headers. The two-user integration test now verifies provider preferences default off, user A can enable/revoke their pools, and user B remains off.
- Updated JARVIS cloud client error messages to Brazilian Portuguese and added regression assertions.
- Current code commits: ae9d95bf316334026d74f911e7ba440a139a495b (router), 119bb48168977fce5f81d83d90182c925f11b036 (adapter tests), 937b6b3fc637aaa8f131319368e5bff81ab4e222 (pool isolation), 04c5ab75ab6848bf036f89b67292a5f3d7f03c68 (pt-BR translations), 276d1373e2c935c9651eb28523ec8d27a14d9fcd (locale tests).
- The FreeLLMAPI host, unified API key and provider credentials are not configured. No inference request has been sent and no user content has been routed through it.

### Infrastructure refresh

- Cloudflare account read-only inventory returned zero Workers scripts. Workers AI model search returned 75 records on its first page (40 text-generation entries); 9 explicitly carry require_workers_paid=true. Thirty-one text-generation entries lacked that explicit paid-only flag, but this is only a candidate list, not a verified free-plan allowlist. Pagination returned no additional records despite the API reporting 334 total catalog entries.
- Cloudflare's official July 28, 2026 notice confirms GLM-4.7-Flash, Gemma-4-26B-A4B-IT, and Nemotron-3-120B-A12B are among models available on Workers Free; models explicitly marked require_workers_paid=true must be excluded. The Cloudflare account billing plan remains unverified because the connected account lacks Billing Read permission.
- Supabase jarvis-preview-api remains v21 and production jarvis-api remains v32. No function deployment or secrets were changed during this code work.
- Vercel's latest READY deployment is still the documentation-only commit a2c1248e5a193436e33fd4a8e3b63f27df731909; no deployment of the newer adapter code has been confirmed.
- GitHub CI #853 was cancelled when subsequent commits superseded its head. A full exact-head CI run for the current branch head is still required before Preview deployment.
- Oracle Cloud is not exposed through an available connected account tool in this session. The previously mentioned VM and its runtime state remain unverified; no host has been provisioned.
- No production functions, production data, accounts, billing plans, secrets, branches or repositories were changed or deleted.
