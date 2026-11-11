begin;

select plan(6);

-- Isolated fixtures: two users, two conversations, and one message per user.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'memory-test-a@example.invalid', '', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'memory-test-b@example.invalid', '', now(), now(), now());

insert into public.jarvis_conversations (id, user_id)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002');

insert into public.jarvis_messages (id, conversation_id, user_id, role, content)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'user', 'User A source'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'user', 'User B source');

insert into public.jarvis_memory_topics (id, user_id, canonical_name, topic_type)
values
  ('30000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Topic A', 'project'),
  ('30000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'Topic B', 'project');

select lives_ok(
  $$insert into public.jarvis_memory_summaries (user_id, conversation_id, summary, source_message_ids)
    values ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Valid summary', array['20000000-0000-4000-8000-000000000001'::uuid])$$,
  'summary accepts provenance from its own conversation'
);

select throws_ok(
  $$insert into public.jarvis_memory_summaries (user_id, conversation_id, summary, source_message_ids)
    values ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Cross-user summary', array['20000000-0000-4000-8000-000000000002'::uuid])$$,
  '23514',
  'memory summary message provenance ownership mismatch',
  'summary rejects a message from another user'
);

select lives_ok(
  $$insert into public.jarvis_memory_facts (user_id, topic_id, fact_type, content, source_conversation_id, source_message_ids)
    values ('00000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'fact', 'Valid fact', '10000000-0000-4000-8000-000000000001', array['20000000-0000-4000-8000-000000000001'::uuid])$$,
  'fact accepts same-user topic and message provenance'
);

select throws_ok(
  $$insert into public.jarvis_memory_facts (user_id, topic_id, fact_type, content, source_conversation_id, source_message_ids)
    values ('00000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'fact', 'Cross-user fact', '10000000-0000-4000-8000-000000000001', array['20000000-0000-4000-8000-000000000002'::uuid])$$,
  '23514',
  'memory fact message provenance ownership mismatch',
  'fact rejects a message from another user'
);

select throws_ok(
  $$insert into public.jarvis_memory_facts (user_id, fact_type, content, source_message_ids)
    values ('00000000-0000-4000-8000-000000000001', 'fact', 'Missing conversation', array['20000000-0000-4000-8000-000000000001'::uuid])$$,
  '23514',
  null,
  'fact cannot carry message provenance without a source conversation'
);

select throws_ok(
  $$insert into public.jarvis_memory_facts (user_id, topic_id, fact_type, content)
    values ('00000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'fact', 'Foreign topic')$$,
  '23514',
  'memory topic ownership mismatch',
  'fact rejects a topic owned by another user'
);

select * from finish();
rollback;
