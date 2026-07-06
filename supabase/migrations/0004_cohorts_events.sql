-- Cohorts, Events, and audience targeting (all / cohort / custom list),
-- reused consistently across attendance_sessions, notifications, and the
-- new events table.

-- ---------------------------------------------------------------------------
-- cohorts
-- ---------------------------------------------------------------------------

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.cohorts enable row level security;

-- Cohort names aren't sensitive; any signed-in user can read the list
-- (needed for a student to know their own cohort, and for admin pickers).
create policy "cohorts_select_authenticated"
  on public.cohorts for select
  to authenticated
  using (true);

create policy "cohorts_admin_insert"
  on public.cohorts for insert
  with check (public.is_admin());

create policy "cohorts_admin_update"
  on public.cohorts for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "cohorts_admin_delete"
  on public.cohorts for delete
  using (public.is_admin());

alter table public.profiles add column cohort_id uuid references public.cohorts (id);
create index profiles_cohort_idx on public.profiles (cohort_id);

-- ---------------------------------------------------------------------------
-- attendance_sessions: audience targeting
-- ---------------------------------------------------------------------------

alter table public.attendance_sessions
  add column audience_type text not null default 'all' check (audience_type in ('all', 'cohort', 'custom')),
  add column cohort_id uuid references public.cohorts (id);

create table public.attendance_session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  unique (session_id, student_id)
);

create index attendance_session_participants_session_idx on public.attendance_session_participants (session_id);
create index attendance_session_participants_student_idx on public.attendance_session_participants (student_id);

alter table public.attendance_session_participants enable row level security;

create policy "attendance_session_participants_admin_all"
  on public.attendance_session_participants for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "attendance_session_participants_select_own"
  on public.attendance_session_participants for select
  using (student_id = auth.uid());

-- Replaces the plain "status = open" view with one that also respects
-- audience targeting, so a club-only session never appears to students
-- outside its roster.
drop view public.open_attendance_sessions;

create view public.open_attendance_sessions
with (security_invoker = false) as
select s.id, s.title, s.description, s.status, s.opened_at, s.closed_at, s.created_at
from public.attendance_sessions s
where s.status = 'open'
  and (
    s.audience_type = 'all'
    or (
      s.audience_type = 'cohort'
      and s.cohort_id = (select p.cohort_id from public.profiles p where p.id = auth.uid())
    )
    or (
      s.audience_type = 'custom'
      and exists (
        select 1 from public.attendance_session_participants sp
        where sp.session_id = s.id and sp.student_id = auth.uid()
      )
    )
  );

grant select on public.open_attendance_sessions to authenticated;

-- ---------------------------------------------------------------------------
-- notifications: cohort targeting
-- ---------------------------------------------------------------------------

-- Find and drop the existing audience check constraint by inspecting
-- pg_constraint rather than assuming Postgres's auto-generated name, so
-- this can't silently leave the old (stricter) constraint in place
-- alongside the new one.
do $$
declare
  existing_constraint text;
begin
  select conname into existing_constraint
  from pg_constraint
  where conrelid = 'public.notifications'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%audience%';

  if existing_constraint is not null then
    execute format('alter table public.notifications drop constraint %I', existing_constraint);
  end if;
end $$;

alter table public.notifications add constraint notifications_audience_check
  check (audience in ('all', 'cohort', 'selected'));
alter table public.notifications add column cohort_id uuid references public.cohorts (id);

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  category text,
  event_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled')),
  audience_type text not null default 'all' check (audience_type in ('all', 'cohort', 'custom')),
  cohort_id uuid references public.cohorts (id),
  attendance_session_id uuid references public.attendance_sessions (id),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_status_idx on public.events (status);
create index events_event_at_idx on public.events (event_at);

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;

create policy "events_admin_all"
  on public.events for all
  using (public.is_admin())
  with check (public.is_admin());

create table public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  unique (event_id, student_id)
);

create index event_participants_event_idx on public.event_participants (event_id);
create index event_participants_student_idx on public.event_participants (student_id);

alter table public.event_participants enable row level security;

create policy "event_participants_admin_all"
  on public.event_participants for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "event_participants_select_own"
  on public.event_participants for select
  using (student_id = auth.uid());

create view public.published_events
with (security_invoker = false) as
select e.id, e.title, e.description, e.location, e.category, e.event_at,
       e.attendance_session_id, e.created_at
from public.events e
where e.status = 'published'
  and (
    e.audience_type = 'all'
    or (
      e.audience_type = 'cohort'
      and e.cohort_id = (select p.cohort_id from public.profiles p where p.id = auth.uid())
    )
    or (
      e.audience_type = 'custom'
      and exists (
        select 1 from public.event_participants ep
        where ep.event_id = e.id and ep.student_id = auth.uid()
      )
    )
  );

grant select on public.published_events to authenticated;
