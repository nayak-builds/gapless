from datetime import datetime
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


ApplicationStatus = Literal["applied", "interviewing", "offer", "rejected"]


class CreateApplicationBody(BaseModel):
    jd_id: UUID


class PatchApplicationBody(BaseModel):
    status: ApplicationStatus


class ApplicationOut(BaseModel):
    id: UUID
    jd_id: UUID
    status: ApplicationStatus
    applied_at: datetime
    company: str | None = None
    role_title: str | None = None


class ApplicationListResponse(BaseModel):
    applications: list[ApplicationOut]


class DeleteApplicationResponse(BaseModel):
    id: UUID


class NoteListItem(BaseModel):
    id: UUID
    title: str | None = None
    created_at: datetime
    chunk_count: int


class NoteListResponse(BaseModel):
    notes: list[NoteListItem]


class DeleteNoteResponse(BaseModel):
    id: UUID
