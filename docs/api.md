# API

Health routes are implemented. Product APIs below are still **planned**. Use Pydantic request/response models, never raw ORM.

| Method | Path | Phase | Notes |
|---|---|---|---|
| GET | `/health` | scaffold | Process up; no database |
| GET | `/health/db` | scaffold | `SELECT 1` via `SUPABASE_DB_CONNECTION_STRING` |
| POST | `/auth/login` | MVP | Supabase session/token verification or BFF bootstrap — not custom passwords |
| GET | `/users/me` | MVP | Current user profile |
| POST | `/jd/parse` | MVP | Extract skills + seniority; rate-limited |
| POST | `/gaps/compute` | MVP | Required vs owned skills |
| GET | `/applications` | MVP | List; filter by status; user-scoped |
| POST | `/applications` | MVP | Create |
| PATCH/PUT | `/applications/{id}` | MVP | Update including status |
| DELETE | `/applications/{id}` | MVP | Delete |
| POST | `/quiz/generate` | V2 | Grounded in retrieved notes |
| POST | `/quiz/{id}/submit` | V2 | Server-side scoring |

All user data routes: `Authorization: Bearer <supabase_access_token>`. Identity comes from the token.

Additional profile, resume upload, and JD CRUD routes as needed, same authz rules.

## Errors (target)

Consistent JSON, for example `{ "error": { "code": "validation_error", "message": "..." } }`.

| Situation | HTTP |
|---|---|
| Validation | 422 |
| Unauthenticated | 401 |
| Forbidden / other user's resource | 403 |
| Missing | 404 |
| Conflict | 409 |
| Rate limit | 429 |
| LLM / upstream | 502 or 503 |
| Unexpected | 500 without stack trace to the client |

Update this file when routes ship.
