"""One-off generator for a test resume PDF. Not used by the app."""

from __future__ import annotations

from pathlib import Path


def _esc(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _line(y: float, text: str, size: int = 10, leading: float = 13) -> tuple[str, float]:
    op = f"BT /F1 {size} Tf 54 {y:.1f} Td ({_esc(text)}) Tj ET\n"
    return op, y - leading


def build_pdf() -> bytes:
    y = 780.0
    stream = ""

    chunks: list[tuple[str, int, float]] = [
        ("Priya Nair", 18, 22),
        ("Bengaluru  |  priya.nair@email.com  |  +91 98765 43210", 10, 14),
        ("github.com/priyanair  |  linkedin.com/in/priyanair", 10, 20),
        ("SUMMARY", 12, 16),
        (
            "Backend-leaning full-stack engineer (3 years) building APIs and product dashboards",
            10,
            13,
        ),
        (
            "for Indian startups. Comfortable owning a feature from Postgres schema to React UI.",
            10,
            18,
        ),
        ("SKILLS", 12, 16),
        (
            "Languages: Python, TypeScript, SQL, JavaScript",
            10,
            13,
        ),
        (
            "Frameworks: FastAPI, React, Next.js, Node.js, LangChain",
            10,
            13,
        ),
        (
            "Data & infra: PostgreSQL, Redis, Docker, AWS (S3, EC2, RDS), GitHub Actions",
            10,
            13,
        ),
        (
            "Other: REST, JWT, pytest, Git, Tailwind CSS, Supabase",
            10,
            18,
        ),
        ("EXPERIENCE", 12, 16),
        ("Software Engineer  |  Nimbus Labs, Bengaluru  |  Jul 2024 - Present", 10, 13),
        (
            "- Shipped FastAPI services for a hiring-ops product; cut p95 latency 40% with Redis caching.",
            10,
            13,
        ),
        (
            "- Designed PostgreSQL schemas and RLS-style ownership checks for multi-tenant workspaces.",
            10,
            13,
        ),
        (
            "- Built a Next.js dashboard (TypeScript, Tailwind) for pipeline status and skill gaps.",
            10,
            13,
        ),
        (
            "- Added Groq-backed JD parsing behind the API; structured JSON validated with Pydantic.",
            10,
            18,
        ),
        ("SDE-1  |  KiteCart, Hyderabad  |  Jun 2023 - Jun 2024", 10, 13),
        (
            "- Owned checkout webhooks in Node.js; idempotent writes to PostgreSQL and S3 receipts.",
            10,
            13,
        ),
        (
            "- Wrote pytest + GitHub Actions CI; Dockerized local stack (API, Postgres, Redis).",
            10,
            13,
        ),
        (
            "- Partnered with frontend on React query hooks for order history and refunds.",
            10,
            18,
        ),
        ("PROJECTS", 12, 16),
        ("Campus Placement Tracker (personal)", 10, 13),
        (
            "- Next.js + FastAPI app to track applications; JWT auth via Supabase; Kanban in React.",
            10,
            13,
        ),
        (
            "- Notes upload with pypdf text extract; embeddings stored in pgvector for search.",
            10,
            18,
        ),
        ("EDUCATION", 12, 16),
        ("B.E. Computer Science  |  PES University, Bengaluru  |  2019 - 2023", 10, 13),
        ("CGPA 8.4  |  Coursework: DBMS, OS, networks, machine learning", 10, 14),
    ]

    for text, size, leading in chunks:
        op, y = _line(y, text, size=size, leading=leading)
        stream += op

    content = stream.encode("latin-1", errors="replace")
    stream_obj = (
        f"<< /Length {len(content)} >>\nstream\n".encode("ascii")
        + content
        + b"\nendstream"
    )

    objects: list[bytes] = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        (
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>"
        ),
        stream_obj,
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out.extend(f"{i} 0 obj\n".encode("ascii"))
        out.extend(obj)
        out.extend(b"\nendobj\n")

    xref_pos = len(out)
    out.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    out.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        out.extend(f"{off:010d} 00000 n \n".encode("ascii"))
    out.extend(
        (
            f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_pos}\n%%EOF\n"
        ).encode("ascii")
    )
    return bytes(out)


def main() -> None:
    dest = Path(__file__).resolve().parent / "sample-resume-priya-nair.pdf"
    dest.write_bytes(build_pdf())
    print(dest)


if __name__ == "__main__":
    main()
