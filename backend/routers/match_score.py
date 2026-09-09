from fastapi import APIRouter, Depends

from auth import get_current_user_id
from match_score_service import compute_match_score
from schemas import MatchScoreBody, MatchScoreResponse

router = APIRouter(tags=["match-score"])


@router.post("/match-score", response_model=MatchScoreResponse)
async def post_match_score(
    body: MatchScoreBody,
    user_id: str = Depends(get_current_user_id),
) -> MatchScoreResponse:
    return await compute_match_score(user_id, body.jd_id)
