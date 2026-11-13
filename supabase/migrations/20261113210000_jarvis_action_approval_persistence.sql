-- Persistent, owner-scoped approval lifecycle. Stores approval metadata and a
-- digest only; raw tool arguments and execution results are never stored.
-- All state changes are server-side service_role RPCs. No integration is executed here.

create table if not exists public.jarvis_action_approvals (
  request_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null check (length(btrim(session_id)) between 1 and 200),
  conversation_id text not null check (length(btrim(conversation_id)) between 1 and 200),
  invocation_id text not null check (length(btrim(invocation_id)) between 1 and 200),
  capability_id text not null check (length(btrim(capability_id)) between 1 and 200),
  argument_digest text not null check (argument_digest ~ '^[a-f0-9]{64}$'),
  title text not null check (length(btrim(title)) between 1 and 200),
  target text not null check (length(btrim(target)) between 1 and 300),
  impact text not null check (length(btrim(impact)) between 1 and 500),
  reversibility text not null check (length(btrim(reversibility)) between 1 and 500),
  policy_version text not null check (length(btrim(policy_version)) between 1 and 128),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'expired', 'cancelled', 'executing', 'executed', 'failed')),
  created_at timestamptz not null default pg_catalog.now(),
  expires_at timestamptz not null,
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  execution_id uuid unique,
  execution_started_at timestamptz,
  executed_at timestamptz,
  failure_code text check (failure_code is null or failure_code ~ '^[a-z0-9._-]{1,64}$'),
  constraint jarvis_action_approvals_expiry_check
    check (expires_at > created_at and expires_at <= created_at + interval '10 minutes'),
  constraint jarvis_action_approvals_decision_check
    check (
      (status = 'pending' and decided_at is null and decided_by is null)
      or (status = 'expired' and decided_at is not null)
      or (status in ('approved', 'rejected', 'cancelled', 'executing', 'executed', 'failed')
          and decided_at is not null and decided_by is not null)
    ),
  constraint jarvis_action_approvals_execution_check
    check (
      (status in ('executing', 'executed', 'failed')
        and execution_id is not null and execution_started_at is not null)
      or (status not in ('executing', 'executed', 'failed')
        and execution_id is null and execution_started_at is null)
    ),
  constraint jarvis_action_approvals_completion_check
    check (
      (status in ('executed', 'failed') and executed_at is not null)
      or (status not in ('executed', 'failed') and executed_at is null)
    ),
  constraint jarvis_action_approvals_failure_check
    check ((status = 'failed') = (failure_code is not null))
);

create index if not exists jarvis_action_approvals_owner_status_idx
  on public.jarvis_action_approvals (user_id, status, created_at desc);
create index if not exists jarvis_action_approvals_pending_expiry_idx
  on public.jarvis_action_approvals (expires_at)
  where status = 'pending';
create index if not exists jarvis_action_approvals_execution_idx
  on public.jarvis_action_approvals (execution_id)
  where execution_id is not null;

alter table public.jarvis_action_approvals enable row level security;
drop policy if exists "Users can read their own action approvals"
  on public.jarvis_action_approvals;
create policy "Users can read their own action approvals"
  on public.jarvis_action_approvals for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.jarvis_action_approvals from public, anon, authenticated, service_role;
grant select on table public.jarvis_action_approvals to authenticated;
grant select, insert, update, delete on table public.jarvis_action_approvals to service_role;

create or replace function public.jarvis_create_action_approval(
  p_request_id uuid, p_user_id uuid, p_session_id text, p_conversation_id text,
  p_invocation_id text, p_capability_id text, p_argument_digest text,
  p_title text, p_target text, p_impact text, p_reversibility text,
  p_expires_at timestamptz, p_policy_version text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_existing public.jarvis_action_approvals%rowtype;
begin
  if p_request_id is null or p_user_id is null
    or p_argument_digest is null or p_argument_digest !~ '^[a-f0-9]{64}$'
    or p_expires_at is null or p_expires_at <= pg_catalog.now()
    or p_expires_at > pg_catalog.now() + interval '10 minutes'
    or p_session_id is null or length(btrim(p_session_id)) not between 1 and 200
    or p_conversation_id is null or length(btrim(p_conversation_id)) not between 1 and 200
    or p_invocation_id is null or length(btrim(p_invocation_id)) not between 1 and 200
    or p_capability_id is null or length(btrim(p_capability_id)) not between 1 and 200
    or p_title is null or length(btrim(p_title)) not between 1 and 200
    or p_target is null or length(btrim(p_target)) not between 1 and 300
    or p_impact is null or length(btrim(p_impact)) not between 1 and 500
    or p_reversibility is null or length(btrim(p_reversibility)) not between 1 and 500
    or p_policy_version is null or length(btrim(p_policy_version)) not between 1 and 128 then
    raise exception 'invalid action approval envelope' using errcode = '22023';
  end if;

  insert into public.jarvis_action_approvals (
    request_id, user_id, session_id, conversation_id, invocation_id,
    capability_id, argument_digest, title, target, impact, reversibility,
    policy_version, expires_at
  ) values (
    p_request_id, p_user_id, p_session_id, p_conversation_id, p_invocation_id,
    p_capability_id, pg_catalog.lower(p_argument_digest), p_title, p_target,
    p_impact, p_reversibility, p_policy_version, p_expires_at
  )
  on conflict (request_id) do nothing;

  if found then return p_request_id; end if;

  select * into v_existing from public.jarvis_action_approvals where request_id = p_request_id;
  if found
    and v_existing.user_id = p_user_id
    and v_existing.session_id = p_session_id
    and v_existing.conversation_id = p_conversation_id
    and v_existing.invocation_id = p_invocation_id
    and v_existing.capability_id = p_capability_id
    and v_existing.argument_digest = pg_catalog.lower(p_argument_digest)
    and v_existing.title = p_title
    and v_existing.target = p_target
    and v_existing.impact = p_impact
    and v_existing.reversibility = p_reversibility
    and v_existing.policy_version = p_policy_version
    and v_existing.expires_at = p_expires_at then
    return p_request_id;
  end if;

  raise exception 'approval request id already exists with a different envelope' using errcode = '23505';
end;
$function$;

create or replace function public.jarvis_resolve_action_approval(
  p_request_id uuid, p_user_id uuid, p_session_id text, p_invocation_id text,
  p_capability_id text, p_argument_digest text, p_policy_version text, p_decision text
)
returns table (valid boolean, reason text, status text, decided_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_row public.jarvis_action_approvals%rowtype;
  v_now timestamptz := pg_catalog.now();
begin
  if p_decision is null or p_decision not in ('approved', 'rejected') then
    return query select false, 'invalid_decision'::text, null::text, null::timestamptz;
    return;
  end if;
  if p_argument_digest is null or p_argument_digest !~ '^[a-f0-9]{64}$' then
    return query select false, 'argument_mismatch'::text, null::text, null::timestamptz;
    return;
  end if;

  update public.jarvis_action_approvals
  set status = 'expired', decided_at = v_now, decided_by = null
  where request_id = p_request_id and user_id = p_user_id
    and status = 'pending' and expires_at <= v_now;

  update public.jarvis_action_approvals
  set status = p_decision, decided_at = v_now, decided_by = p_user_id
  where request_id = p_request_id and user_id = p_user_id
    and session_id = p_session_id and invocation_id = p_invocation_id
    and capability_id = p_capability_id
    and argument_digest = pg_catalog.lower(p_argument_digest)
    and policy_version = p_policy_version
    and status = 'pending' and expires_at > v_now;

  if found then
    return query select true, 'resolved'::text, p_decision, v_now;
    return;
  end if;

  select * into v_row from public.jarvis_action_approvals
  where request_id = p_request_id and user_id = p_user_id;

  if not found then
    return query select false, 'not_found'::text, null::text, null::timestamptz;
  elsif v_row.status = 'expired' or v_row.expires_at <= v_now then
    return query select false, 'expired'::text, v_row.status, v_row.decided_at;
  elsif v_row.status <> 'pending' then
    return query select false, 'already_resolved'::text, v_row.status, v_row.decided_at;
  elsif v_row.session_id <> p_session_id
    or v_row.invocation_id <> p_invocation_id
    or v_row.capability_id <> p_capability_id then
    return query select false, 'context_mismatch'::text, v_row.status, v_row.decided_at;
  elsif v_row.argument_digest <> pg_catalog.lower(p_argument_digest) then
    return query select false, 'argument_mismatch'::text, v_row.status, v_row.decided_at;
  elsif v_row.policy_version <> p_policy_version then
    return query select false, 'invalid_envelope'::text, v_row.status, v_row.decided_at;
  else
    return query select false, 'invalid_envelope'::text, v_row.status, v_row.decided_at;
  end if;
end;
$function$;

create or replace function public.jarvis_cancel_action_approval(
  p_request_id uuid, p_user_id uuid, p_session_id text,
  p_invocation_id text, p_argument_digest text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  update public.jarvis_action_approvals
  set status = 'cancelled', decided_at = pg_catalog.now(), decided_by = p_user_id
  where request_id = p_request_id and user_id = p_user_id
    and session_id = p_session_id and invocation_id = p_invocation_id
    and argument_digest = pg_catalog.lower(p_argument_digest)
    and status = 'pending' and expires_at > pg_catalog.now();
  return found;
end;
$function$;

create or replace function public.jarvis_claim_action_approval_execution(
  p_request_id uuid, p_user_id uuid, p_session_id text, p_invocation_id text,
  p_capability_id text, p_argument_digest text, p_policy_version text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_execution_id uuid;
  v_now timestamptz := pg_catalog.now();
begin
  update public.jarvis_action_approvals
  set status = 'expired', decided_at = v_now
  where request_id = p_request_id and user_id = p_user_id
    and status = 'approved' and expires_at <= v_now;

  update public.jarvis_action_approvals
  set status = 'executing',
      execution_id = pg_catalog.gen_random_uuid(),
      execution_started_at = v_now
  where request_id = p_request_id and user_id = p_user_id
    and session_id = p_session_id and invocation_id = p_invocation_id
    and capability_id = p_capability_id
    and argument_digest = pg_catalog.lower(p_argument_digest)
    and policy_version = p_policy_version
    and status = 'approved' and expires_at > v_now
  returning execution_id into v_execution_id;

  return v_execution_id;
end;
$function$;

create or replace function public.jarvis_complete_action_approval_execution(
  p_request_id uuid, p_user_id uuid, p_execution_id uuid,
  p_outcome text, p_failure_code text default null
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if p_outcome is null or p_outcome not in ('executed', 'failed') then
    raise exception 'invalid execution outcome' using errcode = '22023';
  end if;
  if p_outcome = 'failed' and (p_failure_code is null or p_failure_code !~ '^[a-z0-9._-]{1,64}$') then
    raise exception 'failure code must be a bounded safe identifier' using errcode = '22023';
  end if;
  if p_outcome = 'executed' and p_failure_code is not null then
    raise exception 'successful execution cannot include a failure code' using errcode = '22023';
  end if;

  update public.jarvis_action_approvals
  set status = p_outcome, executed_at = pg_catalog.now(), failure_code = p_failure_code
  where request_id = p_request_id and user_id = p_user_id
    and execution_id = p_execution_id and status = 'executing';

  return found;
end;
$function$;

revoke all on function public.jarvis_create_action_approval(uuid, uuid, text, text, text, text, text, text, text, text, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.jarvis_resolve_action_approval(uuid, uuid, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.jarvis_cancel_action_approval(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.jarvis_claim_action_approval_execution(uuid, uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.jarvis_complete_action_approval_execution(uuid, uuid, uuid, text, text) from public, anon, authenticated;

grant execute on function public.jarvis_create_action_approval(uuid, uuid, text, text, text, text, text, text, text, text, text, timestamptz, text) to service_role;
grant execute on function public.jarvis_resolve_action_approval(uuid, uuid, text, text, text, text, text, text) to service_role;
grant execute on function public.jarvis_cancel_action_approval(uuid, uuid, text, text, text) to service_role;
grant execute on function public.jarvis_claim_action_approval_execution(uuid, uuid, text, text, text, text, text) to service_role;
grant execute on function public.jarvis_complete_action_approval_execution(uuid, uuid, uuid, text, text) to service_role;
