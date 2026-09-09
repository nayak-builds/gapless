import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from asyncpg.exceptions import UndefinedTableError

from auth import get_current_user_id
from config import get_settings
from db import acquire
from llm import extract_resume_skills
from note_extract import extract_upload_text
from rate_limit import enforce_llm_rate_limit
from schemas import ParseResumeResponse, ResumeSkillOut

router = APIRouter(tags=["resume"])
logger = logging.getLogger(__name__)

_MIN_RESUME_CHARS = 50
_LOG_SNIPPET = 300
# Must match llm._RESUME_LLM_MAX_CHARS (Groq input clip, not MAX_JD_CHARS).
_GROQ_RESUME_CHARS = 4000


def _one_line(text: str, limit: int) -> str:
    return " ".join(text.split())[:limit]


@router.post("/resume/parse", response_model=ParseResumeResponse)
async def parse_resume(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
) -> ParseResumeResponse:
    text = await extract_upload_text(file)
    stripped = text.strip()
    char_count = len(stripped)
    logger.warning(
        "resume parse extract: chars=%s max_jd_chars=%s         groq_clip=%s "
        "would_reject_max_jd=%s would_clip_for_groq=%s suffix=%s "
        "first_%s=%r last_%s=%r",
        char_count,
        get_settings().max_jd_chars,
        _GROQ_RESUME_CHARS,
        char_count > get_settings().max_jd_chars,
        char_count > _GROQ_RESUME_CHARS,
        (file.filename or "").rsplit(".", 1)[-1].lower() if file.filename else "",
        _LOG_SNIPPET,
        _one_line(stripped[:_LOG_SNIPPET], _LOG_SNIPPET),
        _LOG_SNIPPET,
        _one_line(stripped[-_LOG_SNIPPET:], _LOG_SNIPPET),
    )
    if len(stripped) < _MIN_RESUME_CHARS:
        raise HTTPException(
            status_code=422,
            detail=(
                "Couldn't read text from this PDF — try pasting your resume "
                "as text instead"
            ),
        )

    max_chars = get_settings().max_jd_chars
    if len(stripped) > max_chars:
        raise HTTPException(
            status_code=422,
            detail=f"Resume is too long (max {max_chars} characters)",
        )

    enforce_llm_rate_limit(user_id)
    extracted = await extract_resume_skills(stripped)
    names = [skill.name for skill in extracted.skills]
    logger.warning(
        "resume parse groq: returned=%s sample=%s",
        len(names),
        names[:12],
    )
    try:
        async with acquire() as conn:
            await conn.execute(
                """
                insert into public.resumes (user_id, raw_text)
                values ($1::uuid, $2)
                """,
                user_id,
                stripped,
            )
    except UndefinedTableError:
        logger.warning(
            "public.resumes is missing; apply backend/migrations/006_resumes.sql"
        )
    return ParseResumeResponse(
        skills=[ResumeSkillOut(name=skill.name) for skill in extracted.skills]
    )
