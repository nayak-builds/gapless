# API

Use Pydantic request/response models, never raw ORM. Authenticated routes require `Authorization: Bearer <supabase_access_token>`. Identity comes from the token. Errors are `{ "error": "message" }`.

| Method | Path | Phase | Notes |
|---|---|---|---|
| GET | `/health` | scaffold | Process up; no database |
| GET | `/health/db` | scaffold | `SELECT 1` via the shared pool / `SUPABASE_DB_CONNECTION_STRING` |
| GET | `/skills/owned` | MVP | List the caller's `skills_owned.skill_name` values |
| POST | `/skills/owned` | MVP | Body `{ "skills": ["Python", ...] }`. Replaces the caller's owned skills (trim, drop empty, case-insensitive de-dupe). `proficiency` is null |
| POST | `/jd/parse` | MVP | Body `{ "raw_text": "..." }`. Rate-limited. Groq JSON extract → `job_descriptions` + `skills_required`. Returns `{ "jd_id", "seniority", "skills": [{ "name", "importance" }] }` where `importance` is `required` or `nice-to-have` |
| POST | `/gaps/compute` | MVP | Body `{ "jd_id": "<uuid>" }`. 404 if missing, 403 if another user's JD. Case-insensitive name match vs owned skills. Replaces `gaps` for that user+JD. Returns `{ "matched": [{ "name", "gap_level" }], "missing": [{ "name", "gap_level" }] }` (`gap_level` is `none` or the required skill's importance) |
| POST | `/auth/login` | planned | Supabase session verify / BFF — not custom passwords |
| GET | `/users/me` | planned | Current profile |
| GET/POST | `/applications` | planned | Kanban |
| PATCH/PUT/DELETE | `/applications/{id}` | planned | Kanban |
| POST | `/quiz/generate` | V2 | Grounded in retrieved notes |
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
