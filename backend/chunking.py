# Window size is in characters. ~4 chars/token → ~200 tokens, with overlap.
# A ~2300-character study note must become multiple chunks even with no
# blank lines (2800-char windows left those notes as a single vector).
CHUNK_CHARS = 800
OVERLAP_CHARS = 100


def _window(normalized: str) -> list[str]:
    if not normalized:
        return []
    if len(normalized) <= CHUNK_CHARS:
        return [normalized]
    chunks: list[str] = []
    start = 0
    length = len(normalized)
    while start < length:
        end = min(start + CHUNK_CHARS, length)
        chunks.append(normalized[start:end])
        if end >= length:
            break
        start = max(end - OVERLAP_CHARS, start + 1)
    return chunks


def chunk_text(text: str) -> list[str]:
    raw = (text or "").strip()
    if not raw:
        return []
    paragraphs = [part.strip() for part in raw.split("\n\n") if part.strip()]
    if not paragraphs:
        paragraphs = [raw]
    chunks: list[str] = []
    for paragraph in paragraphs:
        chunks.extend(_window(" ".join(paragraph.split())))
    return chunks
