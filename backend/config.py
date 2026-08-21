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
    cors_origin: str = Field(default="http://localhost:3000")


@lru_cache
def get_settings() -> Settings:
    return Settings(
        supabase_db_connection_string=os.getenv("SUPABASE_DB_CONNECTION_STRING", ""),
        supabase_url=os.getenv("SUPABASE_URL", ""),
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        groq_api_key=os.getenv("GROQ_API_KEY", ""),
        cors_origin=os.getenv("CORS_ORIGIN", "http://localhost:3000"),
    )
