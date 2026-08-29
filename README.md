# Gapless

Gapless is a job-search copilot for Indian tech job-seekers (roughly 0–5 years of experience) applying to product companies and startups.

Most tools split the work: parse a job description in one place, track applications in another, and study from generic material. Gapless keeps the loop in one product: paste a JD, see how it compares to skills you already have, upload your notes, quiz the gaps, and track the application.

## Features

- **Auth** — email and password via Supabase
- **JD gap analysis** — paste a job description; the API extracts required skills and diffs them against your skill list
- **Notes** — upload PDF, Markdown, or pasted text; chunks are embedded and stored in Postgres (pgvector)
- **Quizzes** — generate multiple-choice questions from your notes for a missing skill, submit, and get a score plus next-review date
- **Application tracker** — kanban for `applied`, `interviewing`, `offer`, and `rejected`

## Live demo

- **API (Render):** [https://gapless.onrender.com/health](https://gapless.onrender.com/health) — `/health/db` is connected; OpenAPI includes `/notes` and `/quiz/*`.
- **Frontend (Vercel):** use the production URL on the Vercel project for `nayak-builds/gapless`. Do **not** use [https://gapless.vercel.app](https://gapless.vercel.app) — that hostname is a different product.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router), React, TypeScript, Tailwind CSS — Vercel |
| Backend | FastAPI, Pydantic — Render |
| Auth & database | Supabase (Auth + Postgres + **pgvector** for note embeddings) |
| LLM | Groq (called only from the backend; JD parse and quiz generate are rate-limited) |

The browser talks only to the Gapless API. Postgres and Groq credentials stay on the server. Note vectors live in Postgres, not on Render’s disk.

## Local development

See [docs/local-setup.md](docs/local-setup.md). Short version:

```bash
# frontend
cd frontend && npm install && npm run dev

# backend
cd backend && pip install -r requirements.txt && uvicorn main:app --reload --port 8000
```

Copy `backend/.env.example` and `frontend/.env.example` (or `.env.local`) and fill in your own keys. Never commit `.env` files. Apply SQL in `backend/migrations/` in order in the Supabase SQL Editor (including `004_pgvector_embeddings.sql` for quizzes).
