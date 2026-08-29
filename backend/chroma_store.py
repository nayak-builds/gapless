from pathlib import Path
from uuid import UUID

import chromadb
from chromadb.config import Settings as ChromaSettings
from fastapi import HTTPException

from config import get_settings

_client = None


def collection_name(user_id: str) -> str:
    compact = user_id.replace("-", "")
    return f"u_{compact}"


def get_client():
    global _client
    if _client is None:
        path = Path(get_settings().chroma_path)
        path.mkdir(parents=True, exist_ok=True)
        _client = chromadb.PersistentClient(
            path=str(path),
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    return _client


def user_collection(user_id: str):
    return get_client().get_or_create_collection(name=collection_name(user_id))


def add_chunks(
    user_id: str,
    note_id: UUID,
    embedding_ids: list[UUID],
    chunks: list[str],
) -> None:
    if not chunks:
        return
    collection = user_collection(user_id)
    collection.add(
        ids=[str(eid) for eid in embedding_ids],
        documents=chunks,
        metadatas=[
            {
                "user_id": user_id,
                "note_id": str(note_id),
                "chunk_index": index,
            }
            for index, _chunk in enumerate(chunks)
        ],
    )


def delete_note_vectors(user_id: str, note_id: UUID, embedding_ids: list[UUID]) -> None:
    try:
        collection = get_client().get_collection(name=collection_name(user_id))
    except Exception:
        return
    ids = [str(eid) for eid in embedding_ids]
    try:
        if ids:
            collection.delete(ids=ids)
        collection.delete(where={"note_id": str(note_id)})
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Could not remove note vectors. The note was not deleted.",
        ) from exc
