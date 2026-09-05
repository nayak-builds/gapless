# API

Use Pydantic request/response models, never raw ORM. Authenticated routes require `Authorization: Bearer <supabase_access_token>`. Identity comes from the token. Errors are `{ "error": "message" }`.

| Method | Path | Phase | Notes |
|---|---|---|---|
| GET | `/health` | scaffold | Process up; no database |
| GET | `/health/db` | scaffold | `SELECT 1` via the shared pool / `SUPABASE_DB_CONNECTION_STRING` |
| GET | `/skills/owned` | MVP | List the caller's `skills_owned.skill_name` values |
| POST | `/skills/owned` | MVP | Body `{ "skills": ["Python", ...] }`. Replaces the caller's owned skills (trim, drop empty, case-insensitive de-dupe). `proficiency` is null |
| POST | `/skills/owned/bulk` | MVP | Body `{ "skills": ["Python", ...] }`. Appends names that are not already owned (case-insensitive). Returns the full owned list. `proficiency` is null |
| POST | `/jd/parse` | MVP | Body `{ "raw_text": "..." }`. Rate-limited. Groq JSON extract → `job_descriptions` (including `company`, `role_title`) + `skills_required`. Returns `{ "jd_id", "seniority", "skills": [{ "name", "importance" }] }` where `importance` is `required` or `nice-to-have` |
| POST | `/resume/parse` | MVP | Multipart `file` (PDF / Markdown / txt, max 5 MB). Auth + LLM rate limit. Extracts text (empty/scanned PDF → 422). Groq JSON `{ "skills": [{ "name" }] }` — **does not** persist. Returns `{ "skills": [{ "name" }] }` |
| POST | `/gaps/compute` | MVP | Body `{ "jd_id": "<uuid>" }`. 404 if missing, 403 if another user's JD. Case-insensitive name match vs owned skills. Replaces `gaps` for that user+JD. Returns `{ "matched": [{ "id", "name", "gap_level" }], "missing": [{ "id", "name", "gap_level" }] }` (`gap_level` is `none` or the required skill's importance) |
| POST | `/auth/login` | planned | Supabase session verify / BFF — not custom passwords |
| GET | `/users/me` | planned | Current profile |
| GET | `/applications` | MVP | List the caller's applications joined to `job_descriptions` (`company`, `role_title`), newest `applied_at` first. Returns `{ "applications": [{ "id", "jd_id", "status", "applied_at", "company", "role_title" }] }` |
| POST | `/applications` | MVP | Body `{ "jd_id": "<uuid>" }`. Creates a row with `status` `applied`. 404 if JD missing, 403 if another user's JD. Idempotent: if the caller already tracked that JD, returns the existing row |
| PATCH | `/applications/{id}` | MVP | Body `{ "status": "applied" \| "interviewing" \| "offer" \| "rejected" }`. 404 if missing or not owned. Returns the updated application |
| DELETE | `/applications/{id}` | MVP | Deletes the caller's application. 404 if missing or not owned. Returns `{ "id": "<uuid>" }` |
| POST | `/notes` | V2 ingest | Multipart: `title` plus `content` and/or `file` (PDF / Markdown / txt). Rate-limited. Chunks, ONNX MiniLM 384-d, stores vectors on `embeddings.embedding` (pgvector). Returns `{ "id", "title", "created_at", "chunk_count" }` |
| GET | `/notes` | V2 ingest | Caller's notes: `{ "notes": [{ "id", "title", "created_at", "chunk_count" }] }` — no full content |
| DELETE | `/notes/{id}` | V2 ingest | Deletes Postgres `notes` (CASCADE `embeddings`). 404 if missing or not owned. Returns `{ "id": "<uuid>" }` |
| POST | `/quiz/generate` | V2 | Body `{ "gap_id": "<uuid>" }`. Auth required. Looks up the caller's gap, retrieves top 3 pgvector chunks for `skill_name` (cosine distance ≤ 0.90, else nearest). 422 `{ "error": "No notes found for this skill yet — add some notes first" }` if none. Otherwise Groq 3–5 MCQs grounded in those chunks. Rate-limited. Does **not** persist. Returns `{ "gap_id", "skill_name", "questions": [{ "prompt", "options", "correct_index", "explanation" }] }` |
| POST | `/quiz/submit` | V2 | Body `{ "gap_id", "questions", "answers" }` (`answers` is selected index per question). Server scores, sets `next_review_at` (1 / 3 / 7 days), inserts `quiz_attempts`. Returns `{ "id", "score", "total", "percent", "next_review_at", "results": [{ "selected_index", "correct_index", "is_correct", "explanation" }] }` |
| POST | `/interview-prep/generate` | explicit | Body `{ "jd_id": "<uuid>" }`. Auth + LLM rate limit (same as `/jd/parse`). 404/403 on JD. 422 if no `gaps` rows yet. Groq JSON two sections (`confident_questions`, `fundamentals_questions`) with `skill`, `difficulty` (`easy`\|`medium`\|`hard`), `question`. Upserts `interview_question_sets` on `(user_id, jd_id)`. Returns `{ "jd_id", "confident_questions", "fundamentals_questions" }` |
| GET | `/interview-prep/{jd_id}` | explicit | Saved set for that JD. 404 if missing or JD not found, 403 if another user's JD |

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
