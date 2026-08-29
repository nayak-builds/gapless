from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from config import get_settings
from db import close_pool, get_pool, init_pool
from errors import register_error_handlers
from routers import applications, gaps, jd, notes, skills

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_pool()
    yield
    await close_pool()


app = FastAPI(title="Gapless API", version="0.0.1", lifespan=lifespan)
register_error_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(skills.router)
app.include_router(jd.router)
app.include_router(gaps.router)
app.include_router(applications.router)
app.include_router(notes.router)


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
        pool = get_pool()
    except RuntimeError:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "db": "disconnected",
                "message": (
                    "Database pool is not initialized. "
                    "Check SUPABASE_DB_CONNECTION_STRING. On Windows, use the "
                    "Session pooler URI from Supabase (host contains pooler, port 6543) "
                    "instead of db.<project>.supabase.co:5432 if connect times out."
                ),
            },
        )

    try:
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
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
