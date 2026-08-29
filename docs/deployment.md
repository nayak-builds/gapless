# Deployment

Status: **planned**. No Vercel/Render/GitHub Actions config is in the repo yet.

## Flow

Local → `feature/*` branch → pull request → GitHub Actions (lint/test) → preview → production.

## Platforms

- Frontend: Vercel
- Backend: Render (default) or Fly.io
- DB/Auth/Storage: Supabase
- Monitoring: platform logs + Sentry free tier

Do not introduce Kubernetes, Terraform, ECS, Kafka, Elasticsearch, or Redis unless usage requires it.

## Checklist when platforms are connected

- [ ] Separate preview and production secrets
- [ ] CORS origins = real frontend URLs (`FRONTEND_URL` on Render)
- [ ] Backend health endpoint
- [ ] Migrations run before/at deploy
- [ ] No LLM keys or service-role on Vercel frontend env
- [ ] `NEXT_PUBLIC_API_URL` on Vercel points at the live Render URL

Troubleshooting: preview pointing at production Supabase, missing `FRONTEND_URL`, failed migration, 401 from unverified JWT issuer.
