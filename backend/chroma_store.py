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


QUIZ_TOP_K = 3
QUIZ_MAX_DISTANCE = 1.15
_MAX_CHUNK_CHARS = 2000


def query_skill_chunks(user_id: str, skill_name: str, n: int = QUIZ_TOP_K) -> list[str]:
    try:
        collection = get_client().get_collection(name=collection_name(user_id))
    except Exception:
        return []
    try:
        count = collection.count()
    except Exception:
        return []
    if count < 1:
        return []

    n_results = min(max(n, 1), count)
    try:
        result = collection.query(
            query_texts=[skill_name],
            n_results=n_results,
            include=["documents", "distances"],
        )
    except Exception:
        return []

    documents = (result.get("documents") or [[]])[0] or []
    distances = (result.get("distances") or [[]])[0] or []
    chunks: list[str] = []
    for doc, distance in zip(documents, distances):
        if not doc or not str(doc).strip():
            continue
        if distance is None or float(distance) > QUIZ_MAX_DISTANCE:
            continue
        text = str(doc).strip()
        if len(text) > _MAX_CHUNK_CHARS:
            text = text[:_MAX_CHUNK_CHARS]
        chunks.append(text)
    return chunks


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
