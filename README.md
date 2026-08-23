# Gapless

India-first AI-powered job-search copilot: paste a JD, see skill gaps against your resume, track applications, and (in Version 2) study from your own notes with grounded quizzes and spaced repetition.

This repository is a **full-stack monorepo**. Application features are not implemented yet. Current work is **architecture governance**: Cursor rules, agent skills, and developer docs.

## Product loop

JD → extract skills/seniority → compare to resume/skills → identify gaps → track the application → (V2) study notes as RAG → targeted quizzes → attempts → spaced repetition.

**Not in scope:** generic chatbot, generic resume builder, generic AI wrapper, auto-apply, or a pile of unrelated job-search tools.

## Stack (locked)

| Layer | Choice |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Python, FastAPI, Pydantic, pytest |
| Data / auth / files | PostgreSQL + Supabase Auth + Supabase Storage |
| LLM | LangChain + configurable provider (OpenAI / Groq / OpenRouter / Azure / Ollama) |
| RAG (V2) | Embedded ChromaDB |
| Deploy | Vercel + Render or Fly.io + GitHub Actions |
| Monitoring | Platform logs + Sentry |

The browser talks **only** to FastAPI over HTTP. The frontend never opens PostgreSQL, ChromaDB, or LLM providers.

## Repository layout

```text
.cursor/rules/     persistent constraints
.cursor/skills/    task workflows (load when doing that work)
docs/              architecture, scope, env, governance
frontend/          Next.js 14 App Router
backend/           FastAPI skeleton (health checks)
```

## Documentation

| Doc | Purpose |
|---|---|
| [docs/product-scope.md](docs/product-scope.md) | MVP vs V2 vs future |
| [docs/architecture.md](docs/architecture.md) | System design |
| [docs/environment.md](docs/environment.md) | Env vars and secrets |
| [docs/using-cursor-governance.md](docs/using-cursor-governance.md) | How to use rules and skills |
| [docs/assumptions.md](docs/assumptions.md) | Decisions under ambiguity |
| [docs/product/project-research-report.md](docs/product/project-research-report.md) | Original product research (Gapless is the chosen idea) |

## Local development

The Next.js UI lives in `frontend/` (`npm install` then `npm run dev`). The FastAPI skeleton lives in `backend/` (`pip install -r requirements.txt` then `uvicorn main:app --reload --port 8000`). See [docs/local-setup.md](docs/local-setup.md).

## Git

- `main` is stable. Work on `feature/*`, `fix/*`, `refactor/*`, `docs/*`, `chore/*`.
- Conventional commits (`feat:`, `fix:`, `docs:`, …).

## License / status

Private portfolio product. Not production-ready until MVP is implemented, tested, and deployed.
