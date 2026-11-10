-- Avoid evaluating auth.uid() once per candidate row in personal-memory RLS.
-- This is behavior-preserving: every policy remains restricted to the caller.
drop policy if exists "Users can read their own Jarvis memories" on public.jarvis_memories;
create policy "Users can read their own Jarvis memories"
  on public.jarvis_memories for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can insert their own Jarvis memories" on public.jarvis_memories;
create policy "Users can insert their own Jarvis memories"
  on public.jarvis_memories for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can update their own Jarvis memories" on public.jarvis_memories;
create policy "Users can update their own Jarvis memories"
  on public.jarvis_memories for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can delete their own Jarvis memories" on public.jarvis_memories;
create policy "Users can delete their own Jarvis memories"
  on public.jarvis_memories for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can read their own Jarvis memory preferences" on public.jarvis_memory_preferences;
create policy "Users can read their own Jarvis memory preferences"
  on public.jarvis_memory_preferences for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can insert their own Jarvis memory preferences" on public.jarvis_memory_preferences;
create policy "Users can insert their own Jarvis memory preferences"
  on public.jarvis_memory_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can update their own Jarvis memory preferences" on public.jarvis_memory_preferences;
create policy "Users can update their own Jarvis memory preferences"
  on public.jarvis_memory_preferences for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
