# API

Use Pydantic request/response models, never raw ORM. Authenticated routes require `Authorization: Bearer <supabase_access_token>`. Identity comes from the token. Errors are `{ "error": "message" }`.

| Method | Path | Phase | Notes |
|---|---|---|---|
| GET | `/health` | scaffold | Process up; no database |
| GET | `/health/db` | scaffold | `SELECT 1` via the shared pool / `SUPABASE_DB_CONNECTION_STRING` |
| GET | `/skills/owned` | MVP | List the caller's `skills_owned.skill_name` values |
| POST | `/skills/owned` | MVP | Body `{ "skills": ["Python", ...] }`. Replaces the caller's owned skills (trim, drop empty, case-insensitive de-dupe). `proficiency` is null |
| POST | `/jd/parse` | MVP | Body `{ "raw_text": "..." }`. Rate-limited. Groq JSON extract → `job_descriptions` (including `company`, `role_title`) + `skills_required`. Returns `{ "jd_id", "seniority", "skills": [{ "name", "importance" }] }` where `importance` is `required` or `nice-to-have` |
| POST | `/gaps/compute` | MVP | Body `{ "jd_id": "<uuid>" }`. 404 if missing, 403 if another user's JD. Case-insensitive name match vs owned skills. Replaces `gaps` for that user+JD. Returns `{ "matched": [{ "name", "gap_level" }], "missing": [{ "name", "gap_level" }] }` (`gap_level` is `none` or the required skill's importance) |
| POST | `/auth/login` | planned | Supabase session verify / BFF — not custom passwords |
| GET | `/users/me` | planned | Current profile |
| GET | `/applications` | MVP | List the caller's applications joined to `job_descriptions` (`company`, `role_title`), newest `applied_at` first. Returns `{ "applications": [{ "id", "jd_id", "status", "applied_at", "company", "role_title" }] }` |
| POST | `/applications` | MVP | Body `{ "jd_id": "<uuid>" }`. Creates a row with `status` `applied`. 404 if JD missing, 403 if another user's JD. Idempotent: if the caller already tracked that JD, returns the existing row |
| PATCH | `/applications/{id}` | MVP | Body `{ "status": "applied" \| "interviewing" \| "offer" \| "rejected" }`. 404 if missing or not owned. Returns the updated application |
| DELETE | `/applications/{id}` | MVP | Deletes the caller's application. 404 if missing or not owned. Returns `{ "id": "<uuid>" }` |
| POST | `/notes` | V2 ingest | Multipart: `title` plus `content` and/or `file` (PDF / Markdown / txt). Rate-limited. Chunks ~500–800 tokens, embeds with Chroma default MiniLM, stores vectors in a per-user collection. Returns `{ "id", "title", "created_at", "chunk_count" }` |
| GET | `/notes` | V2 ingest | Caller's notes: `{ "notes": [{ "id", "title", "created_at", "chunk_count" }] }` — no full content |
| DELETE | `/notes/{id}` | V2 ingest | Deletes Chroma vectors for the note, then Postgres `notes` (CASCADE `embeddings`). 404 if missing or not owned. Returns `{ "id": "<uuid>" }` |
| POST | `/quiz/generate` | V2 | Grounded in retrieved notes — not implemented |
| POST | `/quiz/{id}/submit` | V2 | Server-side scoring |

## Errors

| Situation | HTTP |
|---|---|
| Validation | 422 |
| Unauthenticated | 401 |
| Forbidden / other user's resource | 403 |
| Missing | 404 |
| Rate limit | 429 |
| LLM / upstream | 502 or 503 |
| Unexpected | 500 without stack trace to the client |
