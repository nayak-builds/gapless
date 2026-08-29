from io import BytesIO

from fastapi import HTTPException, UploadFile
from pypdf import PdfReader

_MAX_FILE_BYTES = 2 * 1024 * 1024
_ALLOWED_SUFFIXES = {".pdf", ".md", ".markdown", ".txt"}


def _suffix(filename: str | None) -> str:
    name = (filename or "").strip().lower()
    if "." not in name:
        return ""
    return "." + name.rsplit(".", 1)[-1]


def extract_pdf_text(data: bytes) -> str:
    try:
        reader = PdfReader(BytesIO(data))
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Could not read this PDF") from exc
    parts: list[str] = []
    for page in reader.pages:
        try:
            text = page.extract_text() or ""
        except Exception:
            text = ""
        if text.strip():
            parts.append(text)
    return "\n".join(parts)


async def extract_upload_text(upload: UploadFile) -> str:
    suffix = _suffix(upload.filename)
    if suffix not in _ALLOWED_SUFFIXES:
        raise HTTPException(
            status_code=422,
            detail="Upload a PDF, Markdown, or text file",
        )
    data = await upload.read()
    if len(data) > _MAX_FILE_BYTES:
        raise HTTPException(status_code=422, detail="File is too large (max 2 MB)")
    if not data:
        raise HTTPException(status_code=422, detail="The uploaded file is empty")
    if suffix == ".pdf":
        return extract_pdf_text(data)
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=422,
            detail="Could not read this file as UTF-8 text",
        ) from None
