-- JARVIS cloud v1 hardening: index ownership FKs and avoid per-row auth.uid() evaluation.
create index if not exists jarvis_messages_conversation_user_created_idx
  on public.jarvis_messages (conversation_id, user_id, created_at asc);
create index if not exists jarvis_messages_user_id_idx
  on public.jarvis_messages (user_id);
create index if not exists jarvis_turns_conversation_user_created_idx
  on public.jarvis_turns (conversation_id, user_id, created_at desc);

drop policy if exists "Users manage only their conversations" on public.jarvis_conversations;
create policy "Users manage only their conversations"
  on public.jarvis_conversations for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users read only their messages" on public.jarvis_messages;
create policy "Users read only their messages"
  on public.jarvis_messages for select
  using (user_id = (select auth.uid()));

drop policy if exists "Users read only their turns" on public.jarvis_turns;
create policy "Users read only their turns" on public.jarvis_turns for select
  using (user_id = (select auth.uid()));