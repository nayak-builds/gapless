from __future__ import annotations

import logging
from dataclasses import dataclass
from uuid import UUID

from asyncpg.exceptions import UndefinedTableError
from fastapi import HTTPException

from db import acquire
from llm import generate_match_rewrites
from quote_verify import quote_is_in_resume
from rate_limit import enforce_llm_rate_limit
from schemas import (
    MatchRewriteItem,
    MatchScoreResponse,
    MatchScoreSuggestion,
)

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class GapSkillRow:
    name: str
    gap_level: str
    importance: str
    matched: bool


@dataclass(frozen=True)
class QuoteFilterResult:
    kept: list[MatchScoreSuggestion]
    dropped_unrelated_or_null: int
    dropped_hallucinated: int
    dropped_skill_names: list[str]


def compute_weighted_score(rows: list[GapSkillRow]) -> tuple[int, int, int]:
    matched_required = 0
    matched_nice = 0
    total_required = 0
    total_nice = 0
    matched_count = 0
    for row in rows:
        is_required = row.importance != "nice-to-have"
        if is_required:
            total_required += 1
        else:
            total_nice += 1
        if row.matched:
            matched_count += 1
            if is_required:
                matched_required += 1
            else:
                matched_nice += 1
    denominator = total_required * 1.0 + total_nice * 0.5
    if denominator <= 0:
        raise HTTPException(
            status_code=422,
            detail="Analyze this job description first so we can score the skill gap.",
        )
    numerator = matched_required * 1.0 + matched_nice * 0.5
    score = int(round(100 * numerator / denominator))
    score = max(0, min(100, score))
    return score, matched_count, len(rows)


def filter_verified_suggestions(
    items: list[MatchRewriteItem],
    resume_text: str,
) -> QuoteFilterResult:
    kept: list[MatchScoreSuggestion] = []
    dropped_unrelated = 0
    dropped_hallucinated = 0
    dropped_names: list[str] = []
    seen: set[str] = set()

    for item in items:
        skill = " ".join(item.skill.split())
        if not skill:
            continue
        key = skill.casefold()
        if key in seen:
            continue
        seen.add(key)

        quote = item.original_quote
        rewrite = item.suggested_rewrite
        if quote is None or rewrite is None:
            dropped_unrelated += 1
            continue
        quote_stripped = quote.strip()
        rewrite_stripped = rewrite.strip()
        if not quote_stripped or not rewrite_stripped:
            dropped_unrelated += 1
            continue

        if not quote_is_in_resume(quote_stripped, resume_text):
            dropped_hallucinated += 1
            dropped_names.append(skill)
            continue

        kept.append(
            MatchScoreSuggestion(
                skill=skill,
                original_quote=quote_stripped,
                suggested_rewrite=rewrite_stripped,
            )
        )

    return QuoteFilterResult(
        kept=kept,
        dropped_unrelated_or_null=dropped_unrelated,
        dropped_hallucinated=dropped_hallucinated,
        dropped_skill_names=dropped_names,
    )


def log_quote_verification(proposed: int, result: QuoteFilterResult) -> None:
    logger.info(
        "match-score quote verification: proposed=%s kept=%s "
        "dropped_unrelated_or_null=%s dropped_hallucinated=%s dropped_skills=%s",
        proposed,
        len(result.kept),
        result.dropped_unrelated_or_null,
        result.dropped_hallucinated,
        result.dropped_skill_names[:20],
    )


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


async def _latest_resume_text(user_id: str) -> str:
    try:
        async with acquire() as conn:
            text = await conn.fetchval(
                """
                select raw_text
                from public.resumes
                where user_id = $1::uuid
                order by created_at desc
                limit 1
                """,
                user_id,
            )
    except UndefinedTableError:
        raise HTTPException(
            status_code=422,
            detail="Upload a resume first to get a match score",
        ) from None
    if not text or not str(text).strip():
        raise HTTPException(
            status_code=422,
            detail="Upload a resume first to get a match score",
        )
    return str(text)


def _importance_map(required_rows: list) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for row in required_rows:
        name = " ".join((row["skill_name"] or "").split())
        if not name:
            continue
        importance = row["importance"] or "required"
        if importance != "nice-to-have":
            importance = "required"
        mapping[name.casefold()] = importance
    return mapping


def _gap_rows(gap_rows: list, importance_by_name: dict[str, str]) -> list[GapSkillRow]:
    pending: list[GapSkillRow] = []
    seen: set[str] = set()
    for row in gap_rows:
        name = " ".join((row["skill_name"] or "").split())
        if not name:
            continue
        key = name.casefold()
        if key in seen:
            continue
        seen.add(key)
        gap_level = row["gap_level"] or "required"
        matched = gap_level == "none"
        importance = importance_by_name.get(key, "required")
        pending.append(
            GapSkillRow(
                name=name,
                gap_level=gap_level,
                importance=importance,
                matched=matched,
            )
        )
    return pending


async def compute_match_score(user_id: str, jd_id: UUID) -> MatchScoreResponse:
    await _owned_jd(user_id, jd_id)
    resume_text = await _latest_resume_text(user_id)

    async with acquire() as conn:
        gap_rows = await conn.fetch(
            """
            select skill_name, gap_level
            from public.gaps
            where user_id = $1::uuid and jd_id = $2
            """,
            user_id,
            jd_id,
        )
        required_rows = await conn.fetch(
            """
            select skill_name, importance
            from public.skills_required
            where jd_id = $1
            """,
            jd_id,
        )

    rows = _gap_rows(gap_rows, _importance_map(required_rows))
    if not rows:
        raise HTTPException(
            status_code=422,
            detail="Analyze this job description first so we can score the skill gap.",
        )

    score, matched_count, total_count = compute_weighted_score(rows)
    missing_names = [row.name for row in rows if not row.matched]

    if not missing_names:
        empty = QuoteFilterResult(
            kept=[],
            dropped_unrelated_or_null=0,
            dropped_hallucinated=0,
            dropped_skill_names=[],
        )
        log_quote_verification(0, empty)
        return MatchScoreResponse(
            score=score,
            matched_count=matched_count,
            total_count=total_count,
            suggestions=[],
        )

    enforce_llm_rate_limit(user_id)
    payload = await generate_match_rewrites(missing_names, resume_text)
    filtered = filter_verified_suggestions(payload.suggestions, resume_text)
    log_quote_verification(len(payload.suggestions), filtered)

    return MatchScoreResponse(
        score=score,
        matched_count=matched_count,
        total_count=total_count,
        suggestions=filtered.kept,
    )
