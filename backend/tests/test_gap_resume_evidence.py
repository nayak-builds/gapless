import unittest

from gap_service import partition_uncached_missing
from quote_verify import line_containing_skill, quote_is_in_resume


class QuoteVerifyTests(unittest.TestCase):
    resume = (
        "Shipped FastAPI services for a hiring-ops product.\n"
        "- Built OpenCV and PyTorch pipelines for computer vision on product photos.\n"
        "Used Sci-kit Learn for classification."
    )

    def test_line_containing_skill(self) -> None:
        line = line_containing_skill(self.resume, "Computer Vision")
        self.assertIsNotNone(line)
        assert line is not None
        self.assertIn("computer vision", line.casefold())
        self.assertTrue(quote_is_in_resume(line, self.resume))

    def test_kubernetes_not_in_resume(self) -> None:
        self.assertIsNone(line_containing_skill(self.resume, "Kubernetes"))

    def test_git_does_not_match_github(self) -> None:
        resume = "Maintained GitHub Actions workflows for CI."
        self.assertIsNone(line_containing_skill(resume, "Git"))
        self.assertIsNotNone(line_containing_skill(resume, "GitHub"))

    def test_go_does_not_match_going(self) -> None:
        resume = "Going deep on distributed systems."
        self.assertIsNone(line_containing_skill(resume, "Go"))


class PartitionCacheTests(unittest.TestCase):
    resume = (
        "Shipped FastAPI services.\n"
        "- Built OpenCV and PyTorch pipelines for computer vision on product photos."
    )

    def test_cheap_substring_promotes_without_cache(self) -> None:
        promoted, uncached = partition_uncached_missing(
            ["Computer Vision", "Kubernetes"],
            self.resume,
            {},
        )
        self.assertIn("Computer Vision", promoted)
        self.assertEqual(uncached, ["Kubernetes"])

    def test_negative_cache_skips_groq(self) -> None:
        promoted, uncached = partition_uncached_missing(
            ["Kubernetes"],
            self.resume,
            {"kubernetes": None},
        )
        self.assertEqual(promoted, {})
        self.assertEqual(uncached, [])

    def test_positive_cache_requires_real_quote(self) -> None:
        promoted, uncached = partition_uncached_missing(
            ["Computer Vision"],
            self.resume,
            {"computer vision": "Invented a fictional CV platform at scale."},
        )
        self.assertEqual(promoted, {})
        self.assertEqual(uncached, ["Computer Vision"])

    def test_positive_cache_keeps_verified_quote(self) -> None:
        quote = (
            "- Built OpenCV and PyTorch pipelines for computer vision on product photos."
        )
        promoted, uncached = partition_uncached_missing(
            ["Computer Vision"],
            self.resume,
            {"computer vision": quote},
        )
        self.assertEqual(promoted["Computer Vision"], quote)
        self.assertEqual(uncached, [])


if __name__ == "__main__":
    unittest.main()
