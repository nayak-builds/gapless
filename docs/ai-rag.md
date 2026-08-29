# AI and RAG

Status: ingest and **quiz generate/submit** are implemented. Do not treat analytics or full SM-2 as implemented.

## Providers

LangChain orchestration. `LLM_PROVIDER` + `LLM_MODEL` in config. Supported targets: OpenAI, Groq, OpenRouter, Azure OpenAI, Ollama (dev/fallback). No model names copied through services.

## JD extraction (MVP)

Untrusted JD text → structured JSON → Pydantic. Handle empty, huge, noisy, duplicate skills, ambiguous seniority, and injection. User text is data, not instructions.

## Gap analysis (MVP)

Required vs owned. Categories: matched, missing, partial (if supported), importance/severity. Embeddings parameters and thresholds belong in [assumptions.md](assumptions.md) when enabled.

## RAG (Version 2)

Ingest (implemented): notes (PDF / Markdown / paste) → chunk → embed (Chroma default MiniLM) → per-user collection. Retrieval: query that collection with the gap `skill_name`, keep top 3 chunks with L2 distance ≤ 1.15.

Do not add hybrid search, rerankers, or hosted vector DBs until evaluation says the simple pipeline fails.

## Quizzes (V2)

`POST /quiz/generate` then `POST /quiz/submit`. Structured MCQs (3–5, four options, `correct_index`), Pydantic-validated, sourced from retrieved chunks only. Weak/empty retrieval returns 422 without calling Groq. Score on the server. Attempts stored in `quiz_attempts`.

## Spaced repetition (V2)

Submit uses UTC `next_review_at` buckets (1 / 3 / 7 days from percent). Indexed `(user_id, next_review_at)`. Full SM-2 is not wired yet.
