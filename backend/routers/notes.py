from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile

from auth import get_current_user_id
from note_extract import extract_upload_text
from notes_service import create_note, delete_note, list_notes
from rate_limit import enforce_notes_rate_limit
from schemas import DeleteNoteResponse, NoteListItem, NoteListResponse

router = APIRouter(tags=["notes"])


@router.get("/notes", response_model=NoteListResponse)
async def get_notes(
    user_id: str = Depends(get_current_user_id),
) -> NoteListResponse:
    notes = await list_notes(user_id)
    return NoteListResponse(notes=notes)


@router.post("/notes", response_model=NoteListItem)
async def post_note(
    title: str = Form(...),
    content: str = Form(""),
    file: UploadFile | None = File(None),
    user_id: str = Depends(get_current_user_id),
) -> NoteListItem:
    enforce_notes_rate_limit(user_id)
    uploaded = ""
    if file is not None and file.filename:
        uploaded = await extract_upload_text(file)
    return await create_note(user_id, title, content, uploaded)


@router.delete("/notes/{note_id}", response_model=DeleteNoteResponse)
async def remove_note(
    note_id: UUID,
    user_id: str = Depends(get_current_user_id),
) -> DeleteNoteResponse:
    deleted = await delete_note(user_id, note_id)
    return DeleteNoteResponse(id=deleted)
