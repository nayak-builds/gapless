# Troubleshooting

| Symptom | Likely cause |
|---|---|
| Agent implements quizzes during MVP | Scope rule ignored — see `docs/product-scope.md` |
| Frontend "needs" a DB URL | Architecture violation — APIs only |
| 401 from API | Missing/invalid Supabase JWT; wrong project URL |
| User A sees User B data | Missing `user_id` filter — treat as critical |
| LLM returns prose not JSON | Missing structured output + Pydantic |
| Preview deploy writes to real users | Production secrets in preview |
| Secret in git | Rotate immediately; purge from history only with explicit approval |

Logs must not include tokens, passwords, full resumes, or private notes.
