alter table tasks
  add column if not exists due_at timestamptz,
  add column if not exists original_due_text text;

create index if not exists tasks_due_at on tasks (due_at);
