# Agent instructions (Gapless)

You are working in the Gapless monorepo. Follow `.cursor/rules/` as permanent constraints.

- Product scope: MVP vs V2 vs future is in `docs/product-scope.md`. Do not implement V2/future during MVP unless the user explicitly asks.
- Architecture: FastAPI is the trusted boundary. No frontend access to Postgres, ChromaDB, or LLM providers.
- Auth: Supabase Auth. Identity from the verified token. Never trust client `user_id`.
- Specialized work: load the matching skill under `.cursor/skills/` (see `docs/using-cursor-governance.md`).
- Source of truth: `docs/product/project-research-report.md` plus `docs/architecture.md`. Record new decisions in `docs/assumptions.md`.

If a requested change conflicts with these rules, name the conflict and ask before implementing.
