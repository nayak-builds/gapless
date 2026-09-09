"""Normalize and compare skill names for gap compute (stdlib only)."""

from __future__ import annotations

import re
from difflib import SequenceMatcher

# Whole tokens dropped after lowercasing (not substrings inside a word).
_SUFFIX_WORDS = frozenset(
    {
        "architecture",
        "design",
        "developer",
        "development",
        "engineer",
        "engineering",
        "experience",
        "fundamental",
        "fundamentals",
        "knowledge",
        "principle",
        "principles",
        "program",
        "programming",
        "skill",
        "skills",
    }
)

_MIN_SUBSTRING_LEN = 4
_SIMILARITY_THRESHOLD = 0.86


def normalize_tokens(name: str) -> list[str]:
    cleaned = re.sub(r"[^a-z0-9+#]+", " ", name.casefold())
    return [token for token in cleaned.split() if token and token not in _SUFFIX_WORDS]


def skills_match(required: str, owned: str) -> bool:
    """True when a JD-required skill and a user-owned skill refer to the same thing."""
    left = normalize_tokens(required)
    right = normalize_tokens(owned)
    if not left or not right:
        return False

    a = " ".join(left)
    b = " ".join(right)
    if a == b:
        return True

    if _phrase_contains(a, b) or _phrase_contains(b, a):
        return True

    if SequenceMatcher(None, a, b).ratio() >= _SIMILARITY_THRESHOLD:
        return True

    return _tokens_align(left, right)


def _phrase_contains(shorter: str, longer: str) -> bool:
    if len(shorter) < _MIN_SUBSTRING_LEN or shorter not in longer:
        return False
    remainder = longer.replace(shorter, "", 1).strip()
    if remainder == "":
        return True
    if remainder in {"s", "es"}:
        return True
    if remainder in _SUFFIX_WORDS:
        return True
    return False


def _tokens_align(left: list[str], right: list[str]) -> bool:
    shorter, longer = (left, right) if len(left) <= len(right) else (right, left)
    unused = list(longer)
    for token in shorter:
        idx = next((i for i, other in enumerate(unused) if _token_pair(token, other)), None)
        if idx is None:
            return False
        unused.pop(idx)
    return True


def _token_pair(a: str, b: str) -> bool:
    if a == b:
        return True
    if a + "s" == b or b + "s" == a:
        return True
    if a + "es" == b or b + "es" == a:
        return True
    return False
