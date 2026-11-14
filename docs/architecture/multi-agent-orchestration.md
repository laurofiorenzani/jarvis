# JARVIS Multi-Agent Orchestration — Architecture Decision

**Status:** proposed architecture; documentation-only implementation on an isolated branch. No runtime agent workers, database schema, provider, production setting or external integration is activated by this document.

## Decision

JARVIS remains one assistant, one conversation surface and one cloud identity/memory foundation. Internally, it becomes a hierarchical multi-agent system: a central **JARVIS Core / Chief Orchestrator** plans work, delegates bounded tasks to specialist agents, checks their evidence and produces the single user-facing response.

An agent is a typed specialist capability (instructions, input/output schema, allowed tools, memory scope and budget), not necessarily a permanently running independent chatbot or a separate model deployment. Agents share the existing model router and infrastructure. The orchestrator may run independent specialist tasks concurrently when their dependencies and permissions allow.

Do not create a second auth system, database, memory store, conversation surface or provider gateway.

## Runtime topology

```text
User (iPhone / Web / Desktop)
          |
          v
   JARVIS Core / Orchestrator
   - intent + context
   - task graph + dependencies
   - policy / consent / budget
   - synthesis + final answer
          |
          +-------------------------------+
          |               |               |
          v               v               v
   Personal & Life    Family CFO     Integrations
   - profile          - read-only    - BMW CarData
   - secretary        - provenance   - Smart Home
   - calendar         - calculations - Communications
   - relationships   - reports      - Maps / devices
          |
          v
 Shared platform services (existing)
 Supabase Auth + RLS | Postgres | Memory | Model Router
 Tool Registry | Approval Registry | Audit | Observer
          |
          v
 Specialist workers (ephemeral, bounded, concurrent)
          |
          v
 Evidence-checked result envelopes -> Orchestrator -> User
```

The diagram is logical, not a claim that all listed services or agents are implemented.

## Core responsibilities

### JARVIS Core / Chief Orchestrator
- Owns the conversation, user intent, language and response.
- Builds a small task graph with explicit dependencies, deadlines and completion criteria.
- Selects agents using a capability registry; chooses a model through the shared provider router.
- Enforces account identity, data scopes, consent, risk classification, approval gates and zero-cost budgets before dispatch.
- Runs independent tasks concurrently; serializes dependent or conflicting writes.
- Validates each result against its schema and evidence, resolves contradictions and reports uncertainty.
- Stops loops, duplicate work, retries and runaway delegation.

The Core is the only component allowed to synthesize the final user-facing answer. Specialists return structured findings, not competing conversational replies.

### Specialist agents

| Agent | Responsibility | Default access |
|---|---|---|
| Personal Context | Approved profile, preferences, routines and context | Own user's approved memory |
| Life / Secretary | Tasks, reminders, calendar and planning | User-authorized calendar/task APIs |
| Family CFO | Budgets, balances, transactions, mortgage and projections | Read-only, provenance-backed financial data |
| Automotive | BMW status and supported telematics | Read-only until a separately approved command API exists |
| Smart Home | Blink, Dreame and compatible devices | Per-device capability and action policy |
| Communications | Email and messaging triage/drafts | Read-only first; sending requires approval |
| Work | Work planning and authorized work systems | Explicitly scoped connectors; no employer access by assumption |
| Health | Authorized health/activity context | Separate explicit consent and least-privilege scope |
| Relationship | User-directed relationship planning and reminders | Only context explicitly available to that account |
| Research | External research and source-backed comparisons | Public sources; citations/provenance retained |
| Multi-AI | Provider/model selection and fallback | Shared router; never bypasses provider policy |
| Self-Evolution | Observe, triage, propose code changes and test | Read-only observer plus isolated development branches; no self-approval |

Agents may be added through the registry without creating new infrastructure or user-facing chatbots.

## Separate engineering team

Self-Evolution uses a distinct engineering-agent group, subordinate to the same policy-controlled orchestrator:
- **Architect:** defines bounded change and interfaces.
- **Developer:** edits only an isolated feature branch.
- **QA:** independently runs tests and regression checks.
- **Security reviewer:** checks permissions, data handling, secrets and threat boundaries.
- **Release coordinator:** prepares evidence and rollback notes.

The authoring agent cannot approve its own work. CI success is not equivalent to human approval, merge, production deployment or release. Production and security-sensitive changes remain gated.

## Agent contract and result envelope

Every registered agent declares:
- stable agent ID and version;
- task types and input/output JSON schema;
- required capabilities and data classification;
- permitted tools and read/write scope;
- memory namespaces it may read or propose to update;
- provider eligibility and privacy requirements;
- max runtime, calls, retries, output size and free-quota budget;
- approval requirements and failure behavior.

Each task result must include:
- task ID, agent ID/version and status;
- concise result and structured payload;
- evidence references and source timestamps;
- assumptions, confidence and unresolved questions;
- tools/actions attempted and confirmed outcomes;
- data classification and whether approval is required.

The orchestrator rejects malformed, out-of-scope, unsupported or evidence-free results. Retrieved memories, user text, web pages, email bodies, issue text and tool output are untrusted data, never policy instructions.

## Memory and account isolation

- Supabase remains the sole canonical identity and personal/project data platform unless a formal decision replaces it.
- Each task is bound to the authenticated user ID on the server; agents cannot choose or override owner IDs.
- No access to the spouse's account, conversations, memories, integrations or CFO data by default.
- Shared household facts require a future explicit sharing model and consent from the relevant account holders.
- Agents receive only the minimum relevant approved context. Pending memory candidates are not silently treated as approved facts.
- Specialist scratch context is task-scoped and expires; durable facts are proposed with provenance and require the existing approval process.
- Operational agent traces store redacted metadata, not private message bodies, credentials, raw prompts or tokens.

## Delegation, concurrency and loop prevention

1. Classify intent, sensitivity and required capabilities.
2. Produce a bounded task graph; deduplicate equivalent tasks already running or completed.
3. Check each task's user scope, consent, provider policy, budget and approval needs.
4. Dispatch independent read-only tasks concurrently; enforce dependency edges for dependent tasks.
5. Require idempotency keys for retried tasks and serialize conflicting writes per resource.
6. Validate result schemas, evidence, freshness and ownership.
7. Reconcile contradictions; retry only transient failures within the declared retry budget.
8. Stop on max depth, max fan-out, wall-clock deadline, call/token budget or repeated equivalent failure.
9. Synthesize one answer and persist only the permitted operational summary.

Initial guardrails: maximum delegation depth 2, fan-out 4 per user request, one retry for transient errors, explicit per-task deadline and an overall request budget. These are conservative starting defaults to be tuned from measurements, not promises of current runtime behavior.

## Permissions and action policy

- Read-only access is the default for every new agent.
- Routine actions may run only when the exact capability is explicitly supported and pre-authorized.
- Unknown capabilities fail closed. Sensitive, external, irreversible, financial, communication-send, account/security, schema and production actions require the existing approval mechanism.
- Approval is bound to user, action, canonical arguments, expiry and one-time consumption; a changed payload requires a new approval.
- BMW CarData is read-only telematics. It does not authorize climate, locks, windows, doors or trunk commands. Never substitute Apple/Siri Shortcuts or private ConnectedDrive endpoints.
- No agent may create paid services, use paid inference, enable billing or evade provider quotas. Exhausted free quotas stop or use an explicitly consented eligible free fallback.

## Shared model routing and cost controls

- Agents request task classes (reasoning, extraction, coding, speech, research); they do not choose arbitrary provider URLs or secrets.
- The existing server-side router selects only providers allowed for that account and task.
- Provider privacy/retention and EEA processing disclosures are enforced before dispatch; ZDR and standard pools remain distinct.
- Free-tier quotas, per-account limits, timeouts, retries and usage telemetry are mandatory. No paid fallback, silent trial, overage or automatic upgrade.
- Prefer deterministic code for arithmetic, validation and policy decisions; use LLM calls only where language reasoning adds value.

## Delivery sequence

### Phase 0 — architecture and contracts
- Approve this model and map existing APIs, PRs and memory scopes to it.
- Add the capability/agent registry types and contract tests without changing production behavior.

### Phase 1 — orchestrator foundation
- Implement task graph, bounded dispatch, result envelopes, idempotency, cancellation, trace metadata and budget enforcement.
- Begin with read-only agents using existing endpoints and mock adapters.

### Phase 2 — first useful specialists
- Personal Context + Secretary, Family CFO (synthetic/read-only until data import is authorized), Research, and BMW CarData read-only.
- Add cross-agent synthesis only after per-agent ownership and evidence checks pass.

### Phase 3 — guarded integrations
- Add approved communications and smart-home read paths, then individual action capabilities only after official API support, consent and approval tests.

### Phase 4 — engineering agents
- Extend the read-only Observer into proposal/development/QA workflows with isolated branches, independent CI, security review and explicit release approval.

### Phase 5 — scale by evidence
- Add specialists only when a distinct task, permission boundary or measurable quality gain justifies them. Avoid one permanent process/model per persona.

## Acceptance criteria

- One JARVIS conversation and one shared cloud identity/memory foundation.
- Two existing accounts remain isolated across every agent and tool.
- Agent registry validates schemas, capabilities, version and budgets.
- Orchestrator can execute independent read-only tasks concurrently and dependent tasks in order.
- Bounded fan-out/depth/retries/timeouts prevent loops and runaway costs.
- Every result is attributable to an agent version and source evidence.
- Unknown or unauthorized actions fail closed; approval is one-time and argument-bound.
- Provider routing honors account consent, privacy policy, EEA disclosures and free quotas.
- Agent failures do not corrupt the conversation or other task results.
- CI covers account isolation, policy denial, replay/idempotency, cancellation, concurrency and budget exhaustion.
- No production rollout until the exact-head tests, human review and release gates pass.

## Current implementation boundary

This document records an architecture decision proposal only. The current repository contains separate cloud, memory, provider, Observer, CFO and BMW feature branches/PRs; they are not yet a unified multi-agent runtime. Do not describe the specialist agents, orchestration, native iOS app or integrations as shipped until code, tests and release evidence prove it.
