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

### BMW / My BMW

The intended user experience is a JARVIS command that requests a vehicle action, especially remote cabin climatization. The My BMW app is the vendor control surface/account, not a separate JARVIS interface.

Important current constraint: BMW's older unofficial ConnectedDrive third-party access was blocked on 29 September 2025. Home Assistant removed its old BMW Connected Drive integration in 2026. BMW CarData is the official EU data-access route, but its published documentation is for vehicle data streams and REST data retrieval; it must not be assumed to provide remote climate-control commands. Therefore:
1. Investigate a currently supported BMW-authorised remote-services route for this vehicle/account/market.
2. Separately assess whether an iPhone-side Shortcuts/App Intents hand-off to My BMW can trigger climate reliably, and what user interaction/foreground/device availability it requires. This would be an execution adapter controlled by JARVIS, not another app the user talks to.
3. Do not automate private My BMW UI, reverse-engineer login flows, store BMW passwords, or claim climate control works until a real authorised end-to-end test succeeds.
4. If no supported action route is available, expose the capability as unavailable with a clear explanation rather than pretending to execute it.

References: [BMW CarData API documentation](https://bmw-cardata.bmwgroup.com/customer/public/api-documentation), [Home Assistant BMW removal notice](https://www.home-assistant.io/blog/2026/04/01/release-20264/), [BMW ConnectedDrive integration status](https://alerts.home-assistant.io/alerts/bmw_connected_drive/).

### Blink cameras

Use a server-side authorised Blink integration or a supported home-automation gateway. Preserve the difference between a still image, a recent clip, and a live stream: the official Home Assistant Blink integration documents camera images and motion events but explicitly does not provide live viewing inside Home Assistant. JARVIS must label the actual media type and never present a still image as live video.

Reference: [Home Assistant Blink integration](https://www.home-assistant.io/integrations/blink/).

### Dreame vacuum

Evaluate a supported vendor cloud integration or a securely managed home-automation gateway. Capabilities must be discovered from the actual vacuum model and account (start/stop, room/zone selection, dock, status, map availability). Do not assume every model exposes the same commands. Device control must remain server-side and per-user authorised.

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
