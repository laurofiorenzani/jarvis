-- JARVIS cloud v1: durable, user-scoped conversation storage.
-- Apply through Supabase migrations after creating a project. No data is migrated.
create extension if not exists pgcrypto;

create table if not exists public.jarvis_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation' check (char_length(title) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists jarvis_conversations_user_updated_idx
  on public.jarvis_conversations (user_id, updated_at desc)
  where archived_at is null;

create table if not exists public.jarvis_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.jarvis_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 100000),
  created_at timestamptz not null default now()
);

create index if not exists jarvis_messages_conversation_created_idx
  on public.jarvis_messages (conversation_id, created_at asc);

create table if not exists public.jarvis_turns (
  id uuid primary key,
  conversation_id uuid not null references public.jarvis_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('accepted', 'running', 'completed', 'failed', 'cancelled')),
  request_text text not null check (char_length(request_text) <= 100000),
  response_text text,
  error_code text,
  cancel_requested_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, id)
);

create index if not exists jarvis_turns_conversation_created_idx
  on public.jarvis_turns (conversation_id, created_at desc);

alter table public.jarvis_conversations enable row level security;
alter table public.jarvis_messages enable row level security;
alter table public.jarvis_turns enable row level security;

create policy "Users manage only their conversations"
  on public.jarvis_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users read only their messages"
  on public.jarvis_messages for select
  using (auth.uid() = user_id);

create policy "Users read only their turns"
  on public.jarvis_turns for select
  using (auth.uid() = user_id);

-- Writes are performed only by the Edge Function using its server-side
-- service-role client after validating the caller's JWT. No client write policy
-- is intentionally provided for messages or turns.
