-- Clark — initial schema

-- App settings (single row for this single-user app)
create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  first_day date,
  first_day_type text check (first_day_type in ('A', 'B')),
  no_school_dates jsonb default '[]',
  a_schedule jsonb default '[]',
  b_schedule jsonb default '[]',
  cape_fear_classes jsonb default '[]',
  created_at timestamptz default now()
);

-- Tasks (from brain dump or manual entry via Ask Clark)
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  tag text,
  due_date text,
  due_date_calc date,
  priority boolean default false,
  priority_rank int,
  source text default 'Manual',
  done boolean default false,
  created_at timestamptz default now()
);

create index if not exists tasks_priority_rank on tasks (priority_rank);
create index if not exists tasks_done on tasks (done);

-- Grades
create table if not exists grades (
  id uuid primary key default gen_random_uuid(),
  class_name text not null,
  score text,
  percentage text,
  last_updated timestamptz,
  note text,
  is_placeholder boolean default false,
  class_order int default 99
);

-- Emails (forwarded from school Outlook via Gmail)
create table if not exists emails (
  id uuid primary key default gen_random_uuid(),
  from_name text not null,
  from_email text,
  initials text,
  received_at timestamptz default now(),
  subject text not null,
  snippet text,
  full_content text,
  headers_cleaned boolean default false,
  created_at timestamptz default now()
);

create index if not exists emails_received_at on emails (received_at desc);

-- Clubs
create table if not exists clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  next_meeting text,
  prominent boolean default false,
  display_order int default 99
);

create table if not exists club_tasks (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references clubs (id) on delete cascade,
  task_text text not null,
  done boolean default false,
  created_at timestamptz default now()
);

-- AI briefings
create table if not exists briefings (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  generated_at timestamptz default now()
);

-- WebAuthn credentials (for biometric unlock)
create table if not exists webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  credential_id text not null unique,
  public_key text,
  counter bigint default 0,
  created_at timestamptz default now()
);

-- ─── Seed data ───────────────────────────────────────────────

-- Grades (pre-populated from setup)
insert into grades (class_name, score, percentage, last_updated, note, is_placeholder, class_order)
values
  ('IB English: Lang & Lit',       '6', '92%',  now() - interval '2 days', 'Paper 1 returned — strong analysis', false, 1),
  ('History of the Americas',      '5', '87%',  now(),                      'Essay rubric feedback posted',       false, 2),
  ('Math: Analysis & Approaches',  '6', '90%',  now() - interval '4 days', null,                                 false, 3),
  ('Biology HL',                   '5', '85%',  now() - interval '1 day',  'IA draft due next class',            false, 4),
  ('Theory of Knowledge',          'A', null,   now() - interval '7 days', 'Exhibition on track',                false, 5),
  ('Cape Fear CC — Course I',      null, null,  null,                       'Add a grade via brain dump',         true,  6),
  ('Cape Fear CC — Course II',     null, null,  null,                       'Add a grade via brain dump',         true,  7)
on conflict do nothing;

-- Clubs
insert into clubs (name, role, next_meeting, prominent, display_order)
values
  ('National Honor Society', 'Communications Officer',     'Tue, Jul 1 · 7:45 AM · Library',      false, 1),
  ('Beta Club',              'Vice President',              'Thu, Jul 3 · 3:30 PM · Room 118',     false, 2),
  ('Spanish Club',           'Co-President',                'Tomorrow · 3:30 PM · Room 214',       true,  3),
  ('Senior Class',           'President · Student Council', 'Fri, Jun 27 · 12:10 PM · Commons',   true,  4)
on conflict do nothing;

-- Club tasks (seeded from design)
with nhs as (select id from clubs where name = 'National Honor Society' limit 1),
     beta as (select id from clubs where name = 'Beta Club' limit 1),
     spanish as (select id from clubs where name = 'Spanish Club' limit 1),
     senior as (select id from clubs where name = 'Senior Class' limit 1)
insert into club_tasks (club_id, task_text)
select nhs.id, unnest(array['Schedule blood-drive Instagram post','Draft October email announcement','Confirm flyer copy with adviser']) from nhs
union all
select beta.id, unnest(array['Plan fall service project','Confirm agenda with President','Review October service-hours form']) from beta
union all
select spanish.id, unnest(array['Finalize Día de los Muertos presentation','Email pre-meeting reminder to members']) from spanish
union all
select senior.id, unnest(array['Collect prom venue quotes','Senior sunrise planning','Confirm class-gift vote']) from senior
on conflict do nothing;

-- Sample tasks
insert into tasks (title, category, tag, due_date, priority, priority_rank, source)
values
  ('HOTA essay outline',                  'Class', 'HOTA',        'Today',      true,  1, 'Canvas'),
  ('NHS blood-drive flyer → Instagram',   'Club',  'NHS',         'Today',      true,  2, 'NHS'),
  ('UNC supplemental — revise draft',     'College','College',    'Fri',        true,  3, 'Manual'),
  ('Bio IA — data analysis section',      'Class', 'Biology HL',  'Next class', true,  4, 'Canvas'),
  ('Email Spanish Club meeting reminder', 'Club',  'Spanish Club','Tomorrow',   false, null, 'Spanish'),
  ('Read Pachinko ch. 7–9',              'Class', 'IB Lang',     'Mon',        false, null, 'Canvas'),
  ('Collect prom venue quotes',           'Club',  'Senior Class','Wed',        false, null, 'Manual'),
  ('Math AA — problem set 14',           'Class', 'Math AA',     'Next class', false, null, 'Canvas')
on conflict do nothing;

-- Sample emails
insert into emails (from_name, initials, received_at, subject, snippet, headers_cleaned)
values
  ('Ms. Reyes · IB Coordinator', 'R', now() - interval '2 hours',  'EE final submission — deadline moved',    'The Extended Essay final upload has moved to Monday. Please confirm your supervisor sign-off before then.', true),
  ('Beta Club Secretary',        'B', now() - interval '1 day',    'October service-hours form',               'Attaching the service-hours form for this month. VPs please review before the next meeting and flag discrepancies.', true),
  ('Counseling Office',          'C', now() - interval '3 days',   'Senior transcript request window open',    'Transcript requests for early-action applications are open in Naviance. Submit by Oct 20 to guarantee processing.', true)
on conflict do nothing;
