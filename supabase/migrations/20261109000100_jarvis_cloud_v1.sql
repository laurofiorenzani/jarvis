-- JARVIS cloud v1: durable, user-scoped conversation storage.
-- Apply through Supabase migrations after creating a project. No data is migrated.
create extension if not exists pgcrypto;

create table if not exists public.jarvis_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation' check (char_length(title) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, user_id)
);

create index if not exists jarvis_conversations_user_updated_idx
  on public.jarvis_conversations (user_id, updated_at desc)
  where archived_at is null;

create table if not exists public.jarvis_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 100000),
  created_at timestamptz not null default now(),
  foreign key (conversation_id, user_id)
    references public.jarvis_conversations(id, user_id) on delete cascade
);

create index if not exists jarvis_messages_conversation_created_idx
  on public.jarvis_messages (conversation_id, created_at asc);

create table if not exists public.jarvis_turns (
  id uuid primary key,
  conversation_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('accepted', 'running', 'completed', 'failed', 'cancelled')),
  request_text text not null check (char_length(request_text) <= 100000),
  response_text text,
  error_code text,
  cancel_requested_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, id),
  foreign key (conversation_id, user_id)
    references public.jarvis_conversations(id, user_id) on delete cascade
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


-- Server-only fixed-window rate limiter. The Edge Function calls the RPC with
-- its service-role client; end-user JWTs cannot inspect or mutate this table.
create table if not exists public.jarvis_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  request_count integer not null check (request_count >= 1),
  primary key (user_id, bucket, window_start)
);

alter table public.jarvis_rate_limits enable row level security;

create or replace function public.jarvis_consume_rate_limit(
  p_user_id uuid,
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  if p_user_id is null or p_bucket is null or length(p_bucket) > 80
     or p_limit < 1 or p_window_seconds < 1 then
    return false;
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into public.jarvis_rate_limits (user_id, bucket, window_start, request_count)
  values (p_user_id, p_bucket, v_window_start, 1)
  on conflict (user_id, bucket, window_start)
  do update set request_count = public.jarvis_rate_limits.request_count + 1
    where public.jarvis_rate_limits.request_count < p_limit
  returning request_count into v_count;

  return v_count is not null;
end;
$$;

revoke all on public.jarvis_rate_limits from anon, authenticated;
revoke all on function public.jarvis_consume_rate_limit(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.jarvis_consume_rate_limit(uuid, text, integer, integer) to service_role;
