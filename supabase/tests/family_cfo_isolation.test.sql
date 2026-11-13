begin;

select plan(30);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'cfo-test-a@example.invalid', '', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'cfo-test-b@example.invalid', '', now(), now(), now());

select lives_ok(
  $cfo$insert into public.jarvis_cfo_accounts (id, owner_user_id, institution_label, account_label, account_type, currency)
    values ('10000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000011', 'Synthetic Bank', 'User A Current', 'current', 'EUR')$cfo$,
  'user A account fixture is valid'
);
select lives_ok(
  $cfo$insert into public.jarvis_cfo_accounts (id, owner_user_id, institution_label, account_label, account_type, currency)
    values ('10000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000012', 'Synthetic Bank', 'User B Current', 'current', 'EUR')$cfo$,
  'user B account fixture is valid'
);
select lives_ok(
  $cfo$insert into public.jarvis_cfo_transactions
    (id, owner_user_id, account_id, transaction_at, posted_at, description, amount, currency, status, confidence, record_status, source_type, source_name, observed_at, effective_at)
    values ('20000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000011', '2026-11-13', '2026-11-13', 'Synthetic salary', 2500.00, 'EUR', 'posted', 'user_confirmed', 'confirmed', 'manual', 'synthetic-test', now(), '2026-11-13')$cfo$,
  'user A transaction fixture is valid'
);
select lives_ok(
  $cfo$insert into public.jarvis_cfo_transactions
    (id, owner_user_id, account_id, transaction_at, posted_at, description, amount, currency, status, confidence, record_status, source_type, source_name, observed_at, effective_at)
    values ('20000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000012', '2026-11-13', '2026-11-13', 'Synthetic salary', 2500.00, 'EUR', 'posted', 'user_confirmed', 'confirmed', 'manual', 'synthetic-test', now(), '2026-11-13')$cfo$,
  'user B transaction fixture is valid'
);
select lives_ok(
  $cfo$insert into public.jarvis_cfo_balance_snapshots
    (id, owner_user_id, account_id, observed_at, amount, currency, confidence, source_type, source_name, effective_at)
    values ('30000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000011', now(), 2500.00, 'EUR', 'user_confirmed', 'manual', 'synthetic-test', '2026-11-13')$cfo$,
  'user A balance snapshot fixture is valid'
);
select lives_ok(
  $cfo$insert into public.jarvis_cfo_balance_snapshots
    (id, owner_user_id, account_id, observed_at, amount, currency, confidence, source_type, source_name, effective_at)
    values ('30000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000012', now(), 2500.00, 'EUR', 'user_confirmed', 'manual', 'synthetic-test', '2026-11-13')$cfo$,
  'user B balance snapshot fixture is valid'
);

select throws_ok(
  $cfo$insert into public.jarvis_cfo_transactions
    (owner_user_id, account_id, transaction_at, description, amount, currency, status, confidence, source_type, source_name, observed_at, effective_at)
    values ('00000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000012', '2026-11-13', 'Cross-owner account', 1.00, 'EUR', 'posted', 'verified', 'manual', 'synthetic-test', now(), '2026-11-13')$cfo$,
  '23503', null,
  'transaction cannot reference another user account'
);
select throws_ok(
  $cfo$insert into public.jarvis_cfo_balance_snapshots
    (owner_user_id, account_id, observed_at, amount, currency, confidence, source_type, source_name, effective_at)
    values ('00000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000012', now(), 1.00, 'EUR', 'verified', 'manual', 'synthetic-test', '2026-11-13')$cfo$,
  '23503', null,
  'balance snapshot cannot reference another user account'
);
select throws_ok(
  $cfo$insert into public.jarvis_cfo_transactions
    (owner_user_id, account_id, transaction_at, description, amount, currency, status, confidence, source_type, source_name, observed_at, effective_at)
    values ('00000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000011', '2026-11-13', 'Positive infinity', 'Infinity'::numeric, 'EUR', 'posted', 'verified', 'manual', 'synthetic-test', now(), '2026-11-13')$cfo$,
  '22003', null,
  'transaction rejects positive infinity amounts'
);
select throws_ok(
  $cfo$insert into public.jarvis_cfo_transactions
    (owner_user_id, account_id, transaction_at, description, amount, currency, status, confidence, source_type, source_name, observed_at, effective_at)
    values ('00000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000011', '2026-11-13', 'Negative infinity', '-Infinity'::numeric, 'EUR', 'posted', 'verified', 'manual', 'synthetic-test', now(), '2026-11-13')$cfo$,
  '22003', null,
  'transaction rejects negative infinity amounts'
);
select throws_ok(
  $cfo$insert into public.jarvis_cfo_balance_snapshots
    (owner_user_id, account_id, observed_at, amount, currency, confidence, source_type, source_name, effective_at)
    values ('00000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000011', now(), 'NaN'::numeric, 'EUR', 'verified', 'manual', 'synthetic-test', '2026-11-13')$cfo$,
  '23514', null,
  'balance snapshot rejects NaN amounts'
);
select throws_ok(
  $cfo$insert into public.jarvis_cfo_balance_snapshots
    (owner_user_id, account_id, observed_at, amount, currency, confidence, source_type, source_name, effective_at)
    values ('00000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000011', now(), 'Infinity'::numeric, 'EUR', 'verified', 'manual', 'synthetic-test', '2026-11-13')$cfo$,
  '22003', null,
  'balance snapshot rejects positive infinity amounts'
);
select throws_ok(
  $cfo$insert into public.jarvis_cfo_transactions
    (owner_user_id, account_id, transaction_at, description, amount, currency, status, confidence, source_type, source_name, observed_at, effective_at)
    values ('00000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000011', '2026-11-13', 'Invalid currency', 1.00, '12X', 'posted', 'verified', 'manual', 'synthetic-test', now(), '2026-11-13')$cfo$,
  '23514', null,
  'transaction rejects invalid currency codes'
);
select throws_ok(
  $cfo$insert into public.jarvis_cfo_transactions
    (owner_user_id, account_id, transaction_at, description, amount, currency, status, confidence, source_type, source_name, observed_at, effective_at)
    values ('00000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000011', '2026-11-13', 'Invalid confidence', 1.00, 'EUR', 'posted', 'certain', 'manual', 'synthetic-test', now(), '2026-11-13')$cfo$,
  '23514', null,
  'transaction rejects unsupported confidence labels'
);


select throws_ok(
  $cfo$insert into public.jarvis_cfo_transactions
    (owner_user_id, account_id, transaction_at, description, amount, currency, status, confidence, source_type, source_name, observed_at, effective_at)
    values ('00000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000011', '2026-11-13', 'Transaction NaN', 'NaN'::numeric, 'EUR', 'posted', 'verified', 'manual', 'synthetic-test', now(), '2026-11-13')$cfo$,
  '23514', null,
  'transaction rejects NaN amounts'
);
select throws_ok(
  $cfo$insert into public.jarvis_cfo_balance_snapshots
    (owner_user_id, account_id, observed_at, amount, currency, confidence, source_type, source_name, effective_at)
    values ('00000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000011', now(), '-Infinity'::numeric, 'EUR', 'verified', 'manual', 'synthetic-test', '2026-11-13')$cfo$,
  '22003', null,
  'balance snapshot rejects negative infinity amounts'
);
select ok(
  has_table_privilege('service_role', 'public.jarvis_cfo_accounts', 'SELECT')
  and has_table_privilege('service_role', 'public.jarvis_cfo_accounts', 'INSERT')
  and has_table_privilege('service_role', 'public.jarvis_cfo_accounts', 'UPDATE')
  and has_table_privilege('service_role', 'public.jarvis_cfo_accounts', 'DELETE')
  and not has_table_privilege('service_role', 'public.jarvis_cfo_accounts', 'TRUNCATE'),
  'service_role has only required DML privileges on CFO accounts'
);
select ok(
  has_table_privilege('service_role', 'public.jarvis_cfo_transactions', 'SELECT')
  and has_table_privilege('service_role', 'public.jarvis_cfo_transactions', 'INSERT')
  and has_table_privilege('service_role', 'public.jarvis_cfo_transactions', 'UPDATE')
  and has_table_privilege('service_role', 'public.jarvis_cfo_transactions', 'DELETE')
  and not has_table_privilege('service_role', 'public.jarvis_cfo_transactions', 'TRUNCATE'),
  'service_role has only required DML privileges on CFO transactions'
);
select ok(
  has_table_privilege('service_role', 'public.jarvis_cfo_balance_snapshots', 'SELECT')
  and has_table_privilege('service_role', 'public.jarvis_cfo_balance_snapshots', 'INSERT')
  and has_table_privilege('service_role', 'public.jarvis_cfo_balance_snapshots', 'UPDATE')
  and has_table_privilege('service_role', 'public.jarvis_cfo_balance_snapshots', 'DELETE')
  and not has_table_privilege('service_role', 'public.jarvis_cfo_balance_snapshots', 'TRUNCATE'),
  'service_role has only required DML privileges on CFO snapshots'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000011', true);
select is((select count(*)::int from public.jarvis_cfo_accounts), 1, 'user A sees only their own accounts');
select is((select count(*)::int from public.jarvis_cfo_transactions), 1, 'user A sees only their own transactions');
select is((select count(*)::int from public.jarvis_cfo_balance_snapshots), 1, 'user A sees only their own balance snapshots');
select throws_ok(
  $cfo$insert into public.jarvis_cfo_transactions
    (owner_user_id, account_id, transaction_at, description, amount, currency, status, confidence, source_type, source_name, observed_at, effective_at)
    values ('00000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000011', '2026-11-13', 'Direct client write', 1.00, 'EUR', 'posted', 'verified', 'manual', 'synthetic-test', now(), '2026-11-13')$cfo$,
  '42501', null,
  'authenticated user cannot write financial transactions directly'
);
select throws_ok(
  $cfo$update public.jarvis_cfo_accounts set account_label = 'Cross-account mutation'
    where owner_user_id = '00000000-0000-4000-8000-000000000012'$cfo$,
  '42501', null,
  'authenticated user cannot update financial account records directly'
);
select throws_ok(
  $cfo$delete from public.jarvis_cfo_accounts
    where owner_user_id = '00000000-0000-4000-8000-000000000011'$cfo$,
  '42501', null,
  'authenticated user cannot delete financial account records directly'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000012', true);
select is((select count(*)::int from public.jarvis_cfo_accounts), 1, 'user B sees only their own accounts');
select is((select count(*)::int from public.jarvis_cfo_transactions), 1, 'user B sees only their own transactions');
select is((select count(*)::int from public.jarvis_cfo_balance_snapshots), 1, 'user B sees only their own balance snapshots');

set local role anon;
select throws_ok(
  $cfo$select count(*) from public.jarvis_cfo_accounts$cfo$,
  '42501', null,
  'anonymous user cannot read CFO accounts'
);
select throws_ok(
  $cfo$insert into public.jarvis_cfo_accounts (owner_user_id, institution_label, account_label, account_type, currency)
    values ('00000000-0000-4000-8000-000000000011', 'Synthetic Bank', 'Anonymous Write', 'current', 'EUR')$cfo$,
  '42501', null,
  'anonymous user cannot write CFO accounts'
);
reset role;

select * from finish();
rollback;
