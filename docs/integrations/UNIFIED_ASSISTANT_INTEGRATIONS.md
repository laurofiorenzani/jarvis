# JARVIS unified assistant integrations

## Product rule

JARVIS is the single assistant, interface, identity, and orchestration layer. BMW/My BMW, Blink, Dreame, and future services are capabilities exposed *inside JARVIS* through integrations. They are not separate assistant apps, separate chat surfaces, or separate workflows the user must open.

The user speaks or types one request to JARVIS. JARVIS interprets intent, selects an authorised integration action, executes it through the cloud backend, and reports the verified result. Device/vendor apps may remain installed for account setup, consent, firmware, or fallback, but they are not the intended day-to-day control interface.

Examples:
- "JARVIS, switch on the BMW climate." -> BMW integration -> supported remote climate action -> verify/report result.
- "JARVIS, show the front-door camera." -> Blink integration -> retrieve the best supported image/live stream capability -> display in JARVIS.
- "JARVIS, vacuum the living room." -> Dreame integration -> start a room/zone clean -> verify/report result.

## Runtime architecture

```
iPhone JARVIS app / desktop JARVIS client
                 |
          JARVIS conversation
                 |
      Cloud intent + policy engine
                 |
      Capability / integration registry
       |          |          |         |
      BMW        Blink      Dreame    Future services
       |          |          |         |
   vendor/API   vendor/API  vendor/API or approved hub
```

- The client never stores vendor passwords, refresh tokens, API keys, or privileged integration credentials.
- OAuth and vendor credentials live server-side in a dedicated secret store; access is scoped per user and integration.
- The model may propose a tool call, but the backend validates the user, integration connection, capability allowlist, argument schema, and action policy before execution.
- Integrations return structured results (success, pending, unsupported, needs-auth, failed) rather than letting the model claim an action succeeded without confirmation.
- Destructive, security-sensitive, privacy-sensitive, or consequential actions require explicit confirmation. Read-only actions can use narrower policies.
- Each integration can be connected, disconnected, tested, and revoked independently from the JARVIS settings area. These are settings for JARVIS integrations, not separate assistant applications.
- The registry is extensible: adding a future device/service should not require changing the conversation UI or creating another app.

## Integration strategy

### BMW / My BMW — direct JARVIS integration

**Current requirement (user clarification, 10 November 2026):** JARVIS itself must invoke BMW functionality through an integration. Apple Shortcuts are not the intended architecture and must not be presented as the implementation. Do not make the user operate Shortcuts or manually switch to My BMW for ordinary commands.

Preferred implementation order:
1. Use a BMW-supported, customer-authorised API if it exposes the required remote climate operation for this vehicle/account.
2. If the official public API does not expose remote climate, assess a narrowly scoped ConnectedDrive adapter only after documenting that it is unofficial/reverse-engineered, its credential and MFA risks, regional compatibility, and breakage risk. Do not store the BMW password in the client or model context.
3. Keep the adapter server-side with per-user encrypted credentials/tokens, explicit connect/disconnect/revoke flows, strict allowlisted actions, audit records, rate limits, and honest result states.
4. JARVIS maps "prepara o carro" to `bmw.start_climate`, calls the adapter, and reports accepted/completed/confirmed separately. Never claim cabin climate is active without a reliable vehicle-side status.

BMW CarData's public data-sharing APIs must not be assumed to include remote vehicle commands; verify the exact product scopes and endpoints. A private ConnectedDrive remote-service API is a separate, less stable route and requires an explicit risk assessment before credentials are connected.

### Blink cameras — direct JARVIS integration

The first implementation route already agreed with the user is **Apple Shortcuts actions exposed by the My BMW app**, orchestrated by JARVIS on the iPhone. Do not restart the investigation as if no decision existed.

Confirmed in the user's My BMW Shortcuts gallery:
- `Start Climate Control`
- `Climatize Vehicle Interior`
- `Open Doors`
- `Open Trunk`

The initial user-facing command is "JARVIS, prepara o carro". The first controlled test is the `Start Climate Control` action. The action is triggered by JARVIS, not by a separate BMW assistant or chat. My BMW remains the vendor app/account that supplies the Shortcuts action; the user speaks only to JARVIS.

Implementation flow:
1. JARVIS recognises a known BMW intent and resolves it to an allowlisted capability such as `bmw.start_climate`.
2. JARVIS asks for confirmation where the action policy requires it, then dispatches an authenticated action request to the iPhone app.
3. The native iOS app invokes the already-created Apple Shortcut using the supported iOS Shortcuts hand-off. It must not scrape or automate My BMW's private UI.
4. The app reports the Shortcut launch/result state to the JARVIS cloud session. JARVIS must distinguish "dispatched", "shortcut completed", and "vehicle climate confirmed"; do not claim the vehicle is climate-controlled unless the integration provides a reliable confirmation.
5. If the phone is offline, the app is not available, the Shortcut requires user interaction, or iOS blocks execution, JARVIS reports that honestly and offers the supported next step.

The previous conversation explicitly noted the My BMW Shortcuts actions and agreed to add `Start Climate Control` to the JARVIS-triggered flow for the first test. Do not replace this with a new third-party ConnectedDrive API investigation as the primary path. A supported BMW API can be considered later as an enhancement, not as a prerequisite for the agreed Shortcut route.

### Blink cameras — previously agreed first route

JARVIS itself must connect to the user's Blink account through a dedicated integration adapter and retrieve camera/device state and available media for display in the JARVIS interface. Do not make a Shortcut launch or merely opening the Blink app count as integration.

Blink camera live view is a distinct capability from retrieving a thumbnail or recorded clip. The adapter must expose explicit states such as `snapshot_available`, `clip_available`, `live_view_supported`, `needs_auth`, and `unsupported`; never label a still image as live video. Blink's consumer-camera APIs are not a clearly documented public third-party control API, so assess the private cloud protocol or a supported gateway carefully, including MFA, account lockout, rate limits, media-session handling, and ongoing maintenance. Any unofficial protocol must be isolated behind the adapter and opt-in connection flow.

### Dreame vacuum

The Dreame integration was agreed as a later JARVIS capability, after the continuous voice conversation and first device integrations. Exact model/API route was not established in the recovered decision record. Do not invent the model or assume universal room/zone support. Add it to the same JARVIS capability registry once the device model and supported action route are known.

### Home automation gateway (optional)

Home Assistant may be evaluated as one possible adapter/gateway for devices whose vendor integrations are available there. It is not a mandatory user-facing app, not the JARVIS brain, and not a requirement for every integration. If selected, JARVIS talks to its API from the cloud integration layer; any required network reachability, hosting, tunnel, or paid subscription must be reviewed and approved before provisioning. A local-only Home Assistant instance would not satisfy cloud-first operation when the home network is unavailable.

Reference: [Home Assistant integrations](https://www.home-assistant.io/docs/apps-and-integrations/).

## Delivery order

1. Build the generic server-side integration registry, capability schema, tool execution policy, audit events, and connection state model.
2. Prove one low-risk read-only integration end to end before enabling device control.
3. Add Blink camera status/image retrieval with explicit still-vs-live semantics.
4. Investigate and validate BMW climate action feasibility for the user's exact EU vehicle/account; only then implement the supported adapter.
5. Add Dreame capabilities after identifying exact model and supported API/hub route.
6. Add further integrations incrementally, all invoked through JARVIS.

## Current implementation truth

This is the approved target architecture and integration investigation plan. The current cloud Edge Function has authenticated chat, memory, and provider routing, but does **not** yet implement a server-side tool/integration registry, OAuth connection management, vendor credential storage, BMW remote climatization, Blink access, or Dreame control. No device action has been tested from JARVIS. Do not present these capabilities as implemented until a successful authorised test is recorded.
