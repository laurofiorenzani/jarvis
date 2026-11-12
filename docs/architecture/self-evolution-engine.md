# JARVIS Self-Evolution Engine — Foundation Design

Status: foundation and first read-only observer/triage prototype implemented on `work/self-evolution-engine-foundation`; not enabled in production.

## Goal

Give JARVIS a controlled ability to observe its own operation, identify improvement opportunities, prepare code changes in isolated branches, run validation, and request promotion only after explicit release gates. This is not unrestricted self-modification.

## Non-negotiable invariants

1. **Account isolation:** every user-data query is scoped to the authenticated Supabase user. The two household accounts remain separate unless a future, explicit household-sharing model is designed and consented to.
2. **Least privilege:** runtime chat cannot read GitHub write credentials, production database credentials, deployment credentials, or provider secrets.
3. **No prompt-to-code execution:** user messages, retrieved memories, logs, issue text, and external tool output are untrusted data. They may inform a proposal but never become executable instructions by themselves.
4. **Development first:** code changes are made only in a dedicated non-production branch. No direct writes to the default branch.
5. **Test before review:** a proposal must pass required CI and security checks before it can be marked ready for human review.
6. **No self-approval:** the agent that proposes a change cannot approve or merge it.
7. **Production guard:** production schema changes, secrets, authentication settings, external integrations, merges, and deployments require a separate approval policy. A broad request to work autonomously does not remove this guard.
8. **Auditability:** every observation, proposal, tool action, test result, approval and deployment is recorded with actor, timestamp, target and outcome. Never store secrets or raw private conversation content in operational logs.
9. **Budget and rate limits:** bounded tool calls, runtime, token usage, retry count and change size. Fail closed on exhausted limits.
10. **Rollback:** every production release has a known prior deployment/version and documented rollback path.

## Proposed components

### 1. System Observer
Collects bounded operational signals: Edge Function health/status, deployment state, CI results, structured error codes, queue depth, latency and integration health. It must not ingest raw message bodies or credentials.

### 2. Intelligence / Triage Core
Correlates signals, deduplicates incidents, assigns severity and confidence, and distinguishes symptoms from root-cause hypotheses. It can recommend an investigation; it cannot execute a remediation.

### 3. Improvement Planner
Creates a structured proposal containing:
- observed evidence and timestamps;
- user impact and severity;
- hypothesis and confidence;
- affected files/services;
- security/privacy impact;
- proposed patch outline;
- required tests;
- rollback plan;
- whether human approval is required.

### 4. Development Agent
Works in a disposable workspace and a dedicated Git branch. It may read repository files and create commits/PRs on that branch. It must not have access to production secrets or production mutation credentials. Changes are constrained by path allowlists and maximum diff size.

### 5. Validation Gate
Runs typecheck, lint, unit/integration tests, dependency/security audit, migration checks, account-isolation tests and deployment preview checks. Missing or inconclusive checks are failures, not passes.

### 6. Release Controller
Publishes a review-ready PR and deployment preview. A separate human-controlled approval is required for merge and production release. For database migrations, auth/security settings, billing, credentials and integrations, require explicit approval for each change class.

## Workflow

```text
Signals → Observer → Triage → Improvement proposal
                                  ↓
                         Human policy check
                                  ↓
                     Isolated branch + patch
                                  ↓
                     CI + security validation
                                  ↓
                         Review-ready PR
                                  ↓
                   Explicit release approval
                                  ↓
                     Deploy + health checks
                                  ↓
                       Audit + rollback path
```

## Initial implementation phases

### Phase 0 — Safe operational baseline
- Define health and deployment status contracts.
- Use structured, redacted operational events.
- Document data retention and access boundaries.
- Add a read-only observer role; do not add production write credentials.

### Phase 1 — Read-only observer
- [x] Add a GitHub Actions workflow that checks the public production API health endpoint and the verified Vercel project domain.
- [x] Normalize allowlisted service metadata into a strict observation contract; reject unknown sources, invalid timestamps and inconsistent HTTP status.
- [x] Add bounded severity classification, low-cardinality fingerprints and deterministic deduplication/triage.
- [x] Add tests proving prompt-like strings and bearer tokens are not retained, and every proposed remediation remains subject to human approval.
- [ ] Extend observation to CI and deployment metadata using read-only GitHub/Vercel permissions.
- [ ] Persist sanitized snapshots and incident records only after retention, access and RLS policies are implemented and reviewed.

The workflow runs on branch pushes and can be manually dispatched. Its scheduled checks become active only after the workflow is merged into the default branch. It performs HTTP availability checks only; it does not collect logs, request bodies, private messages, credentials or account data.

### Phase 2 — Proposal-only planner
- Convert incidents into structured improvement proposals.
- Deduplicate proposals and rank by impact, confidence and risk.
- Require evidence links and a rollback/test plan.
- No code changes yet.

### Phase 3 — Isolated development agent
- Create a dedicated branch and patch only allowlisted paths.
- Run tests in a disposable environment.
- Open draft PRs; never merge or deploy.
- Enforce diff-size and execution budgets.

### Phase 4 — Guarded release
- Add a separate approval UI and signed approval record.
- Promote only the exact commit SHA that passed CI.
- Deploy preview, smoke-test, then production only after approval.
- Verify health and automatically halt/rollback on failed post-deploy checks.

## Operational data model (proposal)

- `jarvis_system_observations`: source, observed_at, severity, signal_code, sanitized_payload, correlation_id.
- `jarvis_improvement_proposals`: title, hypothesis, evidence_refs, impact, confidence, risk_level, affected_paths, test_plan, rollback_plan, status.
- `jarvis_change_runs`: proposal_id, branch, commit_sha, CI_run_id, validation_summary, status.
- `jarvis_release_approvals`: change_run_id, approver_user_id, approved_commit_sha, approval_scope, approved_at, revoked_at.

All tables must use RLS. Operational records must not be used as a back door to expose one household account's personal data to the other. The schema is intentionally not migrated yet.

## Threat model and required controls

| Threat | Required control |
|---|---|
| Malicious prompt or poisoned memory asks agent to exfiltrate secrets | Treat all retrieved text as data; no secret access in development agent |
| Compromised runtime token | Short-lived scoped credentials; read-only observer; per-user authorization |
| Agent creates destructive patch | Allowlisted paths, diff limits, isolated branch, mandatory CI and review |
| CI false positive or skipped test | Required checks enforced by GitHub branch protection; missing checks fail closed |
| Cross-account data leak | User-scoped queries, RLS, two-account regression tests; operational telemetry excludes personal content |
| Runaway loops or spend | Hard call, time, token, retry and cost ceilings |
| Bad production release | Human approval bound to exact SHA, staged deployment, health checks and rollback |
| Secret appears in logs or PR | Redaction, secret scanning, no env dumps, no raw request/response bodies |

## Acceptance criteria

- Observer can report service/CI/deployment status without access to private conversation content.
- A proposal contains evidence, confidence, risk, tests and rollback.
- Development agent cannot read production secrets or mutate production data.
- Agent-generated patch is limited to a new development branch.
- A failed or missing check prevents a PR from being labelled ready.
- No agent identity can approve or merge its own change.
- Two-account isolation tests pass for all user-scoped data paths.
- Production release approval is bound to the exact validated commit SHA.

## Explicit non-goals for this foundation

- Unrestricted self-modification or self-replication.
- Autonomous production migrations, secret rotation, billing changes or account creation.
- Automatic access to private messages, email, WhatsApp, camera feeds or financial records for telemetry.
- Treating lexical memory retrieval as embedding-based semantic similarity.
- Claiming that a model can improve itself merely because it can create a code patch.
