from fastapi import APIRouter, Depends

from auth import get_current_user_id
from db import acquire
from schemas import OwnedSkillsResponse, SkillNamesBody

router = APIRouter(tags=["skills"])

_MAX_NAME = 80


def normalize_skill_names(raw: list[str]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for item in raw:
        name = " ".join(item.split())
        if not name or len(name) > _MAX_NAME:
            continue
        key = name.casefold()
        if key in seen:
            continue
        seen.add(key)
        out.append(name)
    return out


@router.get("/skills/owned", response_model=OwnedSkillsResponse)
async def get_owned_skills(
    user_id: str = Depends(get_current_user_id),
) -> OwnedSkillsResponse:
    async with acquire() as conn:
        rows = await conn.fetch(
            """
            select skill_name
            from public.skills_owned
            where user_id = $1::uuid
            order by skill_name
            """,
            user_id,
        )
    return OwnedSkillsResponse(skills=[row["skill_name"] for row in rows if row["skill_name"]])


@router.post("/skills/owned", response_model=OwnedSkillsResponse)
async def replace_owned_skills(
    body: SkillNamesBody,
    user_id: str = Depends(get_current_user_id),
) -> OwnedSkillsResponse:
    names = normalize_skill_names(body.skills)
    async with acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                "delete from public.skills_owned where user_id = $1::uuid",
                user_id,
            )
            for name in names:
                await conn.execute(
                    """
                    insert into public.skills_owned (user_id, skill_name, proficiency)
                    values ($1::uuid, $2, null)
                    """,
                    user_id,
                    name,
                )
    return OwnedSkillsResponse(skills=names)
