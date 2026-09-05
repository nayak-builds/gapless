from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from auth import get_current_user_id
from config import get_settings
from llm import extract_resume_skills
from note_extract import extract_upload_text
from rate_limit import enforce_llm_rate_limit
from schemas import ParseResumeResponse, ResumeSkillOut

router = APIRouter(tags=["resume"])

_MIN_RESUME_CHARS = 50


@router.post("/resume/parse", response_model=ParseResumeResponse)
async def parse_resume(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
) -> ParseResumeResponse:
    text = await extract_upload_text(file)
    stripped = text.strip()
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
    return ParseResumeResponse(
        skills=[ResumeSkillOut(name=skill.name) for skill in extracted.skills]
    )
