# FreeLLMAPI integration

JARVIS can use FreeLLMAPI as an **optional local inference provider** for the
Windows/macOS/Linux bridge. The default remains the existing Claude Code login.
The browser never receives the FreeLLMAPI key.

## Why this is local-only

FreeLLMAPI exposes an Anthropic-compatible Messages API as well as its
OpenAI-compatible API. The local bridge uses the Anthropic-compatible surface
through the existing Claude Agent SDK, preserving the JARVIS tools and stream
contract. The default FreeLLMAPI address is `http://127.0.0.1:3001`.

The bridge deliberately accepts only loopback URLs for this provider. It will
refuse public HTTPS hosts, LAN IPs, URL credentials, paths, query strings, and
fragments. This prevents the unified API key from being forwarded to a remote
gateway accidentally.

The Supabase cloud runtime is separate: it cannot reach a FreeLLMAPI instance
bound to the user's `localhost`. Cloud mode uses only an operator-configured
HTTPS provider in Supabase Edge Function secrets. Do not expose the local
FreeLLMAPI port to the Internet or bind the JARVIS bridge to a LAN interface.

## Local setup

1. Install and start FreeLLMAPI on the same computer as the JARVIS bridge.
2. In the FreeLLMAPI dashboard, add only provider credentials whose current
   terms and account settings provide a free quota. Do not add paid custom
   endpoints or configure a billable fallback chain.
3. Create a unified FreeLLMAPI key in its local dashboard.
4. Set these variables in the shell that starts JARVIS (or in your private
   bridge environment file, if you load one yourself):

   ```text
   JARVIS_PROVIDER=freellmapi
   FREELLMAPI_BASE_URL=http://127.0.0.1:3001
   FREELLMAPI_API_KEY=freellmapi-your-unified-key
   FREELLMAPI_MODEL=auto
   ```

5. Start JARVIS normally. The bridge logs the selected provider and model, but
   never prints the API key.

To return to the existing Claude Code login, unset `JARVIS_PROVIDER` or set
`JARVIS_PROVIDER=claude`.

## Cost and privacy boundaries

- FreeLLMAPI itself is self-hosted; the inference request is routed by that
  local service to whichever upstream providers have been configured there.
- JARVIS validates the local endpoint and key presence, but cannot verify the
  upstream providers' billing status or guarantee free quota availability.
  Review the FreeLLMAPI Keys and Models pages and disable paid providers and
  billable custom endpoints yourself.
- Free quotas can be exhausted, rate-limited, or changed by upstream providers.
  The assistant may become unavailable; no paid JARVIS fallback is configured.
- Prompts and tool context are sent from the local FreeLLMAPI service to the
  selected upstream inference provider. Do not send sensitive material unless
  you are comfortable with that provider's data handling terms.
- This local provider selection does not change the Supabase cloud model router
  and does not make the local bridge available to the iPhone over the Internet.

## Cloud mode

For cloud/iPhone chat, configure an independent HTTPS OpenAI-compatible provider
in Supabase Edge Function secrets using `JARVIS_MODEL_PROVIDERS` and its server
key. Each entry must explicitly declare `tier: "free"` and
`billingMode: "free_quota_only"`. Those fields are operator assertions, not
proof of upstream billing. The provider account must also have paid billing
disabled or a hard zero spend limit. Never add a paid fallback. The local
FreeLLMAPI key must never be copied into Vite variables or sent in chat.
