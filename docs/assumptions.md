# Assumptions

Decisions made where docs were missing or conflicting. Change these only with an explicit architecture decision (update this file).

## Locked product decisions

- **MVP includes JD extraction and gap analysis** (not tracker-only).
- **V2** is notes RAG, quizzes, spaced repetition, analytics, email reminders.
- **LangChain only** for orchestration when a chain is needed. Do not add LangGraph unless requested.
- **MVP JD parse** calls **Groq directly** (`httpx` to Groq's OpenAI-compatible chat API) with a strict JSON schema and Pydantic validation (one retry). LangChain is not used for this slice.
- **pgvector on Supabase** for vectors. Do not add ChromaDB, FAISS, Pinecone, or Weaviate unless requested.
- **Supabase** is the default for Postgres + Auth + Storage. Neon is an alternative for Postgres if Auth/Storage stay on Supabase.
- **Backend host default: Render.** Fly.io is the documented alternative.
- **Next.js App Router** (not Pages Router).
- **Python 3.12** and **Node 20 LTS** when tooling is added.
- **Alembic** for migrations when the backend is scaffolded.
- **SM-2** for spaced repetition (V2) is the long-term algorithm. **Quiz submit (this slice)** uses simple score buckets for `next_review_at`: below 60% → +1 day, 60–89% → +3 days, 90%+ → +7 days (UTC).
- **`POST /auth/login`** means verify/bootstrap using **Supabase** tokens (or document a BFF exchange). It is not a custom password table.

## RAG starting parameters (V2, unevaluated)

Documented so they are not invented ad hoc in code. Revisit after measurement.

| Parameter | Initial value |
|---|---|
| Chunking | Paragraph / line breaks first, then a **800-character** window (~200 tokens at 4 chars/token) with 100-character overlap. A ~2300-character note is multiple chunks even as one paragraph |
| Embedding model | Local ONNX MiniLM (`all-MiniLM-L6-v2`), 384 dimensions. No extra embedding API key |
| Similarity | pgvector cosine distance (`<=>`) |
| top-k | **3** for quiz generation (`POST /quiz/generate`) |
| Similarity threshold | Keep a chunk if the gap skill matches the note **title or chunk** (`skills_match`), or cosine distance `<= 0.45`. Never fall back to the nearest unrelated note. No matching chunks → 422 (skip Groq) |
| Retrieval | Dense only; user-scoped `embeddings` joined to `notes.user_id` |
| Notes formats | PDF, Markdown, plain text |
| Model cache | `EMBED_CACHE` (default `backend/embed_cache`). Ephemeral on Render; vectors live in Postgres |

## Gap matching

- Trim, collapse whitespace, lowercase.
- Drop whole-token suffixes such as `design`, `development`, `architecture`.
- Then match if phrases are equal, one phrase is contained in the other (remainder empty, `s`/`es`, or a suffix word), token plurals (`api`/`apis`), or `difflib.SequenceMatcher` ratio ≥ 0.86.
- `React` matches `react`. `REST APIs` matches `REST API design`. `Java` does **not** match `JavaScript` (remainder `script`).
- Embeddings / semantic match for leftover cases stay later.

## Dashboard gap vs live skills

- `skills_owned` is the live profile. The dashboard gap for the **current** JD is derived: when the user adds, removes, or clears skills, refresh that JD with `POST /gaps/compute` (no JD re-parse / Groq). Other JDs keep their last compute until the user analyzes them again.
- An empty owned list is an intentional 100% gap: keep the missing column. Copy must say the list is empty, not that we measured they lack each skill. Zero overlap with a non-empty list uses different copy.
- Last dashboard analysis in `sessionStorage` is keyed by user id. A 403/404 on that JD discards the snapshot so Interview Prep cannot show another account’s job.

## Auth on the frontend

- Supabase JS client with **anon** key is allowed.
- All data APIs still go through FastAPI, which re-verifies the JWT. RLS in Supabase is defense in depth, not a reason to skip backend authz.

## Empty `frontend/` and `backend/` directories

Present as future app roots. Do not fill with placeholder packages until feature work starts.

## Research report

`docs/product/project-research-report.md` is Gapless product/market context only (no personal schedule or other product ideas).
