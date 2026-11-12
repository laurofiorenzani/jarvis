# J.A.R.V.I.S.

A cloud-first personal AI assistant with an Iron Man holographic interface.
The React/Vite HUD connects directly to the authenticated Supabase Cloud API;
the server-side model router is designed for explicitly configured free-quota
providers. The iPhone is intended to connect to this same cloud backend without
depending on a Windows PC.

The optional local Node bridge is a separate developer/local-tools mode. It
runs the Claude Agent SDK and local MCP servers on a developer machine, but it
is **not** the production brain and is not required for cloud chat. Select it
explicitly with `VITE_BACKEND=bridge`.

**Current release boundary:** cloud authentication, conversation storage,
streaming API, and the cloud HUD path are implemented. A real authenticated
model inference still needs provider configuration and end-to-end validation.
Cloud speech currently uses browser-native speech; server-side ElevenLabs
proxying is not yet integrated into the cloud path. Capacitor, native iOS
Keychain/audio, physical-device testing, signing, and TestFlight remain pending.
See [the cloud-first architecture](docs/architecture/CLOUD_FIRST_ARCHITECTURE.md),
[implementation status](docs/architecture/IMPLEMENTATION_STATUS_2026-11-10.md), and
the [Google AI Studio provider guide](docs/cloud/GOOGLE_AI_STUDIO_PROVIDER.md),
which documents the server-side setup and its free-tier privacy trade-off.


---

## Requirements

**To use the cloud app:** a supported browser (Chrome or Edge), microphone
permission, and an authorised JARVIS Supabase account. The cloud service must
also have a server-side model provider configured by the operator. Provider
keys belong in Supabase Edge Function secrets, never in the browser bundle.
No Windows PC, Claude Code installation, Node bridge, or local API key is
required for the cloud runtime.

**To run the web UI locally:** Node.js 20 or newer and Chrome/Edge. Install
dependencies with `npm install`; `npm start` serves the cloud-first UI.

**For optional local bridge development only:**
- Claude Code installed and logged in; the bridge reuses that local login.
- Node.js 20 or newer.
- Chrome or Edge in a real browser window with microphone and WebGL support.
- Optional ElevenLabs credentials configured on the local bridge, not in a
  production browser bundle.

`npm run setup` checks the local bridge development prerequisites; it is not
a cloud deployment or iPhone installer.

---

## Quick start

First, install, then start it:

```bash
npm install
npm start          # starts the cloud-first web app (no local bridge required)
```

Then open the URL it prints (http://localhost:5173) in **Chrome**. The default mode is cloud: expand CLOUD BRAIN, sign in, then click **INITIALISE** and say **“Hey Jarvis”**. No local bridge is started or required.

For optional local-tool development only, set `VITE_BACKEND=bridge` in `.env.local` and run `npm run start:local`. This starts the Node bridge alongside Vite. To test effectful local tools, use `npm run start:local:writes` only after reviewing the bridge permission gate.

Prefer two terminals for optional local bridge development? First set `VITE_BACKEND=bridge` in `.env.local`, then run the bridge and UI separately:

```bash
npm install
```

Terminal 1 — the local bridge:

```bash
npm run bridge
```

Terminal 2 — the web HUD:

```bash
npm run dev
```

Then open the app in a **real Chrome or Edge window**:

```bash
open http://localhost:5173
```

Click **INITIALISE**, allow the microphone when asked, and say **"Hey Jarvis"**.

> It has to be a real browser window. Embedded preview panes block the
> microphone, so JARVIS will look perfectly alive and simply never respond.

---

## How it works

### Default production path — cloud

```
  Browser HUD / future iPhone app
              │ HTTPS + Supabase Auth
              ▼
       Supabase Edge Function
             jarvis-api
              │
       Server-side model router
              │
       Configured free-quota provider
```

Supabase Auth identifies the user. Postgres stores conversations, messages,
turns, and explicitly managed memories under user-scoped access controls.
Provider credentials remain server-side. Cloud mode is the application default:
without a cloud session, JARVIS asks the user to sign in and does not fall back
to localhost or a browser-exposed provider key.

The cloud API reports whether provider configuration is declared. That status
is not proof that a provider is reachable, that inference succeeds, or that
free-tier quota remains available. Those conditions still require a controlled
end-to-end test.

### Optional local bridge — development and local tools

The local bridge is a separate Node process (`bridge/server.mjs`) that runs
the **Claude Agent SDK** using the developer's existing Claude Code login. It
can spawn local stdio MCP servers and access explicitly allowed local tools.
It communicates with the browser over `ws://localhost:8787`.

To use it, set `VITE_BACKEND=bridge` in `.env.local` and run
`npm run start:local`. The bridge is not deployed as the cloud service and
must not be exposed to the public internet as a substitute for the cloud API.

**Why keep it?** A browser cannot spawn local stdio MCP servers or reach
desktop-only tools. The bridge remains useful for optional local development
and experiments, but the core cloud assistant must work while Windows is off.


---

## Optional local MCP capabilities

These capabilities are available only when the local bridge is explicitly enabled. They are not yet part of the cloud tool registry.

### Your tools

Every server in your `~/.claude.json` is handed to the SDK explicitly, or only the
ones you name in `JARVIS_MCP_SERVERS`. Depending on what you have installed, that
is roughly:

- **Web & search** — `exa`, `serper`, `serpapi`
- **Images & video** — `higgsfield`, `openrouter-image`, `palmier-pro`
- **Voice** — `elevenlabs`
- **Your phone** — `android`
- **The browser** — `playwright`

A few things you can say:

- *"What's happening in AI this week?"*
- *"Generate an image of the Mark VII suit."*
- *"Take a screenshot of my phone."*
- *"Open my GitHub notifications."*

> **Note on account connectors.** Servers you added through your **claude.ai
> account** (mail, drive, calendar and other account connectors) are not in `~/.claude.json`,
> but the CLI fetches them on its own and they join the session from the second
> turn. The bridge keeps them out by default; set `JARVIS_ACCOUNT_CONNECTORS=1`
> to let them in, and `JARVIS_MCP_SERVERS` to choose which `~/.claude.json`
> servers JARVIS gets.

### Local bridge UI controls

The local bridge exposes these optional MCP tools:

- `ui_theme` — accent, background, per-phase colours
- `ui_reactor` — colour, scale, intensity, spin, and style (`ring` | `sphere` | `wire`), visibility
- `ui_orbit` — put images in orbit around the reactor
- `ui_chrome` — show or hide rails, transcript, badges
- `ui_effect` — `glitch` | `pulse` | `scan` | `shake` | `flash`
- `ui_screen` — clear
- `ui_reset` — back to defaults

So *"make it red, hide the systems list, put that render in orbit"* is a spoken
command.

### The heads-up display

JARVIS renders panels against a fixed `.hud-*` design system. The browser sanitises model-authored markup (DOMPurify, a class allowlist and a strict CSP). Rich media works — images, `<video>`, and YouTube/Vimeo embeds. Remote media proxying through the local bridge is available only in bridge mode; the equivalent cloud media/tool service is not yet implemented.

---

## Controls

| Key / phrase | Does |
|---|---|
| **"Hey Jarvis"** | Wake him |
| **Space** | Talk without the wake word |
| Just speak | Interrupt him mid-sentence (barge-in) |
| **V** | Cycle the browser voice |
| **Escape** | Stand down |
| **D** | Live diagnostics panel |
| **T** | One-line audio self-test |

---

## The boot sequence

Power-up plays a four-beat Iron Man start-up (`src/ui/Boot.tsx`): an
"INITIATING SYSTEM" status bar with a segmented progress bar and boot log; then
concentric reticle rings resolving into "J.A.R.V.I.S"; then a suit schematic;
then the triangular arc reactor lighting up — with a start-up sound under it
(`public/audio/boot-music.mp3`).

---

## Configuration

The cloud app uses public Supabase URL/publishable-key settings and a signed-in user session. Frontend settings live in `.env.local` (copy `.env.example`). Local bridge settings are read by the Node bridge process; production provider secrets must be stored server-side in Supabase.

### Bridge

| Variable | Default | Effect |
|---|---|---|
| `JARVIS_BRIDGE_PORT` | `8787` | Port for the WebSocket + HTTP endpoints |
| `JARVIS_BRIDGE_HOST` | `127.0.0.1` | Interface to listen on. Any other address puts the agent on your network |
| `JARVIS_ALLOWED_HOSTS` | none | Extra hostnames the bridge answers to; a request for any other name gets a 403 |
| `JARVIS_MODEL` | `claude-opus-5` | Model to run |
| `JARVIS_EFFORT` | `medium` | Reasoning effort |
| `JARVIS_ALLOW_WRITES` | off | `1` allows effectful tools (see below) |
| `JARVIS_MCP_SERVERS` | all configured | Comma-separated `~/.claude.json` servers to pass on; empty passes none |
| `JARVIS_ACCOUNT_CONNECTORS` | off | `1` lets your claude.ai account's connectors join the session |
| `JARVIS_DISABLE` | none | Comma-separated capabilities to leave out: `browser`, `camera`, `interface` |
| `JARVIS_ALLOWED_ORIGINS` | local dev | Extra WebSocket origins to accept |
| `JARVIS_ALLOW_NO_ORIGIN` | off | Accept connections with no `Origin` header |
| `JARVIS_WORKSPACE` | `~/.jarvis/workspace` | The agent's working directory; file tools are confined to it and the temp directory |
| `JARVIS_FILE_ROOTS` | none | Extra folders the file tools and the `/file` endpoint may use |
| `JARVIS_KEEP_TRANSCRIPTS` | off | `1` keeps the SDK's session transcripts in `~/.claude/projects` |
| `JARVIS_CLAUDE_EXECUTABLE` | bundled CLI | Run the agent through this executable instead, e.g. a sandbox wrapper that execs the real CLI |
| `JARVIS_CHROME_PIPE` | none | WSL only: the Windows pipe name the browser relay connects to |
| `JARVIS_DEBUG` | off | `1` logs every agent message to the bridge terminal, answer text and tool calls included |
| `JARVIS_VOICE_ID` | none | ElevenLabs voice id |
| `ELEVENLABS_API_KEY` | none | Optional; enables the ElevenLabs voice + Scribe |

### Frontend (`.env.local`)

| Variable | Effect |
|---|---|
| `VITE_BACKEND` | `cloud` (default), `bridge` (local development), or `direct` (local demo only) |
| `VITE_BRIDGE_URL` | Where to reach the bridge |
| `VITE_TTS_ENGINE` | `system` or `kokoro` |
| `VITE_KOKORO_VOICE` | Voice for the Kokoro engine |
| `VITE_USE_ELEVENLABS` | Force the ElevenLabs voice on |
| `VITE_ANTHROPIC_API_KEY` | Direct mode only |

### Adding an ElevenLabs key

You do not have to touch a flag. Either:

- Set `ELEVENLABS_API_KEY` on the bridge before starting it, **or**
- Add the key to your `elevenlabs` MCP server's env in `~/.claude.json` — the
  bridge reads it from there too.

Either way, `/health` starts reporting the capability, the browser picks it up on
the next boot, and both the voice and transcription upgrade automatically.

---

## Enabling actions

The tool gate starts **read-only**. Search, generation and lookups run freely;
anything effectful — send, tap, delete, install, pay — is denied. Voice is a poor
interface for a confirmation dialog, so the decision is made ahead of time, in
`decideTool()` in `bridge/policy.mjs`. The bridge sets
`settingSources: []`, which makes its own gate the only authority — filesystem
settings and any global `bypassPermissions` cannot override it.

A `PreToolUse` hook applies that policy to every call, including the reads the
Claude Code CLI would otherwise approve by itself. In read-only mode the agent
has no shell, and its file tools reach only its workspace (`~/.jarvis/workspace`),
the temp directory and any folders in `JARVIS_FILE_ROOTS`. Paths that hold
credentials, such as `~/.ssh`, `~/.claude` and `.env` files, stay refused even
inside those folders.

To allow effectful tools (phone, browser driving, sending), run the bridge this
way instead:

```bash
npm run bridge:writes
```

The script passes `--writes` to the bridge, so it works in Windows `cmd` and
PowerShell too. With the optional local bridge, use `npm run start:local:writes`. Writes add `Bash`,
`Write`, `Edit` and `NotebookEdit` to the agent's tools. The file tools stay
inside the same folders; the shell can reach anything your user account can.

> Read `decideTool()` before you do. *"Hey Jarvis, clean up my downloads folder"*
> means something rather different with writes enabled.

---

## Troubleshooting

**I can't hear him, or he can't hear me.** Press **D** for the diagnostics panel
— it states plainly whether he is hearing you and whether he is producing sound.
Press **T** for a one-line audio self-test.

**No voice at all.** You must be in **Chrome or Edge**, in a **real browser
window** (not an embedded preview), and you must have **allowed the microphone**.

**Bridge not reachable.** Check that `npm run bridge` is still running in its
terminal, and that nothing else is holding port `8787`. If the port is taken,
the bridge says so in one line at startup and exits. It listens on `127.0.0.1`
only. Reaching it from another machine takes `JARVIS_BRIDGE_HOST` and
`JARVIS_ALLOWED_HOSTS`, and your own authentication in front of it first.

**Browser control on Windows.** The bridge finds the Claude extension's named
pipe, `\\.\pipe\claude-mcp-browser-bridge-<user>`, by itself. If the boot log
says the extension is not running, open Chrome with the extension signed in.
Each browser request looks for the pipe again, so the bridge does not need a
restart.

**Running the bridge in WSL, with Chrome on Windows.** Browser control works:
the Windows native host exposes a named pipe rather than a Unix socket, and the
bridge reaches it through a short PowerShell relay (WSL interop must be on,
which it is by default). Open the app at `http://127.0.0.1:5173` if
`localhost` is slow to load — Windows tries IPv6 loopback first, and WSL does
not forward it.

---

## Tests

`npm test` runs the bridge's tests with Node's built-in runner. They cover the
network binding, the tool policy, the MCP server allowlist and the WSL browser
relay, which runs only under WSL. The network and allowlist tests start the
bridge on a random loopback port, and none of the tests opens an agent session.

---

## Encrypted memory (experimental)

A guarded, encrypted memory integration is being developed on the isolated `work/memory-integration-ready` branch. It is disabled by default. Windows Credential Manager support is integrated and covered by CI; run `npm run memory:doctor` for a disposable local check, then use `npm run bridge:memory` only after reviewing the data and approval behavior in [the memory integration guide](docs/security/MEMORY_INTEGRATION.md). Do not use personal data until the remaining target-PC, backup/recovery, and retention release gates are complete.

## Security

The bridge's defences live in `bridge/server.mjs` and `bridge/policy.mjs`:

- It listens on `127.0.0.1` and answers only requests addressed to `localhost`,
  `127.0.0.1` or `[::1]`, which blocks DNS rebinding.
- The WebSocket accepts only local dev origins (add more with
  `JARVIS_ALLOWED_ORIGINS`).
- `/file`, `/img` and `/media` validate the scheme, confine to allowed roots,
  resolve the real path, and refuse private and loopback addresses (SSRF guard).
- The tool gate (`decideTool`) is default-deny for effectful MCP tools.
- A `PreToolUse` hook enforces the tool policy on every call. File tools stay
  inside the workspace, the temp directory and `JARVIS_FILE_ROOTS`, and
  `WebFetch` cannot reach loopback, LAN or cloud metadata addresses.
- claude.ai account connectors stay out of the session unless
  `JARVIS_ACCOUNT_CONNECTORS=1`, and `JARVIS_MCP_SERVERS` narrows which
  `~/.claude.json` servers the agent gets.
- Session transcripts are written to `~/.claude/projects` only when
  `JARVIS_KEEP_TRANSCRIPTS=1`.
- `JARVIS_DISABLE` removes browser control, the camera or the interface tools
  entirely, and `JARVIS_CLAUDE_EXECUTABLE` can run the agent inside a sandbox
  wrapper.
- A strict CSP in `index.html`; model-authored panel HTML is sanitised.

---

## Credits & licence

MIT.

The boot sound and any tracks in `public/audio/` ship with the project for the
demo. If you go on to monetise something built on this, clearing the rights to
that audio is your responsibility.
