-- pgvector on embeddings (384-d MiniLM). Apply after 003_quiz_attempts.sql.
-- Run in the Supabase SQL Editor. Vectors persist in Postgres (not on Render disk).

create extension if not exists vector;

alter table public.embeddings
  add column if not exists embedding vector(384);

create index if not exists embeddings_embedding_hnsw_idx
  on public.embeddings
  using hnsw (embedding vector_cosine_ops);
