-- Microsoft To Do two-directional sync.
--
-- Schema: a dedicated "Clark" To Do list id + a delta-query cursor live on
-- settings (singleton row); each task row links to its Graph todoTask via
-- microsoft_todo_task_id once pushed.
alter table settings
  add column if not exists microsoft_todo_list_id text,
  add column if not exists microsoft_todo_delta_link text;

alter table tasks
  add column if not exists microsoft_todo_task_id text,
  add column if not exists microsoft_todo_synced_at timestamptz;

create index if not exists tasks_microsoft_todo_task_id on tasks (microsoft_todo_task_id);

-- Scheduled sync: pg_cron + pg_net call the sync-outlook / sync-todo edge
-- functions every 15 minutes so completions/edits made directly in
-- Microsoft To Do (or Outlook) flow back into Clark without the user
-- having to open the app and tap "Sync now".
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'sync-outlook-15min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://jjqsowebmfyuklehejtp.supabase.co/functions/v1/sync-outlook',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcXNvd2VibWZ5dWtsZWhlanRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MjkwNTEsImV4cCI6MjA5ODAwNTA1MX0.JViAjO8pWJu_URheSjQPj4gzewYBFuQCaciYOajePQU"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'sync-todo-15min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://jjqsowebmfyuklehejtp.supabase.co/functions/v1/sync-todo',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcXNvd2VibWZ5dWtsZWhlanRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MjkwNTEsImV4cCI6MjA5ODAwNTA1MX0.JViAjO8pWJu_URheSjQPj4gzewYBFuQCaciYOajePQU"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
