from __future__ import annotations

import logging
from uuid import UUID

from asyncpg.exceptions import UndefinedColumnError, UndefinedTableError
from fastapi import HTTPException

from db import acquire
from llm import generate_resume_evidence
from match_score_service import GapSkillRow, compute_weighted_score
from quote_verify import line_containing_skill, quote_is_in_resume
from rate_limit import enforce_llm_rate_limit
from schemas import ComputeGapsResponse, GapSkillOut
from skill_match import skills_match

logger = logging.getLogger(__name__)


def partition_uncached_missing(
    missing_names: list[str],
    resume_text: str,
    cache: dict[str, str | None],
) -> tuple[dict[str, str], list[str]]:
    """Promote cheap/cached resume evidence. Returns (quotes by skill name, names to Groq)."""
    promoted: dict[str, str] = {}
    uncached: list[str] = []
    for name in missing_names:
        key = name.casefold()
        if key in cache:
            quote = cache[key]
            if quote and quote_is_in_resume(quote, resume_text):
                promoted[name] = quote
            elif quote:
                uncached.append(name)
            continue
        line = line_containing_skill(resume_text, name)
        if line:
            promoted[name] = line
            continue
        uncached.append(name)
    return promoted, uncached


async def compute_gaps(user_id: str, jd_id: UUID) -> ComputeGapsResponse:
    async with acquire() as conn:
        jd = await conn.fetchrow(
            """
            select id, user_id
            from public.job_descriptions
            where id = $1
            """,
            jd_id,
        )
        if jd is None:
            raise HTTPException(status_code=404, detail="Job description not found")
        if str(jd["user_id"]) != user_id:
            raise HTTPException(
                status_code=403,
                detail="You do not have access to this job description",
            )

        required = await conn.fetch(
            """
            select skill_name, importance
            from public.skills_required
            where jd_id = $1
            """,
            jd_id,
        )
        owned_rows = await conn.fetch(
            """
            select skill_name
            from public.skills_owned
            where user_id = $1::uuid
            """,
            user_id,
        )
        resume_row = None
        try:
            resume_row = await conn.fetchrow(
                """
                select id, raw_text
                from public.resumes
                where user_id = $1::uuid
                order by created_at desc
                limit 1
                """,
                user_id,
            )
        except UndefinedTableError:
            logger.warning(
                "public.resumes is missing; apply backend/migrations/006_resumes.sql"
            )

    owned_names = [
        " ".join((row["skill_name"] or "").split())
        for row in owned_rows
        if row["skill_name"]
    ]

    owned_matched: list[tuple[str, str]] = []
    name_missing: list[tuple[str, str]] = []
    seen: set[str] = set()
    for row in required:
        name = " ".join((row["skill_name"] or "").split())
        if not name:
            continue
        key = name.casefold()
        if key in seen:
            continue
        seen.add(key)
        importance = row["importance"] or "required"
        if importance != "nice-to-have":
            importance = "required"
        if any(skills_match(name, owned) for owned in owned_names):
            owned_matched.append((name, importance))
        else:
            name_missing.append((name, importance))

    resume_quotes: dict[str, str] = {}
    if resume_row and (resume_row["raw_text"] or "").strip() and name_missing:
        resume_id = resume_row["id"]
        resume_text = str(resume_row["raw_text"])
        cache = await _load_evidence_cache(user_id, resume_id)
        missing_names = [name for name, _ in name_missing]
        resume_quotes, uncached = partition_uncached_missing(
            missing_names, resume_text, cache
        )
        cheap_new = {
            name: quote
            for name, quote in resume_quotes.items()
            if name.casefold() not in cache
        }
        if cheap_new:
            await _upsert_evidence(user_id, resume_id, list(cheap_new), cheap_new)
        if uncached:
            groq_quotes = await _evidence_from_groq(user_id, uncached, resume_text)
            await _upsert_evidence(user_id, resume_id, uncached, groq_quotes)
            resume_quotes.update(groq_quotes)

    try:
        matched, missing = await _persist_gaps(
            user_id,
            jd_id,
            owned_matched,
            name_missing,
            resume_quotes,
            persist_match_source=True,
        )
    except UndefinedColumnError:
        logger.warning(
            "gaps.match_source is missing; apply "
            "backend/migrations/007_resume_skill_evidence.sql"
        )
        matched, missing = await _persist_gaps(
            user_id,
            jd_id,
            owned_matched,
            name_missing,
            resume_quotes,
            persist_match_source=False,
        )

    score_rows: list[GapSkillRow] = []
    for name, importance in owned_matched:
        score_rows.append(
            GapSkillRow(
                name=name,
                gap_level="none",
                importance=importance,
                matched=True,
            )
        )
    for name, importance in name_missing:
        is_resume = name in resume_quotes
        score_rows.append(
            GapSkillRow(
                name=name,
                gap_level="none" if is_resume else importance,
                importance=importance,
                matched=is_resume,
            )
        )
    if score_rows:
        score, matched_count, total_count = compute_weighted_score(score_rows)
    else:
        score, matched_count, total_count = 0, 0, 0

    return ComputeGapsResponse(
        matched=matched,
        missing=missing,
        score=score,
        matched_count=matched_count,
        total_count=total_count,
    )


async def _persist_gaps(
    user_id: str,
    jd_id: UUID,
    owned_matched: list[tuple[str, str]],
    name_missing: list[tuple[str, str]],
    resume_quotes: dict[str, str],
    persist_match_source: bool,
) -> tuple[list[GapSkillOut], list[GapSkillOut]]:
    matched: list[GapSkillOut] = []
    missing: list[GapSkillOut] = []
    async with acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                """
                delete from public.gaps
                where user_id = $1::uuid and jd_id = $2
                """,
                user_id,
                jd_id,
            )
            for name, _importance in owned_matched:
                skill = await _insert_gap(
                    conn,
                    user_id,
                    jd_id,
                    name,
                    "none",
                    "owned",
                    persist_match_source,
                )
                matched.append(skill)
            for name, importance in name_missing:
                if name in resume_quotes:
                    skill = await _insert_gap(
                        conn,
                        user_id,
                        jd_id,
                        name,
                        "none",
                        "resume",
                        persist_match_source,
                    )
                    matched.append(skill)
                else:
                    skill = await _insert_gap(
                        conn,
                        user_id,
                        jd_id,
                        name,
                        importance,
                        None,
                        persist_match_source,
                    )
                    missing.append(skill)
    return matched, missing


async def _insert_gap(
    conn,
    user_id: str,
    jd_id: UUID,
    name: str,
    gap_level: str,
    match_source: str | None,
    persist_match_source: bool,
) -> GapSkillOut:
    if persist_match_source:
        gap_id = await conn.fetchval(
            """
            insert into public.gaps (
              user_id, jd_id, skill_name, gap_level, match_source
            )
            values ($1::uuid, $2, $3, $4, $5)
            returning id
            """,
            user_id,
            jd_id,
            name,
            gap_level,
            match_source,
        )
    else:
        gap_id = await conn.fetchval(
            """
            insert into public.gaps (user_id, jd_id, skill_name, gap_level)
            values ($1::uuid, $2, $3, $4)
            returning id
            """,
            user_id,
            jd_id,
            name,
            gap_level,
        )
    return GapSkillOut(
        id=gap_id,
        name=name,
        gap_level=gap_level,
        match_source=match_source,
    )


async def _load_evidence_cache(user_id: str, resume_id: UUID) -> dict[str, str | None]:
    try:
        async with acquire() as conn:
            rows = await conn.fetch(
                """
                select skill_key, quote
                from public.resume_skill_evidence
                where user_id = $1::uuid and resume_id = $2
                """,
                user_id,
                resume_id,
            )
    except UndefinedTableError:
        logger.warning(
            "public.resume_skill_evidence is missing; apply "
            "backend/migrations/007_resume_skill_evidence.sql"
        )
        return {}
    return {row["skill_key"]: row["quote"] for row in rows}


async def _upsert_evidence(
    user_id: str,
    resume_id: UUID,
    skills: list[str],
    quotes: dict[str, str],
) -> None:
    try:
        async with acquire() as conn:
            for name in skills:
                key = name.casefold()
                quote = quotes.get(name)
                await conn.execute(
                    """
                    insert into public.resume_skill_evidence (
                      user_id, resume_id, skill_name, skill_key, quote
                    )
                    values ($1::uuid, $2, $3, $4, $5)
                    on conflict (resume_id, skill_key) do update set
                      skill_name = excluded.skill_name,
                      quote = excluded.quote
                    """,
                    user_id,
                    resume_id,
                    name,
                    key,
                    quote,
                )
    except UndefinedTableError:
        logger.warning(
            "public.resume_skill_evidence is missing; apply "
            "backend/migrations/007_resume_skill_evidence.sql"
        )


async def _evidence_from_groq(
    user_id: str,
    skills: list[str],
    resume_text: str,
) -> dict[str, str]:
    try:
        enforce_llm_rate_limit(user_id)
        payload = await generate_resume_evidence(skills, resume_text)
    except HTTPException as exc:
        if exc.status_code in (429, 502, 503):
            logger.warning(
                "resume evidence groq skipped: status=%s detail=%s",
                exc.status_code,
                exc.detail,
            )
            return {}
        raise

    kept: dict[str, str] = {}
    dropped = 0
    for item in payload.evidence:
        skill = " ".join(item.skill.split())
        quote = (item.original_quote or "").strip()
        if not skill or not quote:
            continue
        if not quote_is_in_resume(quote, resume_text):
            dropped += 1
            continue
        kept[skill] = quote
    logger.info(
        "resume evidence quote verification: proposed=%s kept=%s dropped_hallucinated=%s",
        len(payload.evidence),
        len(kept),
        dropped,
    )
    return kept
