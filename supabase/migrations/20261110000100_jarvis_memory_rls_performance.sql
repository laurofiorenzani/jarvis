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

-- Direct clients may read their own memory rows, but all writes must pass
-- through the authenticated Cloud API approval flow (service_role only).
revoke all privileges on table public.jarvis_memories from anon, authenticated;
revoke all privileges on table public.jarvis_memory_preferences from anon, authenticated;
grant select on table public.jarvis_memories to authenticated;
grant select on table public.jarvis_memory_preferences to authenticated;

-- Rate-limit buckets are internal API state, never directly exposed to clients.
revoke all privileges on table public.jarvis_rate_limits from public, anon, authenticated;

-- Only SELECT is available to authenticated clients. Memory writes and
-- preference changes are performed by the authenticated Edge API after
-- application-level validation and approval; service_role bypasses RLS.
drop policy if exists "Users can insert their own Jarvis memories" on public.jarvis_memories;
drop policy if exists "Users can update their own Jarvis memories" on public.jarvis_memories;
drop policy if exists "Users can delete their own Jarvis memories" on public.jarvis_memories;
drop policy if exists "Users can insert their own Jarvis memory preferences" on public.jarvis_memory_preferences;
drop policy if exists "Users can update their own Jarvis memory preferences" on public.jarvis_memory_preferences;
