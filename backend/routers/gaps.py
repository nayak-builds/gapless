from fastapi import APIRouter, Depends

from auth import get_current_user_id
from gap_service import compute_gaps
from schemas import ComputeGapsBody, ComputeGapsResponse

router = APIRouter(tags=["gaps"])


@router.post("/gaps/compute", response_model=ComputeGapsResponse)
async def post_compute_gaps(
    body: ComputeGapsBody,
    user_id: str = Depends(get_current_user_id),
) -> ComputeGapsResponse:
    return await compute_gaps(user_id, body.jd_id)
