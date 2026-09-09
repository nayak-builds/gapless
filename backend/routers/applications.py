from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user_id
from db import acquire
from schemas import (
    ApplicationListResponse,
    ApplicationOut,
    CreateApplicationBody,
    DeleteApplicationResponse,
    PatchApplicationBody,
)

router = APIRouter(tags=["applications"])

_SELECT_JOIN = """
select
  a.id,
  a.jd_id,
  a.status,
  a.applied_at,
  jd.company,
  jd.role_title
from public.applications a
join public.job_descriptions jd on jd.id = a.jd_id
"""


def _row_to_out(row) -> ApplicationOut:
    return ApplicationOut(
        id=row["id"],
        jd_id=row["jd_id"],
        status=row["status"],
        applied_at=row["applied_at"],
        company=row["company"],
        role_title=row["role_title"],
    )


@router.get("/applications", response_model=ApplicationListResponse)
async def list_applications(
    user_id: str = Depends(get_current_user_id),
) -> ApplicationListResponse:
    async with acquire() as conn:
        rows = await conn.fetch(
            _SELECT_JOIN
            + """
            where a.user_id = $1::uuid
            order by a.applied_at desc
            """,
            user_id,
        )
    return ApplicationListResponse(applications=[_row_to_out(row) for row in rows])


@router.post("/applications", response_model=ApplicationOut)
async def create_application(
    body: CreateApplicationBody,
    user_id: str = Depends(get_current_user_id),
) -> ApplicationOut:
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
            raise HTTPException(
                status_code=403,
                detail="You do not have access to this job description",
            )

        existing = await conn.fetchrow(
            _SELECT_JOIN
            + """
            where a.user_id = $1::uuid and a.jd_id = $2
            """,
            user_id,
            body.jd_id,
        )
        if existing is not None:
            return _row_to_out(existing)

        app_id = await conn.fetchval(
            """
            insert into public.applications (user_id, jd_id, status)
            values ($1::uuid, $2, 'applied')
            returning id
            """,
            user_id,
            body.jd_id,
        )
        row = await conn.fetchrow(
            _SELECT_JOIN + " where a.id = $1",
            app_id,
        )
    if row is None:
        raise HTTPException(status_code=500, detail="Could not create application")
    return _row_to_out(row)


@router.patch("/applications/{application_id}", response_model=ApplicationOut)
async def patch_application(
    application_id: UUID,
    body: PatchApplicationBody,
    user_id: str = Depends(get_current_user_id),
) -> ApplicationOut:
    async with acquire() as conn:
        row = await conn.fetchrow(
            _SELECT_JOIN
            + """
            where a.id = $1 and a.user_id = $2::uuid
            """,
            application_id,
            user_id,
        )
        if row is None:
            raise HTTPException(status_code=404, detail="Application not found")

        await conn.execute(
            """
            update public.applications
            set status = $3
            where id = $1 and user_id = $2::uuid
            """,
            application_id,
            user_id,
            body.status,
        )
        updated = await conn.fetchrow(
            _SELECT_JOIN + " where a.id = $1 and a.user_id = $2::uuid",
            application_id,
            user_id,
        )
    if updated is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return _row_to_out(updated)


@router.delete("/applications/{application_id}", response_model=DeleteApplicationResponse)
async def delete_application(
    application_id: UUID,
    user_id: str = Depends(get_current_user_id),
) -> DeleteApplicationResponse:
    async with acquire() as conn:
        deleted_id = await conn.fetchval(
            """
            delete from public.applications
            where id = $1 and user_id = $2::uuid
            returning id
            """,
            application_id,
            user_id,
        )
    if deleted_id is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return DeleteApplicationResponse(id=deleted_id)
