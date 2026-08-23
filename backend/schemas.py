from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

Importance = Literal["required", "nice-to-have"]


class SkillNamesBody(BaseModel):
    skills: list[str] = Field(max_length=50)


class OwnedSkillsResponse(BaseModel):
    skills: list[str]


class ParseJdBody(BaseModel):
    raw_text: str = Field(min_length=1)


class ExtractedSkillOut(BaseModel):
    name: str
    importance: Importance


class ParseJdResponse(BaseModel):
    jd_id: UUID
    seniority: str
    skills: list[ExtractedSkillOut]


class ComputeGapsBody(BaseModel):
    jd_id: UUID


class GapSkillOut(BaseModel):
    name: str
    gap_level: str


class ComputeGapsResponse(BaseModel):
    matched: list[GapSkillOut]
    missing: list[GapSkillOut]
