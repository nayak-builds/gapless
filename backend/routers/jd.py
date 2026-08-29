from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user_id
from config import get_settings
from db import acquire
from llm import extract_jd
from rate_limit import enforce_llm_rate_limit
from schemas import ExtractedSkillOut, ParseJdBody, ParseJdResponse

router = APIRouter(tags=["jd"])


@router.post("/jd/parse", response_model=ParseJdResponse)
async def parse_jd(
    body: ParseJdBody,
    user_id: str = Depends(get_current_user_id),
) -> ParseJdResponse:
    raw = body.raw_text.strip()
    max_chars = get_settings().max_jd_chars
    if not raw:
        raise HTTPException(status_code=422, detail="Paste a job description first")
    if len(raw) > max_chars:
        raise HTTPException(
            status_code=422,
            detail=f"Job description is too long (max {max_chars} characters)",
        )

    enforce_llm_rate_limit(user_id)
    extracted = await extract_jd(raw)

    async with acquire() as conn:
        async with conn.transaction():
            jd_id = await conn.fetchval(
                """
                insert into public.job_descriptions (user_id, raw_text, company, role_title)
                values ($1::uuid, $2, $3, $4)
                returning id
                """,
                user_id,
                raw,
                extracted.company,
                extracted.role_title,
            )
            for skill in extracted.skills:
                await conn.execute(
                    """
                    insert into public.skills_required (jd_id, skill_name, importance)
                    values ($1, $2, $3)
                    """,
                    jd_id,
                    skill.name,
                    skill.importance,
                )

    return ParseJdResponse(
        jd_id=jd_id,
        seniority=extracted.seniority,
        skills=[
            ExtractedSkillOut(name=s.name, importance=s.importance)
            for s in extracted.skills
        ],
    )
