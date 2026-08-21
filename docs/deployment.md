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
- [ ] CORS origins = real frontend URLs
- [ ] Backend health endpoint
- [ ] Migrations run before/at deploy
- [ ] No LLM keys on Vercel frontend env
- [ ] Sentry DSNs set per environment

Troubleshooting: wrong `ENVIRONMENT`, preview pointing at production Supabase, missing `CORS_ORIGINS`, failed migration, 401 from unverified JWT issuer.
