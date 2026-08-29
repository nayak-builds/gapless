from fastapi import APIRouter, Depends

from auth import get_current_user_id
from quiz_service import generate_quiz, submit_quiz
from schemas import GenerateQuizBody, GenerateQuizResponse, SubmitQuizBody, SubmitQuizResponse

router = APIRouter(tags=["quiz"])


@router.post("/quiz/generate", response_model=GenerateQuizResponse)
async def post_quiz_generate(
    body: GenerateQuizBody,
    user_id: str = Depends(get_current_user_id),
) -> GenerateQuizResponse:
    return await generate_quiz(user_id, body.gap_id)


@router.post("/quiz/submit", response_model=SubmitQuizResponse)
async def post_quiz_submit(
    body: SubmitQuizBody,
    user_id: str = Depends(get_current_user_id),
) -> SubmitQuizResponse:
    return await submit_quiz(user_id, body.gap_id, body.questions, body.answers)
