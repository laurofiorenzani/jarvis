# Cloud memory approval boundary

## Decision

The cloud memory candidate API is the approval authority for cloud-first JARVIS. Do not connect the older WebSocket `MemoryConfirmation` / `createMemoryConfirmationTransport` prototype directly to the cloud memory flow.

Those components implement a bridge request/reply protocol for a local tool broker. The current cloud path is different: the server creates account-scoped pending candidates, and the authenticated owner reviews each candidate through the cloud API.

## Current flow

1. The cloud API may extract a small number of durable, non-sensitive suggestions from a completed exchange.
2. Candidates are stored with the authenticated user's ID and `pending` status.
3. The client lists pending candidates using the authenticated session.
4. The user explicitly approves or rejects a candidate using `decideMemoryCandidate`.
5. Only approved facts are eligible for approved-memory retrieval when that account has enabled memory context.
6. Account changes clear the prior account's visible candidates and search results.

## Required invariants

- A pending candidate is never treated as approved memory.
- Approval is an explicit, authenticated action by the owner of the account.
- User and spouse accounts remain isolated; never share candidate lists, memory context, or approval state.
- A late response from a previous account generation must not update the current account's UI.
- Sign-out, session expiry, and account switching must not silently approve or transfer candidates.
- Automatic extraction is best-effort and must not fail or delay the completed chat turn.
- Sensitive source content and sensitive candidate content must remain excluded from automatic capture.
- Memory context disabled means approved facts are not injected into model context, even though the user can manage the preference and review candidates.
- Deletion, bulk import, memory export, and cross-account transfer require separately designed and tested flows.

## UI requirements before daily-use release

- Show the candidate text and type clearly before approval.
- Provide distinct approve and reject actions; neither may be the default.
- Show pending count and a clear empty state.
- Disable duplicate submissions while a decision is in flight.
- Keep failures visible and retain the candidate for retry; do not optimistically remove it before server confirmation.
- Refresh candidates after a successful decision and on account/session changes.
- Make the distinction between automatic *suggestions* and approved *memory* unmistakable.
- Provide a route to disable automatic suggestions and memory context independently.

## Test gates

- User A cannot list, approve, reject, or retrieve User B's candidates/facts.
- Account switch during list/decision requests cannot leak stale results into the new account.
- A failed decision leaves the candidate pending and visible.
- Duplicate or stale decisions are rejected safely by the API.
- Only approved facts are returned by approved-memory search.
- Disabling memory context prevents retrieval/injection.
- Automatic extraction failure does not fail the chat turn.
- Sensitive content is filtered before candidate persistence.

## Scope

This document records an integration boundary and test plan only. It does not change database policies, memory preferences, production APIs, or user data. The legacy bridge confirmation component remains a separate prototype until a distinct local-tool approval workflow is designed.
