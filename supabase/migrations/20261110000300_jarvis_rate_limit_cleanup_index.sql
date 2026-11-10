-- Keep the rate-limit cleanup inside jarvis_consume_rate_limit efficient.
-- The primary key starts with user_id, so it cannot efficiently serve the
-- global expiry predicate on window_start.
create index if not exists jarvis_rate_limits_window_start_idx
  on public.jarvis_rate_limits (window_start);
