begin;

select plan(35);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000031', 'authenticated', 'authenticated', 'approval-a@example.invalid', '', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000032', 'authenticated', 'authenticated', 'approval-b@example.invalid', '', now(), now(), now());

set local role service_role;

select ok(
  not has_table_privilege('anon', 'public.jarvis_action_approvals', 'SELECT')
  and not has_table_privilege('anon', 'public.jarvis_action_approvals', 'INSERT'),
  'anon cannot read or write action approvals'
);
select ok(
  has_table_privilege('authenticated', 'public.jarvis_action_approvals', 'SELECT')
  and not has_table_privilege('authenticated', 'public.jarvis_action_approvals', 'INSERT')
  and not has_table_privilege('authenticated', 'public.jarvis_action_approvals', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.jarvis_action_approvals', 'DELETE'),
  'authenticated users have read-only table privileges'
);
select ok(
  has_table_privilege('service_role', 'public.jarvis_action_approvals', 'SELECT')
  and has_table_privilege('service_role', 'public.jarvis_action_approvals', 'INSERT')
  and has_table_privilege('service_role', 'public.jarvis_action_approvals', 'UPDATE')
  and has_table_privilege('service_role', 'public.jarvis_action_approvals', 'DELETE')
  and not has_table_privilege('service_role', 'public.jarvis_action_approvals', 'TRUNCATE'),
  'service_role has only required DML privileges'
);
select ok(
  not has_function_privilege('anon', 'public.jarvis_create_action_approval(uuid,uuid,text,text,text,text,text,text,text,text,text,timestamptz,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.jarvis_create_action_approval(uuid,uuid,text,text,text,text,text,text,text,text,text,timestamptz,text)', 'EXECUTE'),
  'anon and authenticated cannot execute approval RPCs'
);
select ok(
  has_function_privilege('service_role', 'public.jarvis_create_action_approval(uuid,uuid,text,text,text,text,text,text,text,text,text,timestamptz,text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.jarvis_resolve_action_approval(uuid,uuid,text,text,text,text,text,text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.jarvis_claim_action_approval_execution(uuid,uuid,text,text,text,text,text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.jarvis_complete_action_approval_execution(uuid,uuid,uuid,text,text)', 'EXECUTE'),
  'service_role can execute the approval lifecycle RPCs'
);
select ok(
  (select count(*) = 5
   from pg_catalog.pg_proc p
   where p.oid in (
     'public.jarvis_create_action_approval(uuid,uuid,text,text,text,text,text,text,text,text,text,timestamptz,text)'::regprocedure,
     'public.jarvis_resolve_action_approval(uuid,uuid,text,text,text,text,text,text)'::regprocedure,
     'public.jarvis_cancel_action_approval(uuid,uuid,text,text,text)'::regprocedure,
     'public.jarvis_claim_action_approval_execution(uuid,uuid,text,text,text,text,text)'::regprocedure,
     'public.jarvis_complete_action_approval_execution(uuid,uuid,uuid,text,text)'::regprocedure
   )
   and not p.prosecdef
   and p.proconfig @> array['search_path=""']),
  'all approval RPCs are SECURITY INVOKER with an empty search_path'
);

select is(
  public.jarvis_create_action_approval(
    '10000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000031',
    'session-a', 'conversation-a', 'invocation-a', 'bmw.climate.start',
    repeat('a', 64), 'Start vehicle climate', 'BMW iX1', 'Starts cabin climate',
    'Can be stopped from the vehicle', now() + interval '5 minutes', 'policy-v1'
  ),
  '10000000-0000-4000-8000-000000000031'::uuid,
  'creates an owner-scoped pending approval'
);
select is(
  public.jarvis_create_action_approval(
    '10000000-0000-4000-8000-000000000032',
    '00000000-0000-4000-8000-000000000032',
    'session-b', 'conversation-b', 'invocation-b', 'email.send',
    repeat('b', 64), 'Send email', 'recipient@example.invalid', 'Sends a message',
    'Cannot recall after delivery', now() + interval '5 minutes', 'policy-v1'
  ),
  '10000000-0000-4000-8000-000000000032'::uuid,
  'creates a separate approval for user B'
);
select is(
  public.jarvis_create_action_approval(
    '10000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000031',
    'session-a', 'conversation-a', 'invocation-a', 'bmw.climate.start',
    repeat('a', 64), 'Start vehicle climate', 'BMW iX1', 'Starts cabin climate',
    'Can be stopped from the vehicle',
    (select expires_at from public.jarvis_action_approvals where request_id = '10000000-0000-4000-8000-000000000031'),
    'policy-v1'
  ),
  '10000000-0000-4000-8000-000000000031'::uuid,
  'retries with the same request envelope are idempotent'
);
select throws_ok(
  $sql$select public.jarvis_create_action_approval(
    '10000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000031',
    'session-a', 'conversation-a', 'invocation-a', 'bmw.climate.start',
    repeat('c', 64), 'Start vehicle climate', 'BMW iX1', 'Starts cabin climate',
    'Can be stopped from the vehicle', now() + interval '5 minutes', 'policy-v1'
  )$sql$,
  '23505', null,
  'same request id cannot be reused with different arguments'
);
select throws_ok(
  $sql$select public.jarvis_create_action_approval(
    '10000000-0000-4000-8000-000000000033',
    '00000000-0000-4000-8000-000000000031',
    'session-a', 'conversation-a', 'invocation-c', 'bmw.climate.start',
    repeat('d', 64), 'Start vehicle climate', 'BMW iX1', 'Starts cabin climate',
    'Can be stopped from the vehicle', now() + interval '11 minutes', 'policy-v1'
  )$sql$,
  '22023', null,
  'approval expiry cannot exceed ten minutes'
);

select is(
  (select valid from public.jarvis_resolve_action_approval(
    '10000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000031',
    'wrong-session', 'invocation-a', 'bmw.climate.start', repeat('a', 64), 'policy-v1', 'approved'
  )),
  false,
  'wrong session cannot approve'
);
select is(
  (select reason from public.jarvis_resolve_action_approval(
    '10000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000031',
    'wrong-session', 'invocation-a', 'bmw.climate.start', repeat('a', 64), 'policy-v1', 'approved'
  )),
  'context_mismatch',
  'wrong session reports context mismatch'
);
select is(
  (select valid from public.jarvis_resolve_action_approval(
    '10000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000031',
    'session-a', 'invocation-a', 'bmw.climate.start', repeat('0', 64), 'policy-v1', 'approved'
  )),
  false,
  'changed arguments cannot approve the pending action'
);
select is(
  (select reason from public.jarvis_resolve_action_approval(
    '10000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000031',
    'session-a', 'invocation-a', 'bmw.climate.start', repeat('0', 64), 'policy-v1', 'approved'
  )),
  'argument_mismatch',
  'changed arguments report digest mismatch'
);
select is(
  (select valid from public.jarvis_resolve_action_approval(
    '10000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000032',
    'session-a', 'invocation-a', 'bmw.climate.start', repeat('a', 64), 'policy-v1', 'approved'
  )),
  false,
  'user B cannot resolve user A approval'
);
select is(
  (select reason from public.jarvis_resolve_action_approval(
    '10000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000032',
    'session-a', 'invocation-a', 'bmw.climate.start', repeat('a', 64), 'policy-v1', 'approved'
  )),
  'not_found',
  'cross-owner approval is indistinguishable from not found'
);
select is(
  (select valid from public.jarvis_resolve_action_approval(
    '10000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000031',
    'session-a', 'invocation-a', 'bmw.climate.start', repeat('a', 64), 'policy-v1', 'approved'
  )),
  true,
  'matching user, session, invocation, capability, digest and policy can approve'
);
select is(
  (select status from public.jarvis_action_approvals where request_id = '10000000-0000-4000-8000-000000000031'),
  'approved',
  'approval decision is persisted'
);
select is(
  (select reason from public.jarvis_resolve_action_approval(
    '10000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000031',
    'session-a', 'invocation-a', 'bmw.climate.start', repeat('a', 64), 'policy-v1', 'approved'
  )),
  'already_resolved',
  'approval cannot be decided twice'
);

select ok(
  public.jarvis_claim_action_approval_execution(
    '10000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000031',
    'session-a', 'invocation-a', 'bmw.climate.start', repeat('a', 64), 'policy-v1'
  ) is not null,
  'approved action can be claimed exactly once for execution'
);
select is(
  public.jarvis_claim_action_approval_execution(
    '10000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000031',
    'session-a', 'invocation-a', 'bmw.climate.start', repeat('a', 64), 'policy-v1'
  ),
  null::uuid,
  'a second execution claim is rejected'
);
select is(
  public.jarvis_complete_action_approval_execution(
    '10000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000031',
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    'executed', null
  ),
  false,
  'wrong execution token cannot complete an action'
);
select is(
  public.jarvis_complete_action_approval_execution(
    '10000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000031',
    (select execution_id from public.jarvis_action_approvals where request_id = '10000000-0000-4000-8000-000000000031'),
    'executed', null
  ),
  true,
  'matching execution token completes the action'
);
select is(
  public.jarvis_complete_action_approval_execution(
    '10000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000031',
    (select execution_id from public.jarvis_action_approvals where request_id = '10000000-0000-4000-8000-000000000031'),
    'executed', null
  ),
  false,
  'completed action cannot be completed again'
);
select is(
  (select status from public.jarvis_action_approvals where request_id = '10000000-0000-4000-8000-000000000031'),
  'executed',
  'execution completion is persisted'
);

insert into public.jarvis_action_approvals (
  request_id, user_id, session_id, conversation_id, invocation_id,
  capability_id, argument_digest, title, target, impact, reversibility,
  policy_version, status, created_at, expires_at
) values (
  '10000000-0000-4000-8000-000000000033',
  '00000000-0000-4000-8000-000000000031',
  'session-a', 'conversation-a', 'invocation-expired', 'bmw.climate.start',
  repeat('e', 64), 'Expired climate', 'BMW iX1', 'Starts cabin climate',
  'Can be stopped from the vehicle', 'policy-v1', 'pending',
  now() - interval '11 minutes', now() - interval '1 minute'
);
select is(
  (select reason from public.jarvis_resolve_action_approval(
    '10000000-0000-4000-8000-000000000033',
    '00000000-0000-4000-8000-000000000031',
    'session-a', 'invocation-expired', 'bmw.climate.start', repeat('e', 64), 'policy-v1', 'approved'
  )),
  'expired',
  'expired approval is marked and cannot be approved'
);

insert into public.jarvis_action_approvals (
  request_id, user_id, session_id, conversation_id, invocation_id,
  capability_id, argument_digest, title, target, impact, reversibility,
  policy_version, expires_at
) values (
  '10000000-0000-4000-8000-000000000034',
  '00000000-0000-4000-8000-000000000031',
  'session-a', 'conversation-a', 'invocation-cancel', 'bmw.climate.start',
  repeat('f', 64), 'Cancel climate', 'BMW iX1', 'Starts cabin climate',
  'Can be stopped from the vehicle', 'policy-v1', now() + interval '5 minutes'
);
select is(
  public.jarvis_cancel_action_approval(
    '10000000-0000-4000-8000-000000000034',
    '00000000-0000-4000-8000-000000000031',
    'session-a', 'invocation-cancel', repeat('f', 64)
  ),
  true,
  'owner can cancel a matching pending approval'
);
select is(
  public.jarvis_cancel_action_approval(
    '10000000-0000-4000-8000-000000000034',
    '00000000-0000-4000-8000-000000000031',
    'session-a', 'invocation-cancel', repeat('f', 64)
  ),
  false,
  'cancelled approval cannot be cancelled twice'
);

insert into public.jarvis_action_approvals (
  request_id, user_id, session_id, conversation_id, invocation_id,
  capability_id, argument_digest, title, target, impact, reversibility,
  policy_version, status, created_at, expires_at, decided_at, decided_by
) values (
  '10000000-0000-4000-8000-000000000035',
  '00000000-0000-4000-8000-000000000031',
  'session-a', 'conversation-a', 'invocation-approved-expired', 'bmw.climate.start',
  repeat('9', 64), 'Expired approved climate', 'BMW iX1', 'Starts cabin climate',
  'Can be stopped from the vehicle', 'policy-v1', 'approved',
  now() - interval '11 minutes', now() - interval '1 minute',
  now() - interval '2 minutes', '00000000-0000-4000-8000-000000000031'
);
select is(
  public.jarvis_claim_action_approval_execution(
    '10000000-0000-4000-8000-000000000035',
    '00000000-0000-4000-8000-000000000031',
    'session-a', 'invocation-approved-expired', 'bmw.climate.start', repeat('9', 64), 'policy-v1'
  ),
  null::uuid,
  'expired approved action cannot be claimed for execution'
);
select is(
  (select status from public.jarvis_action_approvals where request_id = '10000000-0000-4000-8000-000000000035'),
  'expired',
  'expired approved action transitions to expired'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000031', true);
select is(
  (select count(*)::int from public.jarvis_action_approvals),
  4,
  'user A sees only their four approvals'
);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000032', true);
select is(
  (select count(*)::int from public.jarvis_action_approvals),
  1,
  'user B sees only their own approval'
);
select throws_ok(
  $sql$insert into public.jarvis_action_approvals (request_id, user_id, session_id, conversation_id, invocation_id, capability_id, argument_digest, title, target, impact, reversibility, policy_version, expires_at)
  values ('10000000-0000-4000-8000-000000000035', '00000000-0000-4000-8000-000000000032', 's', 'c', 'i', 'email.send', repeat('1',64), 'Send', 'recipient', 'impact', 'reversibility', 'policy-v1', now() + interval '5 minutes')$sql$,
  '42501', null,
  'authenticated users cannot insert approvals directly'
);
select throws_ok(
  $sql$update public.jarvis_action_approvals set status = 'approved' where request_id = '10000000-0000-4000-8000-000000000032'$sql$,
  '42501', null,
  'authenticated users cannot update approval state directly'
);

select * from finish();
rollback;
