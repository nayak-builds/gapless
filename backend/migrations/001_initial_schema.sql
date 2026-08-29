-- Gapless initial schema
-- Apply in the Supabase SQL Editor (see docs/local-setup.md notes in the PR/chat).
-- Rollback (dev only): drop trigger, function, then tables in reverse dependency order.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

create table public.job_descriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  raw_text text,
  company text,
  role_title text,
  created_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  jd_id uuid not null references public.job_descriptions (id) on delete cascade,
  status text not null default 'applied'
    check (status in ('applied', 'interviewing', 'offer', 'rejected')),
  applied_at timestamptz not null default now()
);

create table public.skills_required (
  id uuid primary key default gen_random_uuid(),
  jd_id uuid not null references public.job_descriptions (id) on delete cascade,
  skill_name text,
  importance text
);

create table public.skills_owned (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  skill_name text,
  proficiency int
);

create table public.gaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  jd_id uuid not null references public.job_descriptions (id) on delete cascade,
  skill_name text,
  gap_level text
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index applications_user_id_status_idx on public.applications (user_id, status);
create index skills_required_jd_id_idx on public.skills_required (jd_id);
create index gaps_user_id_jd_id_idx on public.gaps (user_id, jd_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.job_descriptions enable row level security;
alter table public.applications enable row level security;
alter table public.skills_required enable row level security;
alter table public.skills_owned enable row level security;
alter table public.gaps enable row level security;

-- profiles: identity column is id (same as auth.uid())
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_delete_own"
  on public.profiles for delete
  using (id = auth.uid());

-- job_descriptions
create policy "job_descriptions_select_own"
  on public.job_descriptions for select
  using (user_id = auth.uid());

create policy "job_descriptions_insert_own"
  on public.job_descriptions for insert
  with check (user_id = auth.uid());

create policy "job_descriptions_update_own"
  on public.job_descriptions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "job_descriptions_delete_own"
  on public.job_descriptions for delete
  using (user_id = auth.uid());

-- applications
create policy "applications_select_own"
  on public.applications for select
  using (user_id = auth.uid());

create policy "applications_insert_own"
  on public.applications for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.job_descriptions jd
      where jd.id = jd_id
        and jd.user_id = auth.uid()
    )
  );

create policy "applications_update_own"
  on public.applications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "applications_delete_own"
  on public.applications for delete
  using (user_id = auth.uid());

-- skills_required has no user_id; scope through the parent JD
create policy "skills_required_select_own"
  on public.skills_required for select
  using (
    exists (
      select 1
      from public.job_descriptions jd
      where jd.id = skills_required.jd_id
        and jd.user_id = auth.uid()
    )
  );

create policy "skills_required_insert_own"
  on public.skills_required for insert
  with check (
    exists (
      select 1
      from public.job_descriptions jd
      where jd.id = jd_id
        and jd.user_id = auth.uid()
    )
  );

create policy "skills_required_update_own"
  on public.skills_required for update
  using (
    exists (
      select 1
      from public.job_descriptions jd
      where jd.id = skills_required.jd_id
        and jd.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.job_descriptions jd
      where jd.id = jd_id
        and jd.user_id = auth.uid()
    )
  );

create policy "skills_required_delete_own"
  on public.skills_required for delete
  using (
    exists (
      select 1
      from public.job_descriptions jd
      where jd.id = skills_required.jd_id
        and jd.user_id = auth.uid()
    )
  );

-- skills_owned
create policy "skills_owned_select_own"
  on public.skills_owned for select
  using (user_id = auth.uid());

create policy "skills_owned_insert_own"
  on public.skills_owned for insert
  with check (user_id = auth.uid());

create policy "skills_owned_update_own"
  on public.skills_owned for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "skills_owned_delete_own"
  on public.skills_owned for delete
  using (user_id = auth.uid());

-- gaps
create policy "gaps_select_own"
  on public.gaps for select
  using (user_id = auth.uid());

create policy "gaps_insert_own"
  on public.gaps for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.job_descriptions jd
      where jd.id = jd_id
        and jd.user_id = auth.uid()
    )
  );

create policy "gaps_update_own"
  on public.gaps for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "gaps_delete_own"
  on public.gaps for delete
  using (user_id = auth.uid());

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.job_descriptions to authenticated;
grant select, insert, update, delete on public.applications to authenticated;
grant select, insert, update, delete on public.skills_required to authenticated;
grant select, insert, update, delete on public.skills_owned to authenticated;
grant select, insert, update, delete on public.gaps to authenticated;

-- ---------------------------------------------------------------------------
-- Auto-create profile on Supabase Auth signup
-- SECURITY DEFINER: insert bypasses RLS so the trigger can write the row.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
