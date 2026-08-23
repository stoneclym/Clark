-- Club tasks can now carry a due date, resolved through the same deadline
-- engine used for the main tasks table, so club deadlines render with the
-- exact same date/time formatting logic (getTaskDateInfo).
alter table club_tasks
  add column if not exists due_date text,
  add column if not exists due_date_calc date,
  add column if not exists due_at timestamptz,
  add column if not exists original_due_text text;

create index if not exists club_tasks_due_at on club_tasks (due_at);
