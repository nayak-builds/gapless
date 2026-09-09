import asyncio
from uuid import UUID

from fastapi import HTTPException

from db import acquire
from embed import EMBEDDING_DIM, embed_texts
from skill_match import skills_match

QUIZ_TOP_K = 3
QUIZ_CANDIDATE_LIMIT = 24
# Semantic-only keep. Unrelated skill-vs-chunk pairs sit well above this.
QUIZ_MAX_COSINE_DISTANCE = 0.45
_MAX_CHUNK_CHARS = 2000


def _as_vector(values: list[float]) -> list[float]:
    if len(values) != EMBEDDING_DIM:
        raise HTTPException(
            status_code=503,
            detail="Embedding dimension mismatch. Please try again.",
        )
    return [float(v) for v in values]


def chunk_matches_skill(
    skill_name: str,
    title: str,
    chunk_text: str,
    distance: float,
) -> bool:
    if skills_match(skill_name, title) or skills_match(skill_name, chunk_text):
        return True
    return distance <= QUIZ_MAX_COSINE_DISTANCE


async def query_skill_chunks(user_id: str, skill_name: str, n: int = QUIZ_TOP_K) -> list[str]:
    query_vec = await asyncio.to_thread(embed_texts, [skill_name])
    query_vec = _as_vector(query_vec[0])
    take = max(n, 1)
    async with acquire() as conn:
        rows = await conn.fetch(
            """
            select e.chunk_text as chunk_text,
                   n.title as title,
                   (e.embedding <=> $2) as distance
            from public.embeddings e
            inner join public.notes n on n.id = e.note_id
            where n.user_id = $1::uuid
              and e.embedding is not null
            order by e.embedding <=> $2
            limit $3
            """,
            user_id,
            query_vec,
            QUIZ_CANDIDATE_LIMIT,
        )
    kept: list[str] = []
    seen: set[str] = set()
    for row in rows:
        text = (row["chunk_text"] or "").strip()
        if not text:
            continue
        distance = row["distance"]
        if distance is None:
            continue
        title = " ".join((row["title"] or "").split())
        if not chunk_matches_skill(skill_name, title, text, float(distance)):
            continue
        if len(text) > _MAX_CHUNK_CHARS:
            text = text[:_MAX_CHUNK_CHARS]
        key = text.casefold()
        if key in seen:
            continue
        seen.add(key)
        kept.append(text)
        if len(kept) >= take:
            break
    return kept


async def insert_note_with_embeddings(
    user_id: str,
    note_id: UUID,
    title: str,
    body: str,
    chunks: list[str],
    embedding_ids: list[UUID],
    vectors: list[list[float]],
) -> None:
    if len(chunks) != len(embedding_ids) or len(chunks) != len(vectors):
        raise HTTPException(status_code=503, detail="Could not save this note. Please try again.")
    async with acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                """
                insert into public.notes (id, user_id, title, content)
                values ($1, $2::uuid, $3, $4)
                """,
                note_id,
                user_id,
                title,
                body,
            )
            await conn.executemany(
                """
                insert into public.embeddings (
                  id, note_id, chunk_text, chunk_index, embedding
                )
                values ($1, $2, $3, $4, $5)
                """,
                [
                    (eid, note_id, chunk, index, _as_vector(vector))
                    for index, (eid, chunk, vector) in enumerate(
                        zip(embedding_ids, chunks, vectors)
                    )
                ],
            )
