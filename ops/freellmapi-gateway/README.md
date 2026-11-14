# Private FreeLLMAPI gateway for JARVIS

This package exposes only the OpenAI-compatible chat endpoint needed by JARVIS. It does **not** expose the FreeLLMAPI dashboard, its admin routes, MCP server, or arbitrary paths.

## Security model

- FreeLLMAPI stays on the private Docker network. The official compose file publishes port 3001 on 127.0.0.1 by default; keep that default. Do not set HOST_BIND=0.0.0.0, which would expose the dashboard/API on the VM's public interfaces. The proxy reaches the service over the internal Compose network.
- The proxy validates a separate 256-bit JARVIS bearer token, then replaces it with the FreeLLMAPI unified API key before forwarding upstream.
- Only `GET /v1/models` and `POST /v1/chat/completions` are exposed.
- Every chat request must select an explicit named profile in `FREELLMAPI_ALLOWED_MODELS` (for example `auto:jarvis-approved`). Generic `auto`, `fusion`, and unlisted profiles are rejected before reaching FreeLLMAPI.
- Configure the approved named profile inside FreeLLMAPI with only individually vetted free providers. The proxy allowlist does not itself certify the downstream providers; the profile's fallback chain must be reviewed and documented before activation.
- The proxy forwards the FreeLLMAPI task hint and safe routing/fallback response headers. It never logs request bodies, prompts, provider keys or bearer tokens.
- Request bodies are capped at 2 MiB and requests at 120/minute per proxy instance.
- The Cloudflare Quick Tunnel exposes the proxy only. The dashboard remains private.
- Provider API keys remain encrypted in FreeLLMAPI's SQLite store. The JARVIS gateway token and FreeLLMAPI unified key stay on the VM / in server-side secret storage, never in the browser or Git.

## VM setup

1. Use the existing Always Free VM if it is still active. Install Docker and FreeLLMAPI using the official instructions at https://github.com/tashfeenahmed/freellmapi. The official installer is documented in that repository; review it before running any remote install script.
2. Complete the private FreeLLMAPI dashboard setup on the VM. Add only provider keys whose free-tier caps, Ireland/EEA eligibility, personal-use terms, privacy/retention and no-billing conditions you have verified. Create a named fallback profile `jarvis-approved` containing only those providers. Copy the unified API key from the dashboard.
3. Keep the official FreeLLMAPI compose setting HOST_BIND=127.0.0.1 (the default). Copy this directory to `~/freellmapi/jarvis-gateway` and copy `docker-compose.jarvis.yml` to `~/freellmapi/docker-compose.jarvis.yml`. The proxy connects to the container over the private Compose network; no LAN/public binding is needed.
4. Create `~/freellmapi/.env.jarvis` from `.env.jarvis.example`. Set the unified FreeLLMAPI key, `FREELLMAPI_ALLOWED_MODELS=auto:jarvis-approved`, and generate a separate gateway token with `openssl rand -hex 32`. Run `chmod 600 .env.jarvis`.
5. From `~/freellmapi`, merge the official compose file with this overlay:

```bash
docker compose -f docker-compose.yml -f docker-compose.jarvis.yml --env-file .env.jarvis up -d --build
```

6. Start the free Quick Tunnel:

```bash
docker compose -f docker-compose.yml -f docker-compose.jarvis.yml --env-file .env.jarvis --profile public-tunnel up -d
docker compose logs --no-color jarvis-cloudflared
```

Copy the generated `https://....trycloudflare.com` URL from the log. The tunnel URL is temporary and may change after a restart. For a permanent production hostname, use a named Cloudflare Tunnel and a domain you control; do not expose port 3001 directly.

## JARVIS server-side configuration

Set these Supabase Edge Function secrets (never Vercel client variables):

- `FREELLMAPI_GATEWAY_TOKEN`: the value of `JARVIS_GATEWAY_TOKEN` from the VM's `.env.jarvis`.
- `JARVIS_MODEL_PROVIDERS_STANDARD`: JSON array below, replacing the URL with the Quick Tunnel URL.

```json
[
  {
    "name": "FreeLLMAPI Global Free Pool",
    "baseUrl": "https://YOUR-QUICK-TUNNEL.trycloudflare.com/v1",
    "model": "auto:jarvis-approved",
    "tier": "free",
    "billingMode": "free_quota_only",
    "apiKeyEnv": "FREELLMAPI_GATEWAY_TOKEN",
    "gateway": "freellmapi",
    "taskType": "auto"
  }
]
```

The unified FreeLLMAPI key is **not** placed in Supabase; the VM-side proxy keeps it private. The JARVIS Edge Function sends the separate gateway token. Each JARVIS account must enable the standard pool in Cloud Access before its own conversation content can use it. The spouse's account remains disabled until she independently enables it.

## Dashboard administration

Keep the dashboard private. To access it from an administrator computer, use an SSH port forward to the VM's loopback-bound port 3001, then open `http://127.0.0.1:3001` locally. Do not add port 3001 to the VM's public ingress rules.

## Limits

- This is a bootstrap Quick Tunnel. The random hostname can change when the tunnel container is recreated/restarted, requiring the JARVIS provider base URL to be updated.
- The current JARVIS adapter uses chat completions only. Other FreeLLMAPI surfaces (audio, vision, images, video and embeddings) are not exposed by this proxy until their JARVIS adapters are implemented.
- This proxy does not bypass provider geographic restrictions, free-tier quotas, account eligibility, rate limits or provider terms. A named profile is only an allowlist label; the actual fallback chain must be audited and kept to the approved downstream set.
- FreeLLMAPI's free catalog is the monthly snapshot. Do not enable the paid live catalog or paid model routes.
