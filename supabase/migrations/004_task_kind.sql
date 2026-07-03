-- Store the AI-extracted item kind on tasks.
--
-- Phase 2's deadline engine already receives kind (assignment | test | event)
-- from Haiku/Ask Clark but it was only used to pick the deadline rule and
-- then discarded. The calendar day view orders tests ahead of other items,
-- so persist it. Legacy rows stay null and fall back to the engine's
-- deterministic inferKind() in the client.
alter table tasks
  add column if not exists kind text check (kind in ('assignment', 'test', 'event'));
