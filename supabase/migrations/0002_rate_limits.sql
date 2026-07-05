-- Generic per-student rate limiting, used first by attendance code
-- submission (brute-force protection) and reusable for other scoped
-- actions later without another migration.

create table public.rate_limit_hits (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.profiles (id) on delete cascade,
  scope text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_hits_lookup_idx on public.rate_limit_hits (student_id, scope, created_at);

alter table public.rate_limit_hits enable row level security;

create policy "rate_limit_hits_insert_own"
  on public.rate_limit_hits for insert
  with check (student_id = auth.uid());

create policy "rate_limit_hits_select_own"
  on public.rate_limit_hits for select
  using (student_id = auth.uid());
