# Product scope

Gapless is an India-first job-search copilot for early-to-mid-career Indian software engineers (about 0–5 years), applying to product companies/startups, already using English tools such as LeetCode/GFG.

Differentiator (full product): **JD → gap → what to study → quiz from the user's own notes → track the application** — not another US-centric resume keyword scanner.

Research origin: [product/project-research-report.md](product/project-research-report.md).

## MVP

- Landing page
- Sign up / sign in (Supabase Auth)
- Dashboard
- Job description paste and analysis
- JD skill extraction and seniority extraction
- Resume upload
- Resume/user-skill vs JD gap analysis
- Application tracker (Kanban): `applied`, `interviewing`, `offer`, `rejected`
- Basic user profile
- Core CRUD APIs
- PostgreSQL persistence
- Secure per-user data ownership
- Production deployment
- Automated testing
- CI/CD

The MVP **includes** JD extraction and gap analysis. Sequencing inside MVP is allowed (for example tracker before LLM) as long as Version 2 is not pulled in.

## Version 2

- Personal notes (PDF / Markdown)
- Ingestion, chunking, embeddings, ChromaDB, retrieval, RAG
- Quiz generation, submission, scoring
- Spaced-repetition scheduling
- Personal progress analytics and weak-topic analysis
- Email reminders
- Better search/filtering
- Personal usage dashboard

## Future

- Email parsing for application status
- Interview-question aggregation
- Public readiness scores
- Company-specific question hubs
- Shared readiness data
- Push notifications
- Moderation
- Organization SSO
- Additional analytics

## Explicitly out of product

Generic chatbot; generic resume builder; auto-apply; "chat with any PDF"; scraping job boards as the core product; competing with Teal/Jobscan on ATS keyword theatre alone.
