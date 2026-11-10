-- Per-user opt-in switch for including approved personal memories
-- in model prompts. Defaults to disabled.
create table if not exists public.jarvis_memory_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  context_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.jarvis_memory_preferences enable row level security;

create policy "Users can read their own Jarvis memory preferences"
  on public.jarvis_memory_preferences for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can insert their own Jarvis memory preferences"
  on public.jarvis_memory_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own Jarvis memory preferences"
  on public.jarvis_memory_preferences for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

comment on table public.jarvis_memory_preferences is
  'Per-user opt-in switch controlling whether approved personal memories may be included in model prompts.';
