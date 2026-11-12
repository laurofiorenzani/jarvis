-- Make the semantic-memory client surface explicitly read-only.
-- All mutations must pass through the authenticated Edge Function.
revoke all privileges on table public.jarvis_memory_summaries from public, anon, authenticated;
revoke all privileges on table public.jarvis_memory_topics from public, anon, authenticated;
revoke all privileges on table public.jarvis_memory_facts from public, anon, authenticated;
revoke all privileges on table public.jarvis_memory_topic_links from public, anon, authenticated;

grant select on table public.jarvis_memory_summaries to authenticated;
grant select on table public.jarvis_memory_topics to authenticated;
grant select on table public.jarvis_memory_facts to authenticated;
grant select on table public.jarvis_memory_topic_links to authenticated;
