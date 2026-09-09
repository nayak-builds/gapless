import unittest

from match_score_service import (
    GapSkillRow,
    compute_weighted_score,
    filter_verified_suggestions,
)
from schemas import MatchRewriteItem


class WeightedScoreTests(unittest.TestCase):
    def test_required_and_nice_to_have_weights(self) -> None:
        rows = [
            GapSkillRow("Python", "none", "required", True),
            GapSkillRow("FastAPI", "none", "required", True),
            GapSkillRow("Kubernetes", "required", "required", False),
            GapSkillRow("Redis", "none", "nice-to-have", True),
            GapSkillRow("Docker", "none", "nice-to-have", True),
            GapSkillRow("Terraform", "nice-to-have", "nice-to-have", False),
        ]
        score, matched_count, total_count = compute_weighted_score(rows)
        # (2*1 + 2*0.5) / (3*1 + 3*0.5) * 100 = 3 / 4.5 * 100 = 67
        self.assertEqual(score, 67)
        self.assertEqual(matched_count, 4)
        self.assertEqual(total_count, 6)

    def test_all_matched_is_100(self) -> None:
        rows = [
            GapSkillRow("Python", "none", "required", True),
            GapSkillRow("Redis", "none", "nice-to-have", True),
        ]
        score, matched_count, total_count = compute_weighted_score(rows)
        self.assertEqual(score, 100)
        self.assertEqual(matched_count, 2)
        self.assertEqual(total_count, 2)


class QuoteVerificationTests(unittest.TestCase):
    resume = (
        "Shipped FastAPI services for a hiring-ops product; "
        "cut p95 latency 40% with Redis caching."
    )

    def test_keeps_verbatim_substring(self) -> None:
        items = [
            MatchRewriteItem(
                skill="Redis",
                original_quote=self.resume,
                suggested_rewrite="... with Redis caching and in-memory cache.",
            )
        ]
        result = filter_verified_suggestions(items, f"- {self.resume}\n")
        self.assertEqual(result.dropped_hallucinated, 0)
        self.assertEqual(len(result.kept), 1)
        self.assertEqual(result.kept[0].original_quote, self.resume)

    def test_drops_paraphrased_hallucination(self) -> None:
        items = [
            MatchRewriteItem(
                skill="Redis",
                original_quote="Implemented a custom in-memory cache layer at scale.",
                suggested_rewrite="Implemented Redis as an in-memory cache layer at scale.",
            )
        ]
        result = filter_verified_suggestions(items, self.resume)
        self.assertEqual(result.dropped_hallucinated, 1)
        self.assertEqual(result.kept, [])
        self.assertEqual(result.dropped_skill_names, ["Redis"])

    def test_omits_null_quotes(self) -> None:
        items = [
            MatchRewriteItem(
                skill="Kubernetes",
                original_quote=None,
                suggested_rewrite=None,
            )
        ]
        result = filter_verified_suggestions(items, self.resume)
        self.assertEqual(result.dropped_unrelated_or_null, 1)
        self.assertEqual(result.dropped_hallucinated, 0)
        self.assertEqual(result.kept, [])


if __name__ == "__main__":
    unittest.main()
