-- Automatic capture is a separate per-account opt-in from memory retrieval.
-- Default false keeps every existing account unchanged until its owner enables it.
alter table public.jarvis_memory_preferences
  add column if not exists auto_capture_enabled boolean not null default false;
