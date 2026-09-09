# Architecture

Status: **target architecture**. Application code is not implemented yet.

## Diagram

```text
Browser
  └── Next.js (React, TypeScript, Tailwind)
        └── HTTPS JSON
              └── FastAPI (trusted boundary)
                    ├── business services / use-cases
                    ├── PostgreSQL (Supabase or Neon)
                    ├── Supabase Auth (token verification)
                    ├── Supabase Storage (resumes; V2 notes)
                    ├── LangChain → LLM provider
                    └── pgvector on PostgreSQL (Version 2 RAG)
```

## Trust boundary

| Allowed in the browser | Forbidden in the browser |
|---|---|
| UI, Supabase Auth client (anon key) | `SUPABASE_SERVICE_ROLE_KEY` |
| Calls to Gapless FastAPI | Direct PostgreSQL |
| | OpenAI / Groq / OpenRouter / Azure SDKs |

FastAPI owns: authentication verification, authorization, validation, business logic, database access, LLM calls, RAG orchestration, file processing, rate limiting, error translation, logging, security enforcement.

## Backend shape

Modular monolith, domain packages: `auth`, `users`, `job_descriptions`, `applications`, `skills`, `gaps`, and later `notes`, `rag`, `quizzes`, `scheduling`.

```text
route → service → repository / ai / integrations
```

Pydantic request/response schemas are the HTTP contract. ORM models stay internal.

## Planned API baseline

See [api.md](api.md). New endpoints require schema, authn, authz, errors, tests, and docs updates.

## Data

PostgreSQL holds relational state and V2 vectors (`embeddings.embedding` via pgvector). Do not run a second vector database.

Important indexes when tables exist:

- `applications (user_id, status)`
- `skills_required (jd_id)`
- `gaps (user_id, jd_id)`
- `quiz_attempts (user_id, next_review_at)`

## AI

JD extraction (MVP): structured output + Pydantic. Gap matching: not string-equality-only when semantic match is required; thresholds documented.

V2 RAG: user notes → chunks → embeddings → retrieve for a **gap** → grounded quiz. No generic chat.

## Deploy

Local → branch → PR → GitHub Actions → preview → production.

Frontend: Vercel. Backend: Render (default) or Fly.io. Data: Supabase. Logs + Sentry.

## Cost

Design for roughly ₹0 on free tiers: cap JD length, rate-limit LLM routes, configurable cheap models, avoid duplicate embeddings and duplicate quiz generation.
