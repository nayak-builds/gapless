from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel, Field
import os

_BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(_BACKEND_DIR / ".env")
load_dotenv(_BACKEND_DIR / ".env.local", override=True)


class Settings(BaseModel):
    supabase_db_connection_string: str = Field(default="")
    supabase_url: str = Field(default="")
    supabase_service_role_key: str = Field(default="")
    groq_api_key: str = Field(default="")
    groq_model: str = Field(default="openai/gpt-oss-20b")
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    max_jd_chars: int = Field(default=12000)
    max_note_chars: int = Field(default=100000)
    llm_rate_limit_per_minute: int = Field(default=10)
    notes_rate_limit_per_minute: int = Field(default=10)
    embed_cache: str = Field(default="")


def parse_cors_origins() -> list[str]:
    raw = (
        os.getenv("FRONTEND_URL")
        or os.getenv("CORS_ORIGINS")
        or os.getenv("CORS_ORIGIN")
        or os.getenv("FRONTEND_ORIGIN")
        or "http://localhost:3000"
    )
    origins = [part.strip().rstrip("/") for part in raw.split(",") if part.strip()]
    return origins or ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings(
        supabase_db_connection_string=os.getenv("SUPABASE_DB_CONNECTION_STRING", ""),
        supabase_url=os.getenv("SUPABASE_URL", ""),
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        groq_api_key=os.getenv("GROQ_API_KEY", ""),
        groq_model=os.getenv("GROQ_MODEL", "openai/gpt-oss-20b"),
        cors_origins=parse_cors_origins(),
        max_jd_chars=int(os.getenv("MAX_JD_CHARS", "12000")),
        max_note_chars=int(os.getenv("MAX_NOTE_CHARS", "100000")),
        llm_rate_limit_per_minute=int(os.getenv("LLM_RATE_LIMIT_PER_MINUTE", "10")),
        notes_rate_limit_per_minute=int(os.getenv("NOTES_RATE_LIMIT_PER_MINUTE", "10")),
        embed_cache=os.getenv("EMBED_CACHE", "").strip()
        or str(_BACKEND_DIR / "embed_cache"),
    )
