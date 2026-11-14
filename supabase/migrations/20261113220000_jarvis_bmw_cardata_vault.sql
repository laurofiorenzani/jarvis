-- BMW CarData refresh-token storage using Supabase Vault.
-- No token is stored in application tables; only the Vault secret UUID and metadata are stored.

create extension if not exists supabase_vault with schema vault;

create table if not exists public.jarvis_bmw_cardata_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  vault_secret_id uuid not null unique references vault.secrets(id) on delete cascade,
  client_id text not null check (length(btrim(client_id)) between 1 and 200),
  refresh_expires_at timestamptz not null,
  last_authorized_at timestamptz not null default pg_catalog.now(),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint jarvis_bmw_cardata_refresh_expiry_check
    check (refresh_expires_at > last_authorized_at and refresh_expires_at <= last_authorized_at + interval '30 days')
);

alter table public.jarvis_bmw_cardata_credentials enable row level security;
drop policy if exists "Users can read their own BMW CarData connection metadata"
  on public.jarvis_bmw_cardata_credentials;
create policy "Users can read their own BMW CarData connection metadata"
  on public.jarvis_bmw_cardata_credentials for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.jarvis_bmw_cardata_credentials from public, anon, authenticated, service_role;
grant select on table public.jarvis_bmw_cardata_credentials to authenticated;
grant select, insert, update, delete on table public.jarvis_bmw_cardata_credentials to service_role;

create or replace function public.jarvis_store_bmw_cardata_refresh_token(
  p_user_id uuid,
  p_client_id text,
  p_refresh_token text,
  p_refresh_expires_at timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_secret_id uuid;
  v_secret_name text;
  v_description text;
begin
  if p_user_id is null
    or p_client_id is null or length(btrim(p_client_id)) not between 1 and 200
    or p_refresh_token is null or length(p_refresh_token) not between 16 and 8192
    or p_refresh_expires_at is null
    or p_refresh_expires_at <= pg_catalog.now()
    or p_refresh_expires_at > pg_catalog.now() + interval '30 days' then
    raise exception 'invalid BMW CarData credential envelope' using errcode = '22023';
  end if;

  v_secret_name := 'jarvis_bmw_cardata_refresh_' || p_user_id::text;
  v_description := 'JARVIS BMW CarData refresh token; user-scoped; do not expose';

  select c.vault_secret_id into v_secret_id
  from public.jarvis_bmw_cardata_credentials as c
  where c.user_id = p_user_id
  for update;

  if found then
    perform vault.update_secret(v_secret_id, p_refresh_token, v_secret_name, v_description, null);
    update public.jarvis_bmw_cardata_credentials as c
    set client_id = p_client_id,
        refresh_expires_at = p_refresh_expires_at,
        last_authorized_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    where c.user_id = p_user_id;
  else
    v_secret_id := vault.create_secret(p_refresh_token, v_secret_name, v_description, null);
    insert into public.jarvis_bmw_cardata_credentials (
      user_id, vault_secret_id, client_id, refresh_expires_at
    ) values (
      p_user_id, v_secret_id, p_client_id, p_refresh_expires_at
    );
  end if;

  return true;
end;
$function$;

create or replace function public.jarvis_get_bmw_cardata_refresh_token(p_user_id uuid)
returns table (client_id text, refresh_token text, refresh_expires_at timestamptz)
language sql
security invoker
set search_path = ''
as $function$
  select c.client_id, d.decrypted_secret, c.refresh_expires_at
  from public.jarvis_bmw_cardata_credentials as c
  join vault.decrypted_secrets as d on d.id = c.vault_secret_id
  where c.user_id = p_user_id
    and c.refresh_expires_at > pg_catalog.now()
  limit 1
$function$;

create or replace function public.jarvis_delete_bmw_cardata_credentials(p_user_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  delete from vault.secrets as s
  using public.jarvis_bmw_cardata_credentials as c
  where c.user_id = p_user_id and s.id = c.vault_secret_id;
  return found;
end;
$function$;

revoke all on function public.jarvis_store_bmw_cardata_refresh_token(uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.jarvis_get_bmw_cardata_refresh_token(uuid) from public, anon, authenticated;
revoke all on function public.jarvis_delete_bmw_cardata_credentials(uuid) from public, anon, authenticated;

grant execute on function public.jarvis_store_bmw_cardata_refresh_token(uuid, text, text, timestamptz) to service_role;
grant execute on function public.jarvis_get_bmw_cardata_refresh_token(uuid) to service_role;
grant execute on function public.jarvis_delete_bmw_cardata_credentials(uuid) to service_role;

-- Pending device authorization stays server-side in Vault and is consumed atomically once.
-- The browser receives only an opaque state UUID plus BMW's user-facing code/URL.
create table if not exists public.jarvis_bmw_cardata_pending_auth (
  state_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  vault_secret_id uuid not null unique references vault.secrets(id) on delete cascade,
  client_id text not null check (length(btrim(client_id)) between 1 and 200),
  expires_at timestamptz not null,
  created_at timestamptz not null default pg_catalog.now(),
  check (expires_at > created_at and expires_at <= created_at + interval '15 minutes')
);

create index if not exists jarvis_bmw_cardata_pending_auth_expiry_idx
  on public.jarvis_bmw_cardata_pending_auth (expires_at);

alter table public.jarvis_bmw_cardata_pending_auth enable row level security;
revoke all on table public.jarvis_bmw_cardata_pending_auth from public, anon, authenticated, service_role;
grant select, insert, delete on table public.jarvis_bmw_cardata_pending_auth to service_role;

create or replace function public.jarvis_create_bmw_cardata_pending_auth(
  p_state_id uuid, p_user_id uuid, p_client_id text, p_device_code text,
  p_code_verifier text, p_expires_at timestamptz
) returns boolean
language plpgsql security invoker set search_path = ''
as $function$
declare
  v_secret_id uuid;
  v_secret_name text;
  v_payload text;
  v_expired record;
begin
  if p_state_id is null or p_user_id is null
    or p_client_id is null or length(btrim(p_client_id)) not between 1 and 200
    or p_device_code is null or length(p_device_code) not between 8 and 2048
    or p_code_verifier is null or length(p_code_verifier) not between 40 and 128
    or p_expires_at is null or p_expires_at <= pg_catalog.now()
    or p_expires_at > pg_catalog.now() + interval '15 minutes' then
    raise exception 'invalid BMW pending authorization envelope' using errcode = '22023';
  end if;

  -- Remove expired pending states and their Vault secrets when a new flow starts.
  for v_expired in
    select pending.state_id, pending.vault_secret_id
    from public.jarvis_bmw_cardata_pending_auth as pending
    where pending.expires_at <= pg_catalog.now()
    for update
  loop
    delete from public.jarvis_bmw_cardata_pending_auth as pending where pending.state_id = v_expired.state_id;
    delete from vault.secrets as secret where secret.id = v_expired.vault_secret_id;
  end loop;

  v_secret_name := 'jarvis_bmw_cardata_pending_' || p_state_id::text;
  v_payload := pg_catalog.jsonb_build_object(
    'device_code', p_device_code,
    'code_verifier', p_code_verifier
  )::text;
  v_secret_id := vault.create_secret(
    v_payload, v_secret_name,
    'JARVIS BMW CarData short-lived pending device authorization; user-scoped; do not expose',
    null
  );
  insert into public.jarvis_bmw_cardata_pending_auth
    (state_id, user_id, vault_secret_id, client_id, expires_at)
  values
    (p_state_id, p_user_id, v_secret_id, p_client_id, p_expires_at);
  return true;
end;
$function$;

create or replace function public.jarvis_consume_bmw_cardata_pending_auth(
  p_state_id uuid, p_user_id uuid
) returns table (client_id text, device_code text, code_verifier text, expires_at timestamptz)
language plpgsql security invoker set search_path = ''
as $function$
declare
  v_client_id text;
  v_secret_id uuid;
  v_secret text;
  v_payload jsonb;
  v_expires_at timestamptz;
begin
  if p_state_id is null or p_user_id is null then
    raise exception 'invalid BMW pending authorization identity' using errcode = '22023';
  end if;

  select pending.client_id, pending.vault_secret_id, decrypted.decrypted_secret, pending.expires_at
    into v_client_id, v_secret_id, v_secret, v_expires_at
  from public.jarvis_bmw_cardata_pending_auth as pending
  join vault.decrypted_secrets as decrypted on decrypted.id = pending.vault_secret_id
  where pending.state_id = p_state_id
    and pending.user_id = p_user_id
  for update of pending;

  if not found then return; end if;

  if v_expires_at <= pg_catalog.now() then
    delete from public.jarvis_bmw_cardata_pending_auth as pending where pending.state_id = p_state_id;
    delete from vault.secrets as secret where secret.id = v_secret_id;
    return;
  end if;

  begin
    v_payload := v_secret::jsonb;
  exception when others then
    raise exception 'invalid BMW pending authorization secret' using errcode = '22000';
  end;

  if pg_catalog.jsonb_typeof(v_payload) is distinct from 'object'
    or pg_catalog.jsonb_typeof(v_payload->'device_code') is distinct from 'string'
    or pg_catalog.length(v_payload->>'device_code') not between 8 and 2048
    or pg_catalog.jsonb_typeof(v_payload->'code_verifier') is distinct from 'string'
    or pg_catalog.length(v_payload->>'code_verifier') not between 40 and 128 then
    raise exception 'invalid BMW pending authorization secret' using errcode = '22000';
  end if;

  delete from public.jarvis_bmw_cardata_pending_auth as pending
  where pending.state_id = p_state_id and pending.user_id = p_user_id;
  delete from vault.secrets as secret where secret.id = v_secret_id;

  return query select
    v_client_id,
    v_payload->>'device_code',
    v_payload->>'code_verifier',
    v_expires_at;
end;
$function$;

revoke all on function public.jarvis_create_bmw_cardata_pending_auth(uuid, uuid, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.jarvis_consume_bmw_cardata_pending_auth(uuid, uuid) from public, anon, authenticated;
grant execute on function public.jarvis_create_bmw_cardata_pending_auth(uuid, uuid, text, text, text, timestamptz) to service_role;
grant execute on function public.jarvis_consume_bmw_cardata_pending_auth(uuid, uuid) to service_role;
