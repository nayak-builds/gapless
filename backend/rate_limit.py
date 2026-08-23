import time
from collections import defaultdict, deque

from fastapi import HTTPException

from config import get_settings

_hits: dict[str, deque[float]] = defaultdict(deque)


def enforce_llm_rate_limit(user_id: str) -> None:
    limit = get_settings().llm_rate_limit_per_minute
    now = time.monotonic()
    window = 60.0
    bucket = _hits[user_id]
    while bucket and now - bucket[0] > window:
        bucket.popleft()
    if len(bucket) >= limit:
        raise HTTPException(
            status_code=429,
            detail="Too many analyses. Wait a minute and try again.",
        )
    bucket.append(now)
