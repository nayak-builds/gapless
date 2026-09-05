from uuid import UUID

from fastapi import APIRouter, Depends

from auth import get_current_user_id
from interview_prep_service import generate_interview_prep, get_interview_prep
from rate_limit import enforce_llm_rate_limit
from schemas import GenerateInterviewPrepBody, InterviewPrepResponse

router = APIRouter(tags=["interview-prep"])


@router.post("/interview-prep/generate", response_model=InterviewPrepResponse)
async def post_interview_prep_generate(
    body: GenerateInterviewPrepBody,
    user_id: str = Depends(get_current_user_id),
) -> InterviewPrepResponse:
    enforce_llm_rate_limit(user_id)
    return await generate_interview_prep(user_id, body.jd_id)


@router.get("/interview-prep/{jd_id}", response_model=InterviewPrepResponse)
async def get_interview_prep_by_jd(
    jd_id: UUID,
    user_id: str = Depends(get_current_user_id),
) -> InterviewPrepResponse:
    return await get_interview_prep(user_id, jd_id)
