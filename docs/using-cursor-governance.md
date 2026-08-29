# How to use Cursor rules and skills

Rules are **always-on or file-scoped constraints**. Skills are **workflows** you (or the agent) load for a specific job. Skills do not replace rules.

## Rules (`.cursor/rules/*.mdc`)

| Rule | Applies | Responsibility |
|---|---|---|
| `gapless-core-architecture` | always | Stack, trusted boundary, agent behavior, anti-overengineering |
| `project-scope` | always | MVP / V2 / future |
| `authentication-security` | always | AuthN/AuthZ, isolation, secrets, uploads, prompt distrust |
| `git-workflow` | always | Branches and commits |
| `design-system` | always + `frontend/**` | Colors, type, spacing, UI primitives |
| `frontend-nextjs` | `frontend/**` | Next.js / TS / UI |
| `backend-fastapi` | `backend/**/*.py` | API layers, errors, jobs |
| `database-postgresql` | db + backend Python | Schema, migrations, indexes |
| `ai-llm` | backend Python | LangChain, structured output, JD pipeline |
| `rag` | description | V2 pgvector RAG |
| `testing-quality` | tests | pytest / Playwright |
| `deployment-devops` | CI/deploy files | Vercel, Render/Fly, envs |
| `documentation` | docs | Keep docs aligned with code |

Always-on rules stay short on purpose. Details live in `docs/` and in skills.

## Skills (`.cursor/skills/<name>/SKILL.md`)

Ask for them by name, for example:

- `Use the JD extraction skill.`
- `Use the gap analysis skill.`
- `Use the RAG pipeline skill.`
- `Use the quiz generation skill.`
- `Use the spaced repetition skill.`
- `Use the FastAPI feature skill.`
- `Use the Next.js feature skill.`
- `Use the database migration skill.`
- `Use the security review skill.`
- `Use the testing skill.`
- `Use the deployment skill.`
- `Use the code review skill.`

The agent should also auto-select a skill when the task matches its description.

## Non-trivial work

Before implementing, the agent should state: understanding, files, architecture impact, plan, validation. Skip this for tiny edits.

## What not to do

- Do not copy an entire rule into a skill.
- Do not add a thirteenth parallel architecture in a feature branch.
- Do not implement Version 2 because it is "more impressive" during MVP.
