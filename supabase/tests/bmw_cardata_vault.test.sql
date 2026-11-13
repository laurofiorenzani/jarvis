begin;

select plan(28);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000051', 'authenticated', 'authenticated', 'bmw-vault-a@example.invalid', '', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000052', 'authenticated', 'authenticated', 'bmw-vault-b@example.invalid', '', now(), now(), now());

select ok(
  not has_schema_privilege('anon', 'vault', 'USAGE')
  and not has_schema_privilege('authenticated', 'vault', 'USAGE'),
  'anon and authenticated cannot access the Vault schema'
);
select ok(
  has_schema_privilege('service_role', 'vault', 'USAGE')
  and has_table_privilege('service_role', 'vault.decrypted_secrets', 'SELECT')
  and has_table_privilege('service_role', 'vault.secrets', 'DELETE'),
  'service_role has only the Vault access required by the backend'
);
select ok(
  not has_table_privilege('anon', 'vault.decrypted_secrets', 'SELECT')
  and not has_table_privilege('authenticated', 'vault.decrypted_secrets', 'SELECT'),
  'anon and authenticated cannot read decrypted Vault secrets'
);
select ok(
  not has_function_privilege('anon', 'vault.create_secret(text,text,text,uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'vault.create_secret(text,text,text,uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'vault.update_secret(uuid,text,text,text,uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'vault.update_secret(uuid,text,text,text,uuid)', 'EXECUTE'),
  'only trusted backend roles can call Vault mutation functions'
);
select ok(
  not has_table_privilege('anon', 'public.jarvis_bmw_cardata_credentials', 'SELECT')
  and has_table_privilege('authenticated', 'public.jarvis_bmw_cardata_credentials', 'SELECT')
  and not has_table_privilege('authenticated', 'public.jarvis_bmw_cardata_credentials', 'INSERT')
  and not has_table_privilege('authenticated', 'public.jarvis_bmw_cardata_credentials', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.jarvis_bmw_cardata_credentials', 'DELETE'),
  'users have read-only access to their own connection metadata'
);
select ok(
  has_table_privilege('service_role', 'public.jarvis_bmw_cardata_credentials', 'SELECT')
  and has_table_privilege('service_role', 'public.jarvis_bmw_cardata_credentials', 'INSERT')
  and has_table_privilege('service_role', 'public.jarvis_bmw_cardata_credentials', 'UPDATE')
  and has_table_privilege('service_role', 'public.jarvis_bmw_cardata_credentials', 'DELETE'),
  'service_role can manage credential metadata'
);
select ok(
  (select count(*) = 3
   from pg_catalog.pg_proc p
   where p.oid in (
     'public.jarvis_store_bmw_cardata_refresh_token(uuid,text,text,timestamptz)'::regprocedure,
     'public.jarvis_get_bmw_cardata_refresh_token(uuid)'::regprocedure,
     'public.jarvis_delete_bmw_cardata_credentials(uuid)'::regprocedure
   )
   and not p.prosecdef
   and p.proconfig @> array['search_path=""']),
  'all BMW token RPCs are SECURITY INVOKER with an empty search_path'
);
select ok(
  not has_function_privilege('anon', 'public.jarvis_store_bmw_cardata_refresh_token(uuid,text,text,timestamptz)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.jarvis_store_bmw_cardata_refresh_token(uuid,text,text,timestamptz)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.jarvis_get_bmw_cardata_refresh_token(uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.jarvis_get_bmw_cardata_refresh_token(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.jarvis_delete_bmw_cardata_credentials(uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.jarvis_delete_bmw_cardata_credentials(uuid)', 'EXECUTE'),
  'anon and authenticated cannot execute BMW token RPCs'
);
select ok(
  has_function_privilege('service_role', 'public.jarvis_store_bmw_cardata_refresh_token(uuid,text,text,timestamptz)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.jarvis_get_bmw_cardata_refresh_token(uuid)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.jarvis_delete_bmw_cardata_credentials(uuid)', 'EXECUTE'),
  'service_role can execute BMW token RPCs'
);
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'jarvis_bmw_cardata_credentials'
      and column_name in ('refresh_token', 'access_token', 'id_token')
  ),
  'application metadata table contains no plaintext OAuth token columns'
);

set local role service_role;

select is(
  public.jarvis_store_bmw_cardata_refresh_token(
    '00000000-0000-4000-8000-000000000051',
    'bmw-client-test',
    'synthetic-refresh-token-v1',
    now() + interval '14 days'
  ),
  true,
  'stores a synthetic refresh token in Vault'
);
select is(
  (select count(*)::int from public.jarvis_bmw_cardata_credentials
   where user_id = '00000000-0000-4000-8000-000000000051'),
  1,
  'stores one owner-scoped credential metadata row'
);
select ok(
  (select s.secret <> 'synthetic-refresh-token-v1'
   from vault.secrets as s
   join public.jarvis_bmw_cardata_credentials as c on c.vault_secret_id = s.id
   where c.user_id = '00000000-0000-4000-8000-000000000051'),
  'Vault stores encrypted secret material rather than plaintext token'
);
select is(
  (select refresh_token from public.jarvis_get_bmw_cardata_refresh_token('00000000-0000-4000-8000-000000000051')),
  'synthetic-refresh-token-v1',
  'backend RPC can retrieve the decrypted token'
);
select is(
  (select client_id from public.jarvis_get_bmw_cardata_refresh_token('00000000-0000-4000-8000-000000000051')),
  'bmw-client-test',
  'backend RPC returns the matching public client ID'
);
select is(
  public.jarvis_store_bmw_cardata_refresh_token(
    '00000000-0000-4000-8000-000000000051',
    'bmw-client-test',
    'synthetic-refresh-token-v2',
    now() + interval '14 days'
  ),
  true,
  'rotates the refresh token in the existing Vault secret'
);
select is(
  (select refresh_token from public.jarvis_get_bmw_cardata_refresh_token('00000000-0000-4000-8000-000000000051')),
  'synthetic-refresh-token-v2',
  'retrieval returns only the latest rotated refresh token'
);
select is(
  (select count(*)::int from vault.secrets
   where name = 'jarvis_bmw_cardata_refresh_00000000-0000-4000-8000-000000000051'),
  1,
  'token rotation does not create duplicate Vault secrets'
);
select is(
  (select count(*)::int from public.jarvis_get_bmw_cardata_refresh_token('00000000-0000-4000-8000-000000000052')),
  0,
  'user B cannot retrieve user A token by supplying a different owner ID'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000051', true);
select is(
  (select count(*)::int from public.jarvis_bmw_cardata_credentials),
  1,
  'user A sees only their connection metadata'
);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000052', true);
select is(
  (select count(*)::int from public.jarvis_bmw_cardata_credentials),
  0,
  'user B cannot see user A connection metadata'
);
select throws_ok(
  $sql$select * from public.jarvis_get_bmw_cardata_refresh_token('00000000-0000-4000-8000-000000000051')$sql$,
  '42501', null,
  'authenticated users cannot retrieve decrypted refresh tokens'
);
select throws_ok(
  $sql$select public.jarvis_store_bmw_cardata_refresh_token('00000000-0000-4000-8000-000000000052','client','synthetic-refresh-token-v3',now()+interval '14 days')$sql$,
  '42501', null,
  'authenticated users cannot write Vault credentials'
);
select throws_ok(
  $sql$update public.jarvis_bmw_cardata_credentials set client_id = 'attacker' where user_id = '00000000-0000-4000-8000-000000000051'$sql$,
  '42501', null,
  'authenticated users cannot change connection metadata directly'
);

reset role;
set local role service_role;
select is(
  public.jarvis_delete_bmw_cardata_credentials('00000000-0000-4000-8000-000000000051'),
  true,
  'backend disconnect deletes the Vault secret and owner mapping'
);
select is(
  (select count(*)::int from public.jarvis_bmw_cardata_credentials
   where user_id = '00000000-0000-4000-8000-000000000051'),
  0,
  'disconnect removes the connection metadata'
);
select is(
  (select count(*)::int from vault.secrets
   where name = 'jarvis_bmw_cardata_refresh_00000000-0000-4000-8000-000000000051'),
  0,
  'disconnect removes the encrypted Vault secret'
);
select is(
  (select count(*)::int from public.jarvis_get_bmw_cardata_refresh_token('00000000-0000-4000-8000-000000000051')),
  0,
  'disconnected credentials cannot be retrieved'
);

select * from finish();
rollback;
