# Troubleshooting

| Symptom | Likely cause |
|---|---|
| Agent implements quizzes during MVP | Scope rule ignored — see `docs/product-scope.md` |
| Frontend "needs" a DB URL | Architecture violation — APIs only |
| 401 from API | Missing/invalid Supabase JWT; wrong project URL |
| User A sees User B data | Missing `user_id` filter — treat as critical |
| LLM returns prose not JSON | Missing structured output + Pydantic |
| Preview deploy writes to real users | Production secrets in preview |
| Uvicorn exits: `TimeoutError` in asyncpg / pool init | Direct `db.<ref>.supabase.co:5432` hanging (common on Windows IPv6). Use **Session pooler** URI (port **6543**) from Supabase → Project Settings → Database. Confirm `/health` starts; then `/health/db` |
| `/health/db` disconnected after app starts | Wrong password, paused project, or still using the direct host. Pool uses `min_size=0` so the process can start without Postgres |

Logs must not include tokens, passwords, full resumes, or private notes.
