-- Semantic memory v1 foundation.
-- Conversation history remains the source of truth; these tables store derived,
-- provenance-backed records. No vector extension or paid provider is required.

create table if not exists public.jarvis_memory_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null,
  summary text not null check (char_length(summary) between 1 and 12000),
  covered_from timestamptz,
  covered_through timestamptz,
  source_message_ids uuid[] not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'superseded', 'rejected')),
  version integer not null default 1 check (version > 0),
  supersedes_id uuid references public.jarvis_memory_summaries(id) on delete set null,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  constraint jarvis_memory_summary_conversation_owner
    foreign key (conversation_id, user_id)
    references public.jarvis_conversations(id, user_id) on delete cascade,
  constraint jarvis_memory_summary_range_valid
    check (covered_from is null or covered_through is null or covered_through >= covered_from),
  constraint jarvis_memory_summary_approval_valid
    check ((status = 'approved' and approved_at is not null) or status <> 'approved')
);

create index if not exists jarvis_memory_summaries_user_conversation_idx
  on public.jarvis_memory_summaries (user_id, conversation_id, version desc);
create index if not exists jarvis_memory_summaries_user_status_idx
  on public.jarvis_memory_summaries (user_id, status, created_at desc);

create table if not exists public.jarvis_memory_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canonical_name text not null check (char_length(canonical_name) between 1 and 160),
  topic_type text not null
    check (topic_type in ('project', 'person', 'service', 'device', 'domain', 'workflow', 'other')),
  description text check (description is null or char_length(description) <= 2000),
  aliases text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, topic_type, canonical_name)
);

create index if not exists jarvis_memory_topics_user_type_idx
  on public.jarvis_memory_topics (user_id, topic_type, canonical_name);

create table if not exists public.jarvis_memory_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid references public.jarvis_memory_topics(id) on delete set null,
  fact_type text not null
    check (fact_type in ('preference', 'fact', 'decision', 'goal', 'workflow', 'constraint')),
  content text not null check (char_length(content) between 1 and 4000),
  source_conversation_id uuid,
  source_message_ids uuid[] not null default '{}',
  confidence numeric(4,3) not null default 0.500
    check (confidence >= 0 and confidence <= 1),
  sensitivity text not null default 'normal'
    check (sensitivity in ('normal', 'sensitive', 'restricted')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'superseded', 'rejected')),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  supersedes_id uuid references public.jarvis_memory_facts(id) on delete set null,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  constraint jarvis_memory_fact_conversation_owner
    foreign key (source_conversation_id, user_id)
    references public.jarvis_conversations(id, user_id) on delete cascade,
  constraint jarvis_memory_fact_source_messages_require_conversation
    check (cardinality(source_message_ids) = 0 or source_conversation_id is not null),
  constraint jarvis_memory_fact_validity
    check (valid_until is null or valid_until > valid_from),
  constraint jarvis_memory_fact_approval_valid
    check ((status = 'approved' and approved_at is not null) or status <> 'approved')
);

create index if not exists jarvis_memory_facts_user_status_idx
  on public.jarvis_memory_facts (user_id, status, valid_until, created_at desc);
create index if not exists jarvis_memory_facts_user_topic_idx
  on public.jarvis_memory_facts (user_id, topic_id, status);
create index if not exists jarvis_memory_facts_search_idx
  on public.jarvis_memory_facts using gin (to_tsvector('simple', content));

create table if not exists public.jarvis_memory_topic_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_topic_id uuid not null references public.jarvis_memory_topics(id) on delete cascade,
  to_topic_id uuid not null references public.jarvis_memory_topics(id) on delete cascade,
  relationship_type text not null
    check (relationship_type in ('related_to', 'part_of', 'depends_on', 'supersedes', 'belongs_to')),
  source_conversation_id uuid,
  created_at timestamptz not null default now(),
  constraint jarvis_memory_topic_link_not_self check (from_topic_id <> to_topic_id),
  constraint jarvis_memory_topic_link_conversation_owner
    foreign key (source_conversation_id, user_id)
    references public.jarvis_conversations(id, user_id) on delete cascade,
  unique (user_id, from_topic_id, to_topic_id, relationship_type)
);

create index if not exists jarvis_memory_topic_links_user_from_idx
  on public.jarvis_memory_topic_links (user_id, from_topic_id);
create index if not exists jarvis_memory_topic_links_user_to_idx
  on public.jarvis_memory_topic_links (user_id, to_topic_id);

-- Verify message-level provenance, not just conversation ownership. A UUID
-- copied from another user's conversation must never become a valid source.
create or replace function public.jarvis_memory_assert_summary_message_owners()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1
    from unnest(new.source_message_ids) as ids(message_id)
    where not exists (
      select 1 from public.jarvis_messages m
      where m.id = ids.message_id
        and m.user_id = new.user_id
        and m.conversation_id = new.conversation_id
    )
  ) then
    raise exception 'memory summary message provenance ownership mismatch' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists jarvis_memory_summary_message_owners on public.jarvis_memory_summaries;
create trigger jarvis_memory_summary_message_owners
before insert or update of source_message_ids, conversation_id, user_id on public.jarvis_memory_summaries
for each row execute function public.jarvis_memory_assert_summary_message_owners();

create or replace function public.jarvis_memory_assert_fact_message_owners()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1
    from unnest(new.source_message_ids) as ids(message_id)
    where not exists (
      select 1 from public.jarvis_messages m
      where m.id = ids.message_id
        and m.user_id = new.user_id
        and m.conversation_id = new.source_conversation_id
    )
  ) then
    raise exception 'memory fact message provenance ownership mismatch' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists jarvis_memory_fact_message_owners on public.jarvis_memory_facts;
create trigger jarvis_memory_fact_message_owners
before insert or update of source_message_ids, source_conversation_id, user_id on public.jarvis_memory_facts
for each row execute function public.jarvis_memory_assert_fact_message_owners();

-- Enforce that linked rows belong to the same user, not merely that the caller
-- owns the outer row. These triggers protect against cross-user references.
create or replace function public.jarvis_memory_assert_topic_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.topic_id is not null and not exists (
    select 1 from public.jarvis_memory_topics t
    where t.id = new.topic_id and t.user_id = new.user_id
  ) then
    raise exception 'memory topic ownership mismatch' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists jarvis_memory_fact_topic_owner on public.jarvis_memory_facts;
create trigger jarvis_memory_fact_topic_owner
before insert or update of topic_id, user_id on public.jarvis_memory_facts
for each row execute function public.jarvis_memory_assert_topic_owner();

create or replace function public.jarvis_memory_assert_fact_supersession_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.supersedes_id is not null and not exists (
    select 1 from public.jarvis_memory_facts f
    where f.id = new.supersedes_id and f.user_id = new.user_id
  ) then
    raise exception 'memory fact supersession ownership mismatch' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists jarvis_memory_fact_supersession_owner on public.jarvis_memory_facts;
create trigger jarvis_memory_fact_supersession_owner
before insert or update of supersedes_id, user_id on public.jarvis_memory_facts
for each row execute function public.jarvis_memory_assert_fact_supersession_owner();

create or replace function public.jarvis_memory_assert_summary_supersession_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.supersedes_id is not null and not exists (
    select 1 from public.jarvis_memory_summaries s
    where s.id = new.supersedes_id and s.user_id = new.user_id
  ) then
    raise exception 'memory summary supersession ownership mismatch' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists jarvis_memory_summary_supersession_owner on public.jarvis_memory_summaries;
create trigger jarvis_memory_summary_supersession_owner
before insert or update of supersedes_id, user_id on public.jarvis_memory_summaries
for each row execute function public.jarvis_memory_assert_summary_supersession_owner();

create or replace function public.jarvis_memory_assert_link_owners()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.jarvis_memory_topics t
    where t.id = new.from_topic_id and t.user_id = new.user_id
  ) or not exists (
    select 1 from public.jarvis_memory_topics t
    where t.id = new.to_topic_id and t.user_id = new.user_id
  ) then
    raise exception 'memory topic link ownership mismatch' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists jarvis_memory_topic_link_owners on public.jarvis_memory_topic_links;
create trigger jarvis_memory_topic_link_owners
before insert or update of from_topic_id, to_topic_id, user_id on public.jarvis_memory_topic_links
for each row execute function public.jarvis_memory_assert_link_owners();

alter table public.jarvis_memory_summaries enable row level security;
alter table public.jarvis_memory_topics enable row level security;
alter table public.jarvis_memory_facts enable row level security;
alter table public.jarvis_memory_topic_links enable row level security;

drop policy if exists "Users manage their own Jarvis memory summaries" on public.jarvis_memory_summaries;
drop policy if exists "Users can read their own Jarvis memory summaries" on public.jarvis_memory_summaries;
create policy "Users can read their own Jarvis memory summaries"
  on public.jarvis_memory_summaries for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users manage their own Jarvis memory topics" on public.jarvis_memory_topics;
drop policy if exists "Users can read their own Jarvis memory topics" on public.jarvis_memory_topics;
create policy "Users can read their own Jarvis memory topics"
  on public.jarvis_memory_topics for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users manage their own Jarvis memory facts" on public.jarvis_memory_facts;
drop policy if exists "Users can read their own Jarvis memory facts" on public.jarvis_memory_facts;
create policy "Users can read their own Jarvis memory facts"
  on public.jarvis_memory_facts for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users manage their own Jarvis memory topic links" on public.jarvis_memory_topic_links;
drop policy if exists "Users can read their own Jarvis memory topic links" on public.jarvis_memory_topic_links;
create policy "Users can read their own Jarvis memory topic links"
  on public.jarvis_memory_topic_links for select to authenticated
  using (user_id = (select auth.uid()));

-- Clients may read their own rows through RLS, but all writes must go
-- through the authenticated Edge Function using the service role.
revoke all privileges on table public.jarvis_memory_summaries from public, anon, authenticated;
revoke all privileges on table public.jarvis_memory_topics from public, anon, authenticated;
revoke all privileges on table public.jarvis_memory_facts from public, anon, authenticated;
revoke all privileges on table public.jarvis_memory_topic_links from public, anon, authenticated;
grant select on table public.jarvis_memory_summaries to authenticated;
grant select on table public.jarvis_memory_topics to authenticated;
grant select on table public.jarvis_memory_facts to authenticated;
grant select on table public.jarvis_memory_topic_links to authenticated;

comment on table public.jarvis_memory_summaries is
  'Versioned, provenance-backed conversation summaries. Pending until explicitly approved.';
comment on table public.jarvis_memory_topics is
  'User-scoped canonical topics and entities for cross-conversation organization.';
comment on table public.jarvis_memory_facts is
  'Atomic user-scoped facts and decisions with provenance, confidence and lifecycle.';
comment on table public.jarvis_memory_topic_links is
  'Typed, user-scoped relationships between topics.';
