import asyncio
import logging
from uuid import UUID, uuid4

from fastapi import HTTPException

import chroma_store
from chunking import chunk_text
from config import get_settings
from db import acquire
from schemas import NoteListItem

logger = logging.getLogger(__name__)

_MAX_TITLE = 200


def _normalize_title(title: str) -> str:
    cleaned = " ".join((title or "").split())
    if not cleaned:
        raise HTTPException(status_code=422, detail="Add a title for this note")
    if len(cleaned) > _MAX_TITLE:
        raise HTTPException(
            status_code=422,
            detail=f"Title is too long (max {_MAX_TITLE} characters)",
        )
    return cleaned


def _combine_body(pasted: str, uploaded: str) -> str:
    parts = [part.strip() for part in (pasted, uploaded) if part and part.strip()]
    return "\n\n".join(parts)


async def list_notes(user_id: str) -> list[NoteListItem]:
    async with acquire() as conn:
        rows = await conn.fetch(
            """
            select
              n.id,
              n.title,
              n.created_at,
              (
                select count(*)::int
                from public.embeddings e
                where e.note_id = n.id
              ) as chunk_count
            from public.notes n
            where n.user_id = $1::uuid
            order by n.created_at desc
            """,
            user_id,
        )
    return [
        NoteListItem(
            id=row["id"],
            title=row["title"],
            created_at=row["created_at"],
            chunk_count=row["chunk_count"],
        )
        for row in rows
    ]


async def create_note(user_id: str, title: str, pasted: str, uploaded: str) -> NoteListItem:
    heading = _normalize_title(title)
    body = _combine_body(pasted, uploaded)
    max_chars = get_settings().max_note_chars
    if not body:
        raise HTTPException(
            status_code=422,
            detail="Paste note text or upload a PDF or Markdown file",
        )
    if len(body) > max_chars:
        raise HTTPException(
            status_code=422,
            detail=f"Note is too long (max {max_chars} characters)",
        )

    chunks = chunk_text(body)
    if not chunks:
        raise HTTPException(status_code=422, detail="Could not find any text in this note")

    note_id = uuid4()
    embedding_ids = [uuid4() for _ in chunks]

    try:
        await asyncio.to_thread(
            chroma_store.add_chunks,
            user_id,
            note_id,
            embedding_ids,
            chunks,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Chroma add failed")
        raise HTTPException(
            status_code=503,
            detail="Could not store note embeddings. Please try again.",
        ) from exc

    try:
        async with acquire() as conn:
            async with conn.transaction():
                await conn.execute(
                    """
                    insert into public.notes (id, user_id, title, content)
                    values ($1, $2::uuid, $3, $4)
                    """,
                    note_id,
                    user_id,
                    heading,
                    body,
                )
                await conn.executemany(
                    """
                    insert into public.embeddings (id, note_id, chunk_text, chunk_index)
                    values ($1, $2, $3, $4)
                    """,
                    [
                        (eid, note_id, chunk, index)
                        for index, (eid, chunk) in enumerate(zip(embedding_ids, chunks))
                    ],
                )
            row = await conn.fetchrow(
                """
                select id, title, created_at
                from public.notes
                where id = $1 and user_id = $2::uuid
                """,
                note_id,
                user_id,
            )
    except Exception as exc:
        logger.exception("Postgres note insert failed after Chroma add")
        try:
            await asyncio.to_thread(
                chroma_store.delete_note_vectors,
                user_id,
                note_id,
                embedding_ids,
            )
        except Exception:
            logger.exception("Chroma rollback after failed note insert also failed")
        raise HTTPException(
            status_code=503,
            detail="Could not save this note. Please try again.",
        ) from exc

    if row is None:
        raise HTTPException(status_code=503, detail="Could not save this note. Please try again.")

    return NoteListItem(
        id=row["id"],
        title=row["title"],
        created_at=row["created_at"],
        chunk_count=len(chunks),
    )


async def delete_note(user_id: str, note_id: UUID) -> UUID:
    async with acquire() as conn:
        note = await conn.fetchrow(
            """
            select id
            from public.notes
            where id = $1 and user_id = $2::uuid
            """,
            note_id,
            user_id,
        )
        if note is None:
            raise HTTPException(status_code=404, detail="Note not found")
        rows = await conn.fetch(
            """
            select id
            from public.embeddings
            where note_id = $1
            order by chunk_index
            """,
            note_id,
        )

    embedding_ids = [row["id"] for row in rows]
    await asyncio.to_thread(
        chroma_store.delete_note_vectors,
        user_id,
        note_id,
        embedding_ids,
    )

    async with acquire() as conn:
        deleted_id = await conn.fetchval(
            """
            delete from public.notes
            where id = $1 and user_id = $2::uuid
            returning id
            """,
            note_id,
            user_id,
        )
    if deleted_id is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return deleted_id
