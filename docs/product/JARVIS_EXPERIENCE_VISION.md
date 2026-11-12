# J.A.R.V.I.S. Experience Vision

Status: product direction captured from user-provided visual references (12 Nov 2026). This is a target experience, not a claim that every capability exists today.

## Product intent

J.A.R.V.I.S. should feel like a persistent personal operating intelligence: a multimodal assistant that understands context, sees permitted information, remembers approved facts, connects services and devices, and executes bounded actions on the user's behalf. It must be more than a chat window with a themed skin.

## Visual language

- Primary identity: warm amber / molten orange holographic light on a near-black graphite background.
- Core motif: a living, layered intelligence sphere / orbital interface, with concentric rings, nodes, pulses, fine traces and animated connections.
- Supporting visual elements: translucent HUD panels, compact telemetry, device tiles, timeline/activity feed, memory constellation and source indicators.
- Motion should communicate meaning: pulse = active processing; a node lighting = source/device connected; a path illuminating = information flow; amber warning = attention required; muted grey = inactive. Avoid decorative motion that implies work the system has not actually done.
- Typography should be legible and restrained. The interface must remain usable on iPhone, desktop and (later) spatial displays; the holographic centerpiece must not obstruct core controls or accessibility.

## Main experience areas

1. **Core / Presence** — central animated orb or intelligence core, wake/listening/thinking/speaking states, interrupt control, and concise status.
2. **Memory constellation** — visual graph of approved memories, preferences, decisions, projects and relationships, with provenance, date, confidence and user controls. Pending suggestions are visually distinct and never treated as approved memory.
3. **Knowledge & sources** — connected providers, files, web sources and integrations, each showing availability, last sync, permission scope and source attribution. Distinguish retrieved evidence from model inference.
4. **Vision** — camera or user-shared images/video, screen context and supported device feeds. Show exactly what source is being viewed and when; never imply continuous surveillance if no stream is active.
5. **Devices & automations** — BMW, smart home, cameras, vacuum, lights and future endpoints. Show live connection state, available actions, last action and result. Sensitive actions require confirmation.
6. **Mission / task center** — goals, multi-step plans, progress, blockers, approvals and audit history. Long-running tasks must expose what is happening and what needs the user's input.
7. **Diagnostics & self-improvement** — health, CI, deployment and integration signals; prioritized proposals; isolated development work; test evidence; approval and rollback gates.

## Capability model

### Observe
Read only information the user has connected or explicitly shared: health/status endpoints, selected camera snapshots, device state, files, calendar/mail when connected, and user-provided screen/image/video content. Each source must have a visible permission boundary.

### Understand
Use multimodal models to interpret images, video frames, documents and voice; correlate context with approved memory; cite or identify the source of important claims; communicate uncertainty.

### Remember
Memory is account-scoped and opt-in. Capture candidate facts with source/provenance, sensitivity and retention metadata. Ask before saving; users can inspect, edit and delete according to the memory policy. No cross-account sharing between the two household accounts without a separate explicit consent model.

### Act
Execute only through explicit, scoped integration adapters. Separate read and write permissions. Require confirmation for locks/doors, vehicle access, purchases, messages, financial operations, deletion, security settings and production changes. Every action gets an outcome, timestamp and audit record. Never claim success before the integration confirms it.

### Improve
Observe sanitized operational signals, propose changes, work in isolated branches, run tests and previews, and prepare reviewable pull requests. No self-approval, unrestricted code execution, direct production mutation or autonomous secret changes.

## Delivery sequence

- **Foundation:** preserve reliable cloud chat, authentication, account isolation, memory opt-in and voice interruption.
- **Experience shell:** implement the amber/black HUD, core presence states, navigation and mobile/desktop layouts using real system state.
- **Memory and knowledge visualization:** render approved memory and connected source relationships with provenance; do not invent nodes or imply a source is connected when it is not.
- **Vision:** explicit user-shared camera/image/video analysis, then opt-in integrations with clear active indicators.
- **Device control:** one integration at a time, starting with safe read-only status; add narrowly scoped actions only after provider capability and authorization are verified.
- **Autonomy:** task planner, approval queue, observable execution, retries/timeouts and audit trail.
- **Self-improvement:** expand observer/triage and guarded development workflow only after the validation gates are consistently green.

## Non-goals and truthfulness

- Do not simulate control of devices that are not actually connected.
- Do not label an animation as a real-time memory graph unless it is driven by actual stored, approved records.
- Do not promise a physical hologram from a phone or ordinary monitor. The first implementation is a responsive visual HUD; spatial/AR projection is a separate future hardware project.
- Do not grant the assistant unrestricted access to cameras, microphones, accounts, money, vehicles or production infrastructure.
- Never trade account isolation, consent, privacy or recoverability for a more impressive demo.

## Acceptance criteria for the experience

- The core shows accurate idle/listening/thinking/speaking/acting/error states.
- Every displayed memory and source has provenance and a permission state.
- Every device tile distinguishes connected, unavailable and unsupported capabilities.
- The user can interrupt, cancel and inspect task execution.
- Actions requiring approval pause and explain the exact action before execution.
- The system records confirmed outcomes and reports failures honestly.
- Visual effects never imply an action, observation or memory operation that did not occur.
