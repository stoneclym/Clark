-- Archive for deleted/completed club meetings.
--
-- Clubs keep a single `next_meeting` text field that gets overwritten each
-- time Brain Dump or Ask Clark routes a new meeting announcement to a club
-- (see parse-brain-dump and ask-clark). There's no history table for
-- meetings the way club_tasks has a `done` flag, so deleting the currently
-- shown meeting from a club card needs somewhere to archive it. This table
-- snapshots the club name and meeting text at the time of deletion, then
-- clubs.next_meeting is cleared.
create table if not exists completed_meetings (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references clubs (id) on delete set null,
  club_name text not null,
  when_text text not null,
  completed_at timestamptz default now()
);

create index if not exists completed_meetings_completed_at on completed_meetings (completed_at desc);
