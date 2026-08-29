from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

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
    id: UUID
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


class QuizQuestion(BaseModel):
    prompt: str = Field(min_length=1, max_length=500)
    options: list[str] = Field(min_length=4, max_length=4)
    correct_index: int = Field(ge=0, le=3)
    explanation: str = Field(min_length=1, max_length=600)


class QuizQuestionsPayload(BaseModel):
    questions: list[QuizQuestion] = Field(min_length=3, max_length=5)


class GenerateQuizBody(BaseModel):
    gap_id: UUID


class GenerateQuizResponse(BaseModel):
    gap_id: UUID
    skill_name: str
    questions: list[QuizQuestion] = Field(min_length=3, max_length=5)


class SubmitQuizBody(BaseModel):
    gap_id: UUID
    questions: list[QuizQuestion] = Field(min_length=3, max_length=5)
    answers: list[int] = Field(min_length=3, max_length=5)

    @model_validator(mode="after")
    def answers_align_with_questions(self) -> "SubmitQuizBody":
        if len(self.answers) != len(self.questions):
            raise ValueError("answers must have one selection per question")
        for index in self.answers:
            if index < 0 or index > 3:
                raise ValueError("each answer must be 0, 1, 2, or 3")
        return self


class QuizQuestionResult(BaseModel):
    selected_index: int
    correct_index: int
    is_correct: bool
    explanation: str


class SubmitQuizResponse(BaseModel):
    id: UUID
    score: int
    total: int
    percent: int
    next_review_at: datetime
    results: list[QuizQuestionResult]
