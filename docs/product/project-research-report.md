# Gapless — product research

This document is Gapless product and market context only. It is not a personal study schedule, career plan, or comparison of other product ideas.

Canonical engineering constraints live in `.cursor/rules/` and `docs/product-scope.md`. If this file and those docs disagree, **product-scope + architecture docs win**.

---

## Problem

Indian tech job-seekers stitch together disconnected tools: a resume/keyword checker, a spreadsheet or Kanban tracker, and a separate study plan. None of those talk to each other, so preparation is not driven by the gaps in the jobs the person is actually applying to.

## Product

**Gapless** is an India-first job-search copilot.

Loop:

JD → extract required skills and seniority → compare to the candidate’s skills/resume → identify gaps → track the application → (later) study from the user’s own notes → grounded quizzes → spaced repetition.

**One-line:** Paste a job description, see the real skill gap, track the application, and — in Version 2 — get quizzes from *your own* notes aimed at those gaps.

## Target users

Early-to-mid-career Indian software engineers (about 0–5 years of experience), applying to product companies or startups, comfortable with English-language tools, already likely to use LeetCode/GFG.

## Why this is not “another resume tool”

Existing tools each solve one slice and are mostly priced/designed for the US market:

| Competitor | Does well | Weak point | Gapless wedge |
|---|---|---|---|
| Teal | Free Kanban + resume builder | US-centric; no personal-notes RAG quiz | Close the study loop from identified gaps |
| Jobscan | Deep ATS keyword scoring | Paid, one-shot analysis | Ongoing, tied to applications and prep |
| Resumly / PitchMeAI | Resume + apply automation | Paid, US-market; auto-apply can conflict with platform rules | Manual/ethical apply; India-first |

No competitor identified in this research does: **generate a quiz from the user’s uploaded notes, targeted at JD skill gaps.**

Demand for JD-gap tooling is verified by continued investment in Teal, Jobscan, Resumly, Rezi, PitchMeAI, and Enhancv. That an India-first unified product is underserved is an **inference** (absence of a dominant India-first incumbent), not a proven market study.

## Market context (what Gapless must not become)

These categories are crowded or out of scope. Do not pivot Gapless into them:

- Generic resume/JD keyword matchers (Teal, Jobscan, Resumly, and similar)
- Generic AI mock interviewers (Exponent/Pramp, Interviewing.io, and similar)
- “Chat with this GitHub repo” products (DeepWiki and clones)
- Generic chatbot / “another ChatGPT”
- Auto-apply / job-board scraping as a core product

India-specific note: most resume/JD/mock-interview tools above use USD pricing and US-style ATS/question-bank assumptions. A well-known India-first, INR-aware equivalent was not found in this research (absence-of-evidence, weaker than a positive finding).

## MVP

1. Paste a JD → LLM extracts required skills and seniority
2. Upload resume → skill-gap diff
3. Kanban application tracker: applied / interviewing / offer / rejected
4. Auth so data is per-user

Repository blueprint also requires: landing page, dashboard, basic profile, core CRUD APIs, PostgreSQL, production deploy, automated tests, CI/CD. See `docs/product-scope.md`.

## Version 2 and later

**Version 2:** personal notes (PDF/Markdown), ingestion, chunking, embeddings, pgvector retrieval, RAG, quiz generate/submit/score, spaced repetition, progress/weak-topic analytics, email reminders, richer search, usage dashboard.

**Future (not V2 unless explicitly requested):** email parsing for application status, company interview-question hubs, public readiness scores, push notifications, org SSO, extra analytics.

## Architecture (target)

```text
Next.js (React, Tailwind)
  └── FastAPI (Pydantic, async)
        ├── PostgreSQL (users, JDs, applications, skills, gaps, note embeddings via pgvector)
        ├── LLM via LangChain (extraction; later RAG)
        └── (vectors in Postgres, not a separate store)
```

Deploy: Vercel (frontend) + Render or Fly.io (backend) + Supabase (Postgres, Auth, Storage).

The frontend never talks to PostgreSQL or LLM providers.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind |
| Backend | Python, FastAPI, Pydantic, async |
| Data / auth / files | PostgreSQL, Supabase Auth, Supabase Storage |
| LLM | LangChain; provider configurable (OpenAI, Groq, OpenRouter, Azure OpenAI, Ollama for dev) |
| RAG (V2) | pgvector on Supabase Postgres |
| CI / monitoring | GitHub Actions; platform logs + Sentry |

Prefer free/low-cost managed infrastructure. Mitigate LLM cost with rate limits, input caps, and cheaper models for extraction.

## Risks

1. **Scope creep** — “unify everything” balloons. Hold MVP vs V2.
2. **Extraction quality** on messy real-world JDs — test beyond happy paths.
3. **Crowded category** — lead with the closed loop (JD → gap → prep → tracker), not “another resume tool.”

## Positioning summary

1. **Product:** India-first job-search copilot (gaps + tracker +, later, notes-grounded prep).
2. **Users:** early-to-mid-career Indian software engineers actively applying.
3. **Problem:** fragmented tools; prep not tied to actual JD gaps.
4. **UVP:** close the loop from pasted JD to (V2) a quiz from the user’s own notes on what they are missing.
5. **Do not build:** generic chatbot, generic resume builder, auto-apply, chat-with-docs as a product.
