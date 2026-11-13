-- Per-account AI provider consent and pool selection.
-- The Edge Function service role is the only writer. Clients may read only
-- their own preference row; no provider keys or provider configuration live here.
create table if not exists public.jarvis_provider_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  zdr_pool_enabled boolean not null default false,
  standard_pool_enabled boolean not null default false,
  policy_version text,
  accepted_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint jarvis_provider_preferences_consent_check check (
    (not zdr_pool_enabled and not standard_pool_enabled)
    or (policy_version is not null and accepted_at is not null)
  )
);

alter table public.jarvis_provider_preferences enable row level security;

drop policy if exists "Users can read their own provider preferences"
  on public.jarvis_provider_preferences;

create policy "Users can read their own provider preferences"
  on public.jarvis_provider_preferences
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.jarvis_provider_preferences from anon, authenticated;
grant select on table public.jarvis_provider_preferences to authenticated;
