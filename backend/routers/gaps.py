from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user_id
from db import acquire
from schemas import ComputeGapsBody, ComputeGapsResponse, GapSkillOut
from skill_match import skills_match

router = APIRouter(tags=["gaps"])


@router.post("/gaps/compute", response_model=ComputeGapsResponse)
async def compute_gaps(
    body: ComputeGapsBody,
    user_id: str = Depends(get_current_user_id),
) -> ComputeGapsResponse:
    async with acquire() as conn:
        jd = await conn.fetchrow(
            """
            select id, user_id
            from public.job_descriptions
            where id = $1
            """,
            body.jd_id,
        )
        if jd is None:
            raise HTTPException(status_code=404, detail="Job description not found")
        if str(jd["user_id"]) != user_id:
            raise HTTPException(status_code=403, detail="You do not have access to this job description")

        required = await conn.fetch(
            """
            select skill_name, importance
            from public.skills_required
            where jd_id = $1
            """,
            body.jd_id,
        )
        owned_rows = await conn.fetch(
            """
            select skill_name
            from public.skills_owned
            where user_id = $1::uuid
            """,
            user_id,
        )
        owned_names = [
            " ".join((row["skill_name"] or "").split())
            for row in owned_rows
            if row["skill_name"]
        ]

        matched: list[GapSkillOut] = []
        missing: list[GapSkillOut] = []
        seen: set[str] = set()
        for row in required:
            name = " ".join((row["skill_name"] or "").split())
            if not name:
                continue
            key = name.casefold()
            if key in seen:
                continue
            seen.add(key)
            if any(skills_match(name, owned) for owned in owned_names):
                matched.append(GapSkillOut(name=name, gap_level="none"))
            else:
                importance = row["importance"] or "required"
                missing.append(GapSkillOut(name=name, gap_level=importance))

        async with conn.transaction():
            await conn.execute(
                """
                delete from public.gaps
                where user_id = $1::uuid and jd_id = $2
                """,
                user_id,
                body.jd_id,
            )
            for item in matched + missing:
                await conn.execute(
                    """
                    insert into public.gaps (user_id, jd_id, skill_name, gap_level)
                    values ($1::uuid, $2, $3, $4)
                    """,
                    user_id,
                    body.jd_id,
                    item.name,
                    item.gap_level,
                )

    return ComputeGapsResponse(matched=matched, missing=missing)
