from uuid import UUID

import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from config import get_settings
from db import acquire

_bearer = HTTPBearer(auto_error=False)


async def get_current_user_id(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    if creds is None or creds.scheme.lower() != "bearer" or not creds.credentials:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    settings = get_settings()
    base = settings.supabase_url.strip().rstrip("/")
    service_key = settings.supabase_service_role_key.strip()
    if not base or not service_key:
        raise HTTPException(status_code=503, detail="Auth is not configured on the server")

    token = creds.credentials
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{base}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": service_key,
                },
            )
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Could not reach Supabase Auth") from None

    if response.status_code == 401:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    if response.status_code >= 400:
        raise HTTPException(status_code=401, detail="Could not verify session")

    payload = response.json()
    user_id = payload.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    try:
        UUID(str(user_id))
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired session") from None

    email = payload.get("email")
    await _ensure_profile(str(user_id), email if isinstance(email, str) else None)
    return str(user_id)


async def _ensure_profile(user_id: str, email: str | None) -> None:
    async with acquire() as conn:
        await conn.execute(
            """
            insert into public.profiles (id, email)
            values ($1::uuid, $2)
            on conflict (id) do update
              set email = coalesce(excluded.email, public.profiles.email)
            """,
            user_id,
            email,
        )
