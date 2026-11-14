# Google AI Studio / Gemini API — not approved for the JARVIS EEA runtime

**Do not configure Gemini API Free Tier for the JARVIS cloud app while it is made available to users in Ireland or elsewhere in the EEA, UK or Switzerland.**

Google's Gemini API Additional Terms state that API clients made available to users in the EEA, Switzerland or UK may only use Paid Services. The Free Tier is therefore not an eligible option for this JARVIS deployment. The project requirement remains zero paid API usage, so Gemini Free is not configured as the cloud chat or speech provider.

Official terms: https://ai.google.dev/gemini-api/terms

## Current JARVIS behaviour

- Cloud chat and speech recognition are being moved to Cloudflare Workers AI.
- The Gemini STT and TTS routes have been removed from the active cloud request path.
- Device-native speech remains the active TTS path. A cloud TTS fallback will only be restored after a provider is approved for EEA use and supports the required Portuguese and English voices.
- Do not copy a local FreeLLMAPI/Google AI Studio key into Supabase for this deployment.
- Do not enable Google Cloud billing, paid fallback or any paid model without the owner's explicit approval.

This file is retained to document the decision and prevent the previous Gemini Free configuration from being reintroduced accidentally.
