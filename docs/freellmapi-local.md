# FreeLLMAPI local provider

This integration is for the **local desktop bridge only**. The browser HUD connects to the Node bridge; the bridge connects to the FreeLLMAPI process on loopback. The FreeLLMAPI key is never placed in Vite variables or sent to a remote host.

## Enable it

1. Start FreeLLMAPI locally and confirm its Anthropic-compatible API is listening on `http://127.0.0.1:3001`.
2. Set these environment variables in the environment used to start the JARVIS bridge:

   ```dotenv
   JARVIS_PROVIDER=freellmapi
   FREELLMAPI_BASE_URL=http://127.0.0.1:3001
   FREELLMAPI_API_KEY=your-local-free-llm-api-key
   FREELLMAPI_MODEL=auto
   ```

3. Restart the bridge. Its startup diagnostics should identify the selected provider and model; do not print the API key.
4. Open JARVIS and send a short test prompt. Confirm the bridge returns a streamed answer before relying on the provider.

If `JARVIS_PROVIDER` is omitted, the existing Claude Code provider remains the default. This preserves the current local setup.

## Security boundaries

- Only loopback hosts (`localhost`, `127.0.0.1`, `[::1]`) are accepted.
- URL credentials, paths, query strings, and fragments are rejected.
- The FreeLLMAPI key is passed only to the local Anthropic-compatible SDK environment.
- Do not put this key in `VITE_*` variables, source files, GitHub Actions variables exposed to builds, or a public deployment.
- Do not expose the FreeLLMAPI port to the LAN or Internet.
- The cloud/iPhone model router is a separate HTTPS integration. A cloud Edge Function cannot reach a service bound to a laptop's loopback interface.

## Model and cost behaviour

`FREELLMAPI_MODEL=auto` delegates model selection to the local FreeLLMAPI router. The JARVIS bridge does not independently prove that every model selected by FreeLLMAPI is free. Keep the FreeLLMAPI configuration restricted to free models and disable paid fallback/billing in that service. JARVIS must not be described as free-only until that account-side setting has been checked.

## Troubleshooting

- Missing key: set `FREELLMAPI_API_KEY` in the bridge process environment and restart it.
- Connection refused: confirm FreeLLMAPI is running on port `3001`, or set `FREELLMAPI_BASE_URL` to another loopback port.
- Unsupported model: use `auto` first, then select a model identifier actually exposed by the local FreeLLMAPI instance.
- Cloud/iPhone cannot connect: expected for this local-only adapter. Configure a separate HTTPS provider in Supabase Edge Function secrets for cloud use; never tunnel the laptop bridge publicly as a shortcut.

## Automated coverage

`tests/bridge-provider-config.test.ts` verifies the default provider, FreeLLMAPI selection, model override, required key, loopback-only URL validation, and rejection of unknown providers. These tests validate configuration safety; they do not replace a live model round-trip test.
