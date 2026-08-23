# Assumptions

Decisions made where docs were missing or conflicting. Change these only with an explicit architecture decision (update this file).

## Locked product decisions

- **MVP includes JD extraction and gap analysis** (not tracker-only).
- **V2** is notes RAG, quizzes, spaced repetition, analytics, email reminders.
- **LangChain only** for orchestration when a chain is needed. Do not add LangGraph unless requested.
- **MVP JD parse** calls **Groq directly** (`httpx` to Groq's OpenAI-compatible chat API) with a strict JSON schema and Pydantic validation (one retry). LangChain is not used for this slice.
- **ChromaDB only** for vectors. Do not add FAISS/Pinecone/Weaviate unless requested.
- **Supabase** is the default for Postgres + Auth + Storage. Neon is an alternative for Postgres if Auth/Storage stay on Supabase.
- **Backend host default: Render.** Fly.io is the documented alternative.
- **Next.js App Router** (not Pages Router).
- **Python 3.12** and **Node 20 LTS** when tooling is added.
- **Alembic** for migrations when the backend is scaffolded.
- **SM-2** for spaced repetition (V2).
- **`POST /auth/login`** means verify/bootstrap using **Supabase** tokens (or document a BFF exchange). It is not a custom password table.

## RAG starting parameters (V2, unevaluated)

Documented so they are not invented ad hoc in code. Revisit after measurement.

| Parameter | Initial value |
|---|---|
| Chunking | Fixed size, ~800 characters, 100 overlap |
| Embedding model | Set via `EMBEDDING_MODEL` (one place) |
| Similarity | Cosine |
| top-k | 5 |
| Similarity threshold | Conservative; reject quiz generation below threshold (exact number chosen at implementation and recorded here) |
| Retrieval | Dense only; user_id metadata filter |
| Notes formats | PDF, Markdown |

## Gap matching

- Trim, collapse whitespace, lowercase.
- Drop whole-token suffixes such as `design`, `development`, `architecture`.
- Then match if phrases are equal, one phrase is contained in the other (remainder empty, `s`/`es`, or a suffix word), token plurals (`api`/`apis`), or `difflib.SequenceMatcher` ratio ≥ 0.86.
- `React` matches `react`. `REST APIs` matches `REST API design`. `Java` does **not** match `JavaScript` (remainder `script`).
- Embeddings / semantic match for leftover cases stay later.

## Auth on the frontend

- Supabase JS client with **anon** key is allowed.
- All data APIs still go through FastAPI, which re-verifies the JWT. RLS in Supabase is defense in depth, not a reason to skip backend authz.

## Empty `frontend/` and `backend/` directories

Present as future app roots. Do not fill with placeholder packages until feature work starts.

## Research report

`docs/product/project-research-report.md` is Gapless product/market context only (no personal schedule or other product ideas).
