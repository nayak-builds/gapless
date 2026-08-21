from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import asyncpg

from config import get_settings

app = FastAPI(title="Gapless API", version="0.0.1")
settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    status: str


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/health/db", response_model=None)
async def health_db() -> JSONResponse:
    dsn = settings.supabase_db_connection_string.strip()
    if not dsn:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "db": "disconnected",
                "message": (
                    "SUPABASE_DB_CONNECTION_STRING is not set. "
                    "Copy backend/.env.example to backend/.env and add your Supabase URI."
                ),
            },
        )

    try:
        if "supabase.co" in dsn:
            conn = await asyncpg.connect(dsn, timeout=10, ssl="require")
        else:
            conn = await asyncpg.connect(dsn, timeout=10)
        try:
            await conn.fetchval("SELECT 1")
        finally:
            await conn.close()
    except Exception as exc:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "db": "disconnected",
                "message": f"Could not reach Postgres ({type(exc).__name__}: {exc})",
            },
        )

    return JSONResponse(
        status_code=200,
        content={"status": "ok", "db": "connected"},
    )
