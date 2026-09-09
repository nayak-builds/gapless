import re


def normalize_quote_text(value: str) -> str:
    return " ".join(value.split()).casefold()


def quote_is_in_resume(quote: str, resume_text: str) -> bool:
    quote_norm = normalize_quote_text(quote)
    if not quote_norm:
        return False
    return quote_norm in normalize_quote_text(resume_text)


def skill_appears_in_text(skill: str, text: str) -> bool:
    """Cheap resume scan: phrases as substring; single tokens on word-ish bounds.

    Avoids treating GitHub as Git, or going as Go.
    """
    needle = normalize_quote_text(skill)
    hay = normalize_quote_text(text)
    if not needle:
        return False
    if " " in needle:
        return needle in hay
    pattern = r"(?<![a-z0-9+#.])" + re.escape(needle) + r"(?![a-z0-9+#.])"
    return re.search(pattern, hay) is not None


def line_containing_skill(resume_text: str, skill: str) -> str | None:
    if not skill_appears_in_text(skill, resume_text):
        return None
    for line in resume_text.splitlines():
        stripped = line.strip()
        if stripped and skill_appears_in_text(skill, stripped):
            if quote_is_in_resume(stripped, resume_text):
                return stripped
    return " ".join(skill.split())
