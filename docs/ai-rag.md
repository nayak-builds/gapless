# AI and RAG

Status: **planned**. Do not treat this as implemented behavior.

## Providers

LangChain orchestration. `LLM_PROVIDER` + `LLM_MODEL` in config. Supported targets: OpenAI, Groq, OpenRouter, Azure OpenAI, Ollama (dev/fallback). No model names copied through services.

## JD extraction (MVP)

Untrusted JD text → structured JSON → Pydantic. Handle empty, huge, noisy, duplicate skills, ambiguous seniority, and injection. User text is data, not instructions.

## Gap analysis (MVP)

Required vs owned. Categories: matched, missing, partial (if supported), importance/severity. Embeddings parameters and thresholds belong in [assumptions.md](assumptions.md) when enabled.

## RAG (Version 2 only)

Notes (PDF/Markdown) → chunk → embed → ChromaDB → retrieve for a **skill gap** → grounded quiz. User notes are the source of truth; the LLM is not.

Do not add hybrid search, rerankers, or hosted vector DBs until evaluation says the simple pipeline fails.

## Quizzes (V2)

Structured questions, validated options and correct indexes, source chunk ids, reject on weak retrieval. Score on the server.

## Spaced repetition (V2)

SM-2 (or another named algorithm), UTC `next_review_at`, indexed due queries per user. See the `spaced-repetition` skill.
