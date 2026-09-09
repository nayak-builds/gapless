-- Stored resume text for match-score quotes (one row per upload).
-- Apply in the Supabase SQL Editor after 005_interview_question_sets.sql.

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  raw_text text not null,
  created_at timestamptz not null default now()
);

create index resumes_user_id_created_at_idx
  on public.resumes (user_id, created_at desc);

alter table public.resumes enable row level security;

create policy "resumes_select_own"
  on public.resumes for select
  using (user_id = auth.uid());

create policy "resumes_insert_own"
  on public.resumes for insert
  with check (user_id = auth.uid());

create policy "resumes_update_own"
  on public.resumes for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "resumes_delete_own"
  on public.resumes for delete
  using (user_id = auth.uid());

grant select, insert, update, delete on public.resumes to authenticated;
