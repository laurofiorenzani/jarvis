# JARVIS semantic memory v1 — implementation contract

Status: engineering design for the cloud-first memory workstream. This document does not claim that semantic retrieval is implemented or deployed.

## Goal

Allow JARVIS to recover the right context across conversations without treating the entire chat history as one undifferentiated prompt. A memory result must be scoped to the authenticated person and explain where it came from.

## Memory layers

1. **Conversation history** — immutable user/assistant turns and timestamps. This remains the source record; summaries never replace it.
2. **Conversation summaries** — versioned summaries linked to one conversation and a covered message range. Regenerate when new messages arrive; preserve prior versions for audit/debugging.
3. **Topics and entities** — normalized references such as Family CFO, BMW, training, a named project, or a workbook. Store canonical type/name and user scope; avoid creating a new entity for every spelling variation.
4. **Facts and decisions** — atomic claims with provenance, confidence, sensitivity, valid-time, expiry/review state and optional supersession link. A changed decision supersedes the old one; it does not erase history.
5. **Relationships** — typed edges between facts, topics, entities and conversations (for example, decision_belongs_to_project or conversation_discusses_topic). Edges must be user-scoped and provenance-backed.

## Retrieval pipeline

For each authenticated turn:

1. Derive user identity only from the verified Supabase session. Never accept user_id from the client as authority.
2. Detect the current task/topic and extract search terms/entities. Treat model-produced extraction as untrusted candidate data.
3. Retrieve candidate records only within that user's scope. Start with PostgreSQL full-text/trigram and exact entity/topic matches; add embeddings only after an approved free embedding provider and quota/privacy checks are verified.
4. Rank by a transparent weighted score: lexical/entity relevance, recency, confidence, source quality, validity and explicit user priority. Apply expiry and supersession before ranking.
5. Return a small bounded context with provenance IDs, source conversation/message references, timestamps and confidence. Do not expose another household member's records.
6. Keep the original conversation history available for explicit resume. Memory retrieval supplements it; it must not silently switch the active conversation.
7. If evidence is weak or conflicting, say so and ask a focused clarification rather than inventing a durable fact.

## Write and lifecycle policy

- Do not automatically save every chat message.
- Extract candidate summaries/facts in a background or post-turn stage, but keep them pending until the user has approved the relevant memory policy. Explicitly approved project decisions may be saved with provenance.
- Never store credentials, access tokens, payment details or other secrets in memory.
- Sensitive health, financial-account and identity data require stricter purpose limitation and must not be injected into unrelated tasks. For the initial release, exclude sensitive records from model-facing retrieval unless a separate explicit policy and approval exists.
- Support user review, correction, deletion, export and retention expiry.
- Keep source messages immutable; corrections create a new fact/version and mark the earlier fact superseded.
- Use idempotency keys so retrying an extraction job cannot duplicate facts or summaries.

## Multi-user and household boundaries

- Personal memories, conversations, summaries, entities and relationships are private to one authenticated user by default.
- A future shared household space must be an explicit separate scope with membership and per-record sharing permissions. Never infer that spouses can read each other's private memory merely because they share a household.
- Every query and write must enforce ownership in SQL/RLS or a server-side ownership check; UI filtering is insufficient.

## Initial implementation sequence

1. Add schema and indexes for summaries, topics/entities, facts and typed relationships with RLS.
2. Add deterministic TypeScript validation and ranking functions with unit tests; no external model call in ranking.
3. Add authenticated read/search API with bounded results and provenance.
4. Add extraction as a separate opt-in job; persist pending candidates and require approval before promotion to durable memory.
5. Add regression tests for topic separation, cross-conversation recall, stale/superseded facts, conflicting facts, deletion, expiry, idempotency and two-user isolation.
6. Run CI on the feature branch. Do not deploy migrations or seed production memory until explicit review and approval.

## Release gates

- A fresh conversation can retrieve an approved fact from an older conversation and cite its source.
- A query about BMW does not retrieve unrelated Family CFO or training details unless an explicit relationship makes them relevant.
- Two users cannot retrieve each other's conversations, summaries, facts, entities or edges.
- A superseded decision is not presented as current.
- No secrets or unapproved sensitive data enter model context.
- Retrieval stays within a fixed token/row budget and reports uncertainty when evidence is insufficient.

## Implementation status on the feature branch

- The existing `/memories` endpoint remains a bounded list of explicitly saved personal records.
- The feature branch now adds an authenticated `GET /semantic-memory/search?q=...&limit=...` endpoint. It derives the user ID from the verified Supabase session, checks that user's memory preference, and returns only approved, normal-sensitivity, currently valid facts. Results include source conversation/message identifiers and are capped at 20.
- Search currently uses PostgreSQL full-text search with the `simple` configuration. It is deterministic lexical retrieval, not embeddings or full semantic similarity.
- The SQL schema and endpoint are not yet validated against a live test database. Cross-user integration tests, migration application, CI, and deployment remain release gates. The migration must not be applied to production before those gates and explicit review.

This branch status describes committed code only; it is not evidence that the route or schema has passed runtime tests or is deployed.
