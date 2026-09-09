-- Resume-evidenced gap matches (cache survives gap recomputes).
-- Apply in the Supabase SQL Editor after 006_resumes.sql.

alter table public.gaps
  add column if not exists match_source text
  check (match_source is null or match_source in ('owned', 'resume'));

create table public.resume_skill_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  resume_id uuid not null references public.resumes (id) on delete cascade,
  skill_name text not null,
  skill_key text not null,
  quote text,
  created_at timestamptz not null default now(),
  unique (resume_id, skill_key)
);

create index resume_skill_evidence_user_id_idx
  on public.resume_skill_evidence (user_id, resume_id);

alter table public.resume_skill_evidence enable row level security;

create policy "resume_skill_evidence_select_own"
  on public.resume_skill_evidence for select
  using (user_id = auth.uid());

create policy "resume_skill_evidence_insert_own"
  on public.resume_skill_evidence for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.resumes r
      where r.id = resume_id
        and r.user_id = auth.uid()
    )
  );

create policy "resume_skill_evidence_update_own"
  on public.resume_skill_evidence for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "resume_skill_evidence_delete_own"
  on public.resume_skill_evidence for delete
  using (user_id = auth.uid());

grant select, insert, update, delete on public.resume_skill_evidence to authenticated;
