-- Quiz attempts (V2). Generated questions and user answers stored as JSON.
-- Apply in the Supabase SQL Editor after 002_notes_embeddings.sql.

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  gap_id uuid not null references public.gaps (id) on delete cascade,
  skill_name text,
  questions jsonb not null,
  answers jsonb not null,
  score int not null,
  taken_at timestamptz not null default now(),
  next_review_at timestamptz not null
);

create index quiz_attempts_user_id_next_review_at_idx
  on public.quiz_attempts (user_id, next_review_at);

alter table public.quiz_attempts enable row level security;

create policy "quiz_attempts_select_own"
  on public.quiz_attempts for select
  using (user_id = auth.uid());

create policy "quiz_attempts_insert_own"
  on public.quiz_attempts for insert
  with check (user_id = auth.uid());

create policy "quiz_attempts_update_own"
  on public.quiz_attempts for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "quiz_attempts_delete_own"
  on public.quiz_attempts for delete
  using (user_id = auth.uid());

grant select, insert, update, delete on public.quiz_attempts to authenticated;
