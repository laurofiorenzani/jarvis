-- Keep the per-user provider preference lookup efficient at scale.
drop policy if exists "Users can read their own provider preferences"
  on public.jarvis_provider_preferences;

create policy "Users can read their own provider preferences"
  on public.jarvis_provider_preferences
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
