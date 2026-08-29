-- Notes + embedding metadata (V2 ingest). Vectors live in ChromaDB, not Postgres.
-- Apply in the Supabase SQL Editor after 001_initial_schema.sql.

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text,
  content text,
  created_at timestamptz not null default now()
);

create table public.embeddings (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  chunk_text text,
  chunk_index int not null,
  created_at timestamptz not null default now()
);

create index notes_user_id_idx on public.notes (user_id);
create index embeddings_note_id_idx on public.embeddings (note_id);

alter table public.notes enable row level security;
alter table public.embeddings enable row level security;

create policy "notes_select_own"
  on public.notes for select
  using (user_id = auth.uid());

create policy "notes_insert_own"
  on public.notes for insert
  with check (user_id = auth.uid());

create policy "notes_update_own"
  on public.notes for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notes_delete_own"
  on public.notes for delete
  using (user_id = auth.uid());

-- embeddings has no user_id; scope through the parent note
create policy "embeddings_select_own"
  on public.embeddings for select
  using (
    exists (
      select 1
      from public.notes n
      where n.id = embeddings.note_id
        and n.user_id = auth.uid()
    )
  );

create policy "embeddings_insert_own"
  on public.embeddings for insert
  with check (
    exists (
      select 1
      from public.notes n
      where n.id = note_id
        and n.user_id = auth.uid()
    )
  );

create policy "embeddings_update_own"
  on public.embeddings for update
  using (
    exists (
      select 1
      from public.notes n
      where n.id = embeddings.note_id
        and n.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.notes n
      where n.id = note_id
        and n.user_id = auth.uid()
    )
  );

create policy "embeddings_delete_own"
  on public.embeddings for delete
  using (
    exists (
      select 1
      from public.notes n
      where n.id = embeddings.note_id
        and n.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.notes to authenticated;
grant select, insert, update, delete on public.embeddings to authenticated;
