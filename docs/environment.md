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

**App:** `ENVIRONMENT`, `LOG_LEVEL`, `FRONTEND_URL` (FastAPI CORS; comma-separated origins), `NEXT_PUBLIC_API_URL` (Next.js → FastAPI)

**Supabase / DB:** `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_CONNECTION_STRING` (backend Postgres URI)

**LLM:** `GROQ_API_KEY`, `GROQ_MODEL` (backend only)

**Limits:** `MAX_JD_CHARS`, `LLM_RATE_LIMIT_PER_MINUTE`

Frontend must not receive service-role or LLM keys. See `backend/.env.example` and `frontend/.env.example`.

## Production hosts (set in the dashboard — not in local `.env`)

Copy **production** values here. Do not reuse local/dev project secrets if you have a separate production Supabase project.

### Render (backend web service)

| Variable | Value |
|---|---|
| `FRONTEND_URL` | Production frontend origin, no trailing slash, e.g. `https://your-app.vercel.app`. Extra origins: comma-separated |
| `SUPABASE_URL` | `https://<prod-project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Production **service_role** key (never put this on Vercel) |
| `SUPABASE_DB_CONNECTION_STRING` | Production Postgres URI (pooler or direct; SSL as required) |
| `GROQ_API_KEY` | Production Groq key |
| `GROQ_MODEL` | Optional; default in code is `openai/gpt-oss-20b` |
| `MAX_JD_CHARS` | Optional; default `12000` |
| `LLM_RATE_LIMIT_PER_MINUTE` | Optional; default `10` |

Also on Render: start command in the `backend` directory, e.g. `uvicorn main:app --host 0.0.0.0 --port $PORT`.

### Vercel (frontend)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Same production Supabase URL as Render `SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production **anon** (public) key only |
| `NEXT_PUBLIC_API_URL` | Production API origin, no trailing slash, e.g. `https://your-api.onrender.com` |

Do **not** set on Vercel: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_CONNECTION_STRING`, `GROQ_API_KEY`.

After changing `NEXT_PUBLIC_*`, trigger a new Vercel build (they are inlined at build time).

### Supabase dashboard (not Render/Vercel env)

Auth → URL configuration: **Site URL** = your Vercel origin. Add the same origin to **Redirect URLs**.
