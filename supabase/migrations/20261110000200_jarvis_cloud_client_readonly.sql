-- Restrict direct client access to read-only cloud conversation data.
-- All conversation/message/turn mutations must pass through the authenticated
-- Edge API using the service-role client. RLS remains an additional user boundary.
revoke all privileges on table public.jarvis_conversations from public, anon, authenticated;
revoke all privileges on table public.jarvis_messages from public, anon, authenticated;
revoke all privileges on table public.jarvis_turns from public, anon, authenticated;

grant select on table public.jarvis_conversations to authenticated;
grant select on table public.jarvis_messages to authenticated;
grant select on table public.jarvis_turns to authenticated;

-- Keep internal rate-limit state inaccessible to every client role.
revoke all privileges on table public.jarvis_rate_limits from public, anon, authenticated;
