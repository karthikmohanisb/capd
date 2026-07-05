-- CAPD initial schema
-- Design notes:
--  * profiles.id mirrors auth.users.id — Supabase Auth handles password/PIN
--    hashing and session issuance, we never store credentials ourselves.
--  * RLS is the primary write gate. Direct client writes are only allowed
--    where a user acts on their own row, or where the caller is an admin.
--  * The service-role key is used in exactly three narrow, justified places
--    (documented at each policy below): CSV import (creating auth users),
--    attendance code validation (needs to read the session's secret, which
--    no client role can ever select), and the notification send/cron
--    pipeline (which runs with no logged-in session at all).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers that don't depend on any table yet
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  student_number text,
  role text not null default 'student' check (role in ('student', 'admin')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  must_set_pin boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (email);
create index profiles_role_idx on public.profiles (role);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Runs as the function owner (bypassing RLS) purely to answer "is this
-- caller an admin?" without recursing into profiles' own RLS policies.
-- Defined here, now that public.profiles exists.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_admin"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- No client-side insert/delete policy: new profiles are created by the
-- CSV import route using the service-role key (auth.admin.createUser +
-- a matching profiles row), since the student has no session yet.

-- Lets a freshly-logged-in student clear their own "must set a PIN" flag
-- after they've successfully changed their Supabase Auth password to their
-- chosen PIN — without opening general UPDATE access to their profile row.
create or replace function public.complete_pin_setup()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set must_set_pin = false
  where id = auth.uid();
$$;

grant execute on function public.complete_pin_setup() to authenticated;

-- ---------------------------------------------------------------------------
-- attendance_sessions
-- ---------------------------------------------------------------------------

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid references public.profiles (id),
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  code_interval_seconds int not null default 45 check (code_interval_seconds between 15 and 300),
  -- Never selectable by anyone except admins (RLS) and the service-role
  -- code-validation route. Never sent to any client.
  session_secret text not null default encode(gen_random_bytes(32), 'hex'),
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index attendance_sessions_status_idx on public.attendance_sessions (status);

create trigger attendance_sessions_set_updated_at
  before update on public.attendance_sessions
  for each row execute function public.set_updated_at();

alter table public.attendance_sessions enable row level security;

create policy "attendance_sessions_admin_all"
  on public.attendance_sessions for all
  using (public.is_admin())
  with check (public.is_admin());

-- Students never get a policy on this table, so a direct select returns
-- zero rows for them. They read sessions through the view below instead.
create view public.open_attendance_sessions
with (security_invoker = false) as
select id, title, description, status, opened_at, closed_at, created_at
from public.attendance_sessions
where status = 'open';

grant select on public.open_attendance_sessions to authenticated;

-- ---------------------------------------------------------------------------
-- attendance_records
-- ---------------------------------------------------------------------------

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'present' check (status in ('present')),
  marked_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create index attendance_records_session_idx on public.attendance_records (session_id);
create index attendance_records_student_idx on public.attendance_records (student_id);

alter table public.attendance_records enable row level security;

create policy "attendance_records_select_own_or_admin"
  on public.attendance_records for select
  using (student_id = auth.uid() or public.is_admin());

-- The attendance-code validation route is the only writer in practice
-- (it alone can prove the submitted code was correct), but this policy
-- means even that route can never insert a record for someone else.
create policy "attendance_records_insert_own"
  on public.attendance_records for insert
  with check (student_id = auth.uid());

-- ---------------------------------------------------------------------------
-- push_subscriptions
-- ---------------------------------------------------------------------------

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  onesignal_subscription_id text not null unique,
  device_type text,
  browser text,
  user_agent text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index push_subscriptions_student_idx on public.push_subscriptions (student_id);
create index push_subscriptions_active_idx on public.push_subscriptions (is_active);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own_or_admin"
  on public.push_subscriptions for select
  using (student_id = auth.uid() or public.is_admin());

create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  with check (student_id = auth.uid());

-- Covers the student's own device updates (last_seen_at) as well as the
-- admin/send-pipeline deactivating subscriptions OneSignal reports as dead.
create policy "push_subscriptions_update_own_or_admin"
  on public.push_subscriptions for update
  using (student_id = auth.uid() or public.is_admin())
  with check (student_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- notifications + notification_targets
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  deep_link text,
  created_by uuid references public.profiles (id),
  audience text not null default 'all' check (audience in ('all', 'selected')),
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  onesignal_notification_id text,
  stats jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notifications_status_idx on public.notifications (status);
create index notifications_scheduled_at_idx on public.notifications (scheduled_at);

create trigger notifications_set_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();

alter table public.notifications enable row level security;

create policy "notifications_admin_all"
  on public.notifications for all
  using (public.is_admin())
  with check (public.is_admin());

create table public.notification_targets (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  unique (notification_id, student_id)
);

create index notification_targets_notification_idx on public.notification_targets (notification_id);

alter table public.notification_targets enable row level security;

create policy "notification_targets_admin_all"
  on public.notification_targets for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- resources
-- ---------------------------------------------------------------------------

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  url text,
  file_path text,
  category text,
  sort_order int not null default 0,
  is_visible boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resources_has_target check (url is not null or file_path is not null)
);

create index resources_category_idx on public.resources (category);
create index resources_visible_order_idx on public.resources (is_visible, sort_order);

create trigger resources_set_updated_at
  before update on public.resources
  for each row execute function public.set_updated_at();

alter table public.resources enable row level security;

create policy "resources_select_visible_or_admin"
  on public.resources for select
  using (is_visible = true or public.is_admin());

create policy "resources_admin_write"
  on public.resources for insert
  with check (public.is_admin());

create policy "resources_admin_update"
  on public.resources for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "resources_admin_delete"
  on public.resources for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- student_import_log
-- ---------------------------------------------------------------------------

create table public.student_import_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id),
  filename text,
  valid_count int not null default 0,
  invalid_count int not null default 0,
  inserted_count int not null default 0,
  updated_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.student_import_log enable row level security;

create policy "student_import_log_admin_all"
  on public.student_import_log for all
  using (public.is_admin())
  with check (public.is_admin());
