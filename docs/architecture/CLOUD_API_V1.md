# JARVIS Cloud API v1

Status: proposed contract; not a deployed service.

This contract defines the boundary between the mobile/web client and the
first-party cloud service. It is deliberately independent of a model vendor,
identity provider, database and hosting platform.

## Security invariants

- Every route except health requires a verified short-lived bearer access token.
- The server derives the user identity from the verified token. It never accepts
  a client-supplied user ID as authority.
- Conversation reads, writes, turn operations, stream subscriptions and memory
  approvals are scoped to that authenticated user on every request.
- The server owns model-provider credentials and all privileged tool credentials.
  No provider key or MCP secret is sent to the client.
- Cloud sessions expose only the core capability allowlist. Windows filesystem,
  shell, desktop automation, local MCP stdio and camera relay are not cloud tools.
- Memory writes require a server-created, expiring, single-use approval challenge
  bound to user, conversation, turn, operation and payload digest.
- Mutating operations use a client-generated turn ID as an idempotency key.
  Duplicate turn IDs are rejected with HTTP 409; clients must reload durable
  conversation state rather than silently retrying a turn with the same ID.
- Logs contain request IDs and operational metadata, not prompts, tokens,
  memory contents or raw tool payloads by default.

## Routes

| Method | Path | Authentication | Purpose |
| --- | --- | --- | --- |
| GET | `/v1/health` | none | Liveness/readiness only; no infrastructure details |
| POST | `/v1/conversations` | bearer | Create an owned conversation |
| GET | `/v1/conversations` | bearer | List only the caller's conversations |
| GET | `/v1/conversations/{id}` | bearer | Read an owned conversation and paginated messages |
| POST | `/v1/turns` | bearer | Submit a turn; returns accepted response or an SSE stream |
| POST | `/v1/turns/cancel` | bearer | Cancel only the caller's active turn |
| POST | `/v1/memory/approvals` | bearer | Approve/deny one live memory challenge |

All JSON request and response bodies carry `version: 1`. Requests also carry
`X-Jarvis-Api-Version: 1`. Unknown versions fail with `invalid_request`.

## Turn lifecycle

1. Validate body size, text length, conversation ownership and turn ID.
2. Atomically reserve the idempotency key for the authenticated user.
3. Persist the user message and turn state before invoking the model.
4. Stream typed SSE events: `turn.started`, `text.delta`, tool lifecycle,
   optional memory approval challenge, then `turn.completed` or `turn.failed`.
5. Persist the final assistant message and terminal turn state before emitting
   `turn.completed`.
6. On reconnect, the client can request the durable conversation and turn state;
   stream reconnection uses a server-issued event cursor, not an untrusted
   client offset.
7. Cancellation is scoped to the same user and turn and is idempotent.

SSE uses `Content-Type: text/event-stream`, `Cache-Control: no-cache`, and
`X-Accel-Buffering: no`. Each event is a JSON `data:` frame conforming to
`parseCloudAssistantEvent`. Heartbeats are comments and do not enter the event
contract. The server must apply backpressure and terminate disconnected streams
without losing persisted turn state.

## Data model (minimum)

- `users`: identity-provider subject, status, created/updated timestamps.
- `devices`: user ID, device ID, platform, last seen, revoked timestamp.
- `conversations`: ID, user ID, title, created/updated timestamps, archived.
- `messages`: ID, conversation ID, user ID, role, content, created timestamp.
- `turns`: ID, conversation ID, user ID, status, idempotency key, timestamps,
  cancellation state, provider request correlation ID.
- `memory_items`: ID, user ID, encrypted payload, metadata, version, timestamps.
- `memory_challenges`: ID, user ID, conversation ID, turn ID, operation,
  payload digest, expiry, consumed timestamp, decision.
- `audit_events`: ID, user ID, action, resource ID, request ID, timestamp.

Use database constraints for ownership and uniqueness; do not rely on UI checks.
Encrypt sensitive memory fields with envelope encryption and a managed KMS key.
Backups require tested restore procedures and a user-scoped export/delete path.

## Operational controls

- Rate limits by user, device and IP; request/body/stream duration limits.
- Provider timeouts, bounded retries, concurrency caps and spend guardrails.
- Structured redacted logs, metrics, tracing, alerts and incident runbooks.
- Database migrations, backup retention, restore drills and deletion propagation.
- Token rotation/revocation and device-session revocation.
- Explicit tool allowlist and server-side authorization for every tool invocation.

## Client implementation status

The repository currently contains a versioned TypeScript contract, structural
event parser, authenticated HTTP client foundation, and SSE decoder. The client
is intentionally not wired into the running brain until a real identity provider,
token lifecycle, server implementation and deployment exist. Endpoint response
shapes must be finalised together with the server before production enablement.

## Current client implementation

The client can now submit turns as authenticated SSE requests with an
AbortSignal, reject non-SSE success responses, decode only versioned/validated
events, and cancel the stream reader when the consumer exits early. Explicit
turn cancellation remains available as a separate authenticated control request. The server must implement the same route behavior
and independently enforce all limits and authorization checks.

## Prototype server

A Supabase Edge Function prototype now implements authenticated health,
conversation creation/list/read, turn submission with Anthropic streaming, and
cooperative turn cancellation. It validates the caller with Supabase Auth,
derives the user ID server-side, and uses the service-role database client only
inside the function. The SQL migration enables row-level security and provides
no client-side write policy for messages or turns.

The function is not deployed. It requires a Supabase project, migration,
Auth configuration, server-side Anthropic key, allowed app origin and
operational limits. It is not ready for public release: rate limiting, spend
controls, stronger audit/monitoring, memory approvals, device management,
reconnect cursors and adversarial multi-user tests remain.

Cancellation is represented by a dedicated `turn.cancelled` event. If the client
disconnects before receiving it, the durable turn record still transitions to
`cancelled`; the client can reconcile state by reloading the conversation.
