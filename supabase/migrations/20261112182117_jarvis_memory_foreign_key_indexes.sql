-- Cover the foreign-key lookups identified by Supabase's performance advisor.
-- These additive indexes are safe to roll back independently if ever needed.
create index if not exists jarvis_memory_facts_source_conversation_user_idx
  on public.jarvis_memory_facts (source_conversation_id, user_id);

create index if not exists jarvis_memory_facts_supersedes_idx
  on public.jarvis_memory_facts (supersedes_id);

create index if not exists jarvis_memory_facts_topic_id_idx
  on public.jarvis_memory_facts (topic_id);

create index if not exists jarvis_memory_summaries_supersedes_idx
  on public.jarvis_memory_summaries (supersedes_id);

create index if not exists jarvis_memory_summaries_conversation_user_idx
  on public.jarvis_memory_summaries (conversation_id, user_id);

create index if not exists jarvis_memory_topic_links_source_conversation_user_idx
  on public.jarvis_memory_topic_links (source_conversation_id, user_id);

create index if not exists jarvis_memory_topic_links_from_topic_id_idx
  on public.jarvis_memory_topic_links (from_topic_id);

create index if not exists jarvis_memory_topic_links_to_topic_id_idx
  on public.jarvis_memory_topic_links (to_topic_id);
