-- Interview prep question sets (one row per user + JD).
-- Apply in the Supabase SQL Editor after 004_pgvector_embeddings.sql.

create table public.interview_question_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  jd_id uuid not null references public.job_descriptions (id) on delete cascade,
  confident_questions jsonb not null,
  fundamentals_questions jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, jd_id)
);

alter table public.interview_question_sets enable row level security;

create policy "interview_question_sets_select_own"
  on public.interview_question_sets for select
  using (user_id = auth.uid());

create policy "interview_question_sets_insert_own"
  on public.interview_question_sets for insert
  with check (user_id = auth.uid());

create policy "interview_question_sets_update_own"
  on public.interview_question_sets for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "interview_question_sets_delete_own"
  on public.interview_question_sets for delete
  using (user_id = auth.uid());

grant select, insert, update, delete on public.interview_question_sets to authenticated;
