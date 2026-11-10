-- Personal memory records. Inserts are explicit user-approved actions;
-- chat turns never populate this table automatically.
create table if not exists public.jarvis_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('preference', 'project', 'workflow', 'fact')),
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint jarvis_memories_expiry_after_creation
    check (expires_at is null or expires_at > created_at)
);

create index if not exists jarvis_memories_user_created_idx
  on public.jarvis_memories (user_id, created_at desc);

alter table public.jarvis_memories enable row level security;

create policy "Users can read their own Jarvis memories"
  on public.jarvis_memories for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can insert their own Jarvis memories"
  on public.jarvis_memories for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own Jarvis memories"
  on public.jarvis_memories for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own Jarvis memories"
  on public.jarvis_memories for delete to authenticated
  using (user_id = (select auth.uid()));

comment on table public.jarvis_memories is
  'Explicitly user-approved personal memory records. Never populated automatically from chat.';
