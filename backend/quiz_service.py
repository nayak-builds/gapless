import json
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException

from db import acquire
from llm import generate_quiz_from_chunks
from schemas import (
    GenerateQuizResponse,
    QuizQuestion,
    QuizQuestionResult,
    SubmitQuizResponse,
)
from vector_store import query_skill_chunks

NO_NOTES_MESSAGE = "No notes found for this skill yet — add some notes first"


async def _owned_gap(user_id: str, gap_id: UUID) -> tuple[UUID, str]:
    async with acquire() as conn:
        row = await conn.fetchrow(
            """
            select id, user_id, skill_name
            from public.gaps
            where id = $1
            """,
            gap_id,
        )
    if row is None:
        raise HTTPException(status_code=404, detail="Gap not found")
    if str(row["user_id"]) != user_id:
        raise HTTPException(status_code=403, detail="You do not have access to this gap")
    skill_name = " ".join((row["skill_name"] or "").split())
    if not skill_name:
        raise HTTPException(status_code=422, detail="This gap has no skill name")
    return UUID(str(row["id"])), skill_name


async def generate_quiz(user_id: str, gap_id: UUID) -> GenerateQuizResponse:
    owned_id, skill_name = await _owned_gap(user_id, gap_id)
    chunks = await query_skill_chunks(user_id, skill_name)
    if not chunks:
        raise HTTPException(status_code=422, detail=NO_NOTES_MESSAGE)
    questions = await generate_quiz_from_chunks(skill_name, chunks)
    return GenerateQuizResponse(
        gap_id=owned_id,
        skill_name=skill_name,
        questions=questions,
    )


def _next_review_at(percent: int, taken_at: datetime) -> datetime:
    if percent < 60:
        days = 1
    elif percent < 90:
        days = 3
    else:
        days = 7
    return taken_at + timedelta(days=days)


async def submit_quiz(
    user_id: str,
    gap_id: UUID,
    questions: list[QuizQuestion],
    answers: list[int],
) -> SubmitQuizResponse:
    owned_id, skill_name = await _owned_gap(user_id, gap_id)
    results: list[QuizQuestionResult] = []
    score = 0
    for question, selected in zip(questions, answers):
        is_correct = selected == question.correct_index
        if is_correct:
            score += 1
        results.append(
            QuizQuestionResult(
                selected_index=selected,
                correct_index=question.correct_index,
                is_correct=is_correct,
                explanation=question.explanation,
            )
        )
    total = len(questions)
    percent = round(100 * score / total) if total else 0
    taken_at = datetime.now(timezone.utc)
    next_review = _next_review_at(percent, taken_at)
    questions_json = json.dumps([q.model_dump() for q in questions])
    answers_json = json.dumps(answers)

    async with acquire() as conn:
        attempt_id = await conn.fetchval(
            """
            insert into public.quiz_attempts (
              user_id, gap_id, skill_name, questions, answers, score, taken_at, next_review_at
            )
            values (
              $1::uuid, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8
            )
            returning id
            """,
            user_id,
            owned_id,
            skill_name,
            questions_json,
            answers_json,
            score,
            taken_at,
            next_review,
        )

    return SubmitQuizResponse(
        id=attempt_id,
        score=score,
        total=total,
        percent=percent,
        next_review_at=next_review,
        results=results,
    )
