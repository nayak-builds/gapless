import json
from uuid import UUID

from fastapi import HTTPException

from db import acquire
from llm import generate_interview_questions
from schemas import InterviewPrepResponse, InterviewQuestion


async def _owned_jd(user_id: str, jd_id: UUID) -> None:
    async with acquire() as conn:
        row = await conn.fetchrow(
            """
            select id, user_id
            from public.job_descriptions
            where id = $1
            """,
            jd_id,
        )
    if row is None:
        raise HTTPException(status_code=404, detail="Job description not found")
    if str(row["user_id"]) != user_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this job description",
        )


def _questions_from_json(raw: object) -> list[InterviewQuestion]:
    if isinstance(raw, str):
        data = json.loads(raw)
    else:
        data = raw
    if not isinstance(data, list):
        return []
    return [InterviewQuestion.model_validate(item) for item in data]


async def generate_interview_prep(user_id: str, jd_id: UUID) -> InterviewPrepResponse:
    await _owned_jd(user_id, jd_id)

    async with acquire() as conn:
        rows = await conn.fetch(
            """
            select skill_name, gap_level
            from public.gaps
            where user_id = $1::uuid and jd_id = $2
            """,
            user_id,
            jd_id,
        )

    if not rows:
        raise HTTPException(
            status_code=422,
            detail="Analyze this job description first so we can build questions from the skill gap.",
        )

    matched: list[str] = []
    missing: list[str] = []
    seen_matched: set[str] = set()
    seen_missing: set[str] = set()
    for row in rows:
        name = " ".join((row["skill_name"] or "").split())
        if not name:
            continue
        key = name.casefold()
        if (row["gap_level"] or "") == "none":
            if key not in seen_matched:
                seen_matched.add(key)
                matched.append(name)
        else:
            if key not in seen_missing:
                seen_missing.add(key)
                missing.append(name)

    if not matched and not missing:
        raise HTTPException(
            status_code=422,
            detail="Analyze this job description first so we can build questions from the skill gap.",
        )

    payload = await generate_interview_questions(matched, missing)
    confident_json = json.dumps(
        [q.model_dump() for q in payload.confident_questions]
    )
    fundamentals_json = json.dumps(
        [q.model_dump() for q in payload.fundamentals_questions]
    )

    async with acquire() as conn:
        await conn.execute(
            """
            insert into public.interview_question_sets (
              user_id, jd_id, confident_questions, fundamentals_questions
            )
            values ($1::uuid, $2, $3::jsonb, $4::jsonb)
            on conflict (user_id, jd_id) do update set
              confident_questions = excluded.confident_questions,
              fundamentals_questions = excluded.fundamentals_questions,
              created_at = now()
            """,
            user_id,
            jd_id,
            confident_json,
            fundamentals_json,
        )

    return InterviewPrepResponse(
        jd_id=jd_id,
        confident_questions=payload.confident_questions,
        fundamentals_questions=payload.fundamentals_questions,
    )


async def get_interview_prep(user_id: str, jd_id: UUID) -> InterviewPrepResponse:
    await _owned_jd(user_id, jd_id)

    async with acquire() as conn:
        row = await conn.fetchrow(
            """
            select confident_questions, fundamentals_questions
            from public.interview_question_sets
            where user_id = $1::uuid and jd_id = $2
            """,
            user_id,
            jd_id,
        )

    if row is None:
        raise HTTPException(status_code=404, detail="Interview questions not found")

    return InterviewPrepResponse(
        jd_id=jd_id,
        confident_questions=_questions_from_json(row["confident_questions"]),
        fundamentals_questions=_questions_from_json(row["fundamentals_questions"]),
    )
