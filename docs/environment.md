# Environment and secrets

Never commit `.env`, `.env.local`, or real keys. If a secret lands in git, rotate it.

## Environments

| Name | Purpose | Credentials |
|---|---|---|
| `local` | Developer machine | Personal/dev project; never production |
| `preview` | PR/staging deploy | Staging project and data |
| `production` | Real users | Production only, in the host's secret store |

`ENVIRONMENT` must be one of `local` | `preview` | `production`.

## Files

- `.env.example` — committed, placeholders only
- `.env.local` — local backend/frontend secrets (gitignored)
- Host dashboards (Vercel, Render/Fly, GitHub Actions) — production/preview secrets

Do not copy production values into `.env.local`.

## Variable naming

- `NEXT_PUBLIC_*` — safe to expose to the browser (anon Supabase URL/key, public API base URL)
- Everything else — backend only

## Categories

**App:** `ENVIRONMENT`, `LOG_LEVEL`, `FRONTEND_ORIGIN` / `CORS_ORIGINS`, `API_BASE_URL`

**Supabase / DB:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `SUPABASE_DB_CONNECTION_STRING` (backend Postgres URI; same role as `DATABASE_URL`)

**LLM:** `LLM_PROVIDER`, `LLM_MODEL`, `LLM_MAX_TOKENS`, `OPENAI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `AZURE_OPENAI_*` as needed, `OLLAMA_BASE_URL`

**Embeddings / RAG (V2):** `EMBEDDING_MODEL`, `CHROMA_PERSIST_DIR`

**Observability:** `SENTRY_DSN`

**Limits:** `MAX_JD_CHARS`, `MAX_UPLOAD_MB`, `LLM_RATE_LIMIT_PER_MINUTE`

Frontend must not receive service-role or LLM keys. See `.env.example`.
