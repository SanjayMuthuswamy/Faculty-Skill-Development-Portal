#!/usr/bin/env python3
"""
Clean placeholder catalog data and normalize to meaningful course/test records.

Run from the `server` directory:
    python ../maintenance_scripts/clean_catalog_data.py
"""

import asyncio
import os
import re
import sys
from typing import Dict, List, Tuple

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Ensure `server/app` imports work whether this script is run from project root or server dir.
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SERVER_DIR = os.path.join(PROJECT_ROOT, "server")
if SERVER_DIR not in sys.path:
    sys.path.append(SERVER_DIR)

from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.course import Course
from app.models.question_pack import QuestionPack
from app.models.test import Test
from app.models.test_pack import TestPack


JUNK_TITLE_RE = re.compile(
    r"^\s*(abc|efr|test\s*-?\s*\d+|dummy.*|sample.*|asdf|qwerty)\s*$",
    re.IGNORECASE,
)

# Meaningful exact title replacements commonly found in ad-hoc test data.
EXACT_TEST_TITLE_RENAMES: Dict[str, str] = {
    "AI Proficiency Test": "Artificial Intelligence Foundations Certification Test",
    "Test -1": "Database Normalization and BCNF Assessment - Core",
    "Test 1": "Database Normalization and BCNF Assessment - Fundamentals",
    "BCNF": "Database Normalization and BCNF Assessment",
    "efr": "Relational Schema Design and BCNF Assessment",
    "Cloud Computing test": "Cloud Computing Foundations Certification Test",
}

COURSE_FALLBACKS = [
    "Applied AI in Higher Education",
    "Cloud and Distributed Systems for Faculty",
    "Data Analytics for Academic Decision Making",
    "Research Methodology and Evidence Synthesis",
    "Modern Pedagogy and Assessment Design",
]


def _build_pack_description(pack: QuestionPack, question_count: int) -> str:
    name = (pack.pack_name or "Question Pack").strip()
    lower_name = name.lower()
    domain = (pack.domain or "General").strip()
    difficulty = (pack.difficulty or "MEDIUM").strip().capitalize()
    topic = (pack.topic or "").strip()

    if "ai fundamentals" in lower_name:
        return (
            "Foundational AI MCQ pack for faculty, covering core terminology, "
            "machine learning basics, and classroom-oriented AI applications."
        )
    if "cloud" in lower_name:
        return (
            "Cloud computing MCQ pack focused on service models, deployment patterns, "
            "and practical infrastructure decisions."
        )
    if "bcnf" in lower_name or "normalisation" in lower_name or "normalization" in lower_name:
        return (
            "Database normalization and BCNF MCQ pack designed to strengthen schema design, "
            "functional dependency analysis, and normalization workflows."
        )
    if "dbms" in lower_name:
        return (
            "DBMS fundamentals MCQ pack covering relational concepts, keys, dependencies, "
            "and normalization principles."
        )

    topic_phrase = f" with emphasis on {topic}" if topic else ""
    return (
        f"{name} is a {difficulty} level MCQ pack in {domain}{topic_phrase}. "
        f"It currently contains {question_count} question(s) for structured practice."
    )


def _infer_test_profile(pack_names: List[str]) -> Tuple[str, str, str, str]:
    lower = [p.lower() for p in pack_names]

    if any("ai fundamentals" in p or "artificial intelligence" in p for p in lower):
        return (
            "Artificial Intelligence Foundations Certification Test",
            "Official assessment on AI fundamentals, terminology, and education-focused applications.",
            "Artificial Intelligence",
            "BEGINNER",
        )

    if any("cloud" in p for p in lower):
        return (
            "Cloud Computing Foundations Certification Test",
            "Official assessment covering cloud service models, deployment patterns, and practical cloud usage.",
            "Cloud Computing",
            "INTERMEDIATE",
        )

    if any("normal" in p or "bcnf" in p or "dbms" in p for p in lower):
        return (
            "Database Normalization and BCNF Assessment",
            "Official assessment on normalization principles, BCNF rules, and relational schema design.",
            "Technology",
            "INTERMEDIATE",
        )

    return (
        "Professional Competency Assessment",
        "Official assessment aligned with the selected question pack topics.",
        "Technology",
        "INTERMEDIATE",
    )


def _title_needs_cleanup(title: str) -> bool:
    if not title:
        return True
    if JUNK_TITLE_RE.match(title):
        return True
    if title.strip().lower() in {"bcnf", "dbms", "test"}:
        return True
    return False


def _make_unique_title(base: str, used_titles: set[str]) -> str:
    title = base
    idx = 2
    while title in used_titles:
        title = f"{base} ({idx})"
        idx += 1
    used_titles.add(title)
    return title


async def clean_catalog_data() -> None:
    print("Catalog cleanup started")
    print(f"Database: {settings.DATABASE_URL}")

    async with SessionLocal() as session:
        # Load courses and tests
        course_res = await session.execute(select(Course))
        courses = course_res.scalars().all()

        pack_res = await session.execute(select(QuestionPack).options(selectinload(QuestionPack.questions)))
        packs = pack_res.scalars().all()

        test_res = await session.execute(
            select(Test).options(
                selectinload(Test.pack_links).selectinload(TestPack.pack)
            )
        )
        tests = test_res.scalars().all()

        # Ensure every question pack has a meaningful description.
        updated_packs = 0
        for pack in packs:
            q_count = len(pack.questions or [])
            current_desc = (pack.description or "").strip()
            if len(current_desc) >= 30 and "sample" not in current_desc.lower():
                continue
            pack.description = _build_pack_description(pack, q_count)
            updated_packs += 1

        # Clean course titles/descriptions if placeholders exist.
        updated_courses = 0
        course_idx = 0
        for course in courses:
            changed = False
            if _title_needs_cleanup(course.title):
                course.title = COURSE_FALLBACKS[course_idx % len(COURSE_FALLBACKS)]
                course_idx += 1
                changed = True

            if not course.description or len(course.description.strip()) < 20:
                course.description = (
                    "Structured faculty development course with practical modules, "
                    "knowledge checks, and measurable learning outcomes."
                )
                changed = True

            if changed:
                updated_courses += 1

        # Build title uniqueness set for tests.
        existing_titles = {t.title.strip() for t in tests if t.title}
        updated_tests = 0

        for test in tests:
            changed = False
            old_title = (test.title or "").strip()
            normalized_old = old_title

            pack_names = [
                link.pack.pack_name
                for link in test.pack_links
                if link.pack and link.pack.pack_name
            ]
            inferred_title, inferred_desc, inferred_domain, inferred_difficulty = _infer_test_profile(pack_names)

            # Fix invalid pass marks and short timers.
            if test.pass_marks is None or test.pass_marks < 40 or test.pass_marks > 90:
                test.pass_marks = 60
                changed = True

            if test.time_limit_minutes is None or test.time_limit_minutes < 15:
                # 2 min per question with sane bounds.
                q_count = max(1, test.total_questions or 1)
                test.time_limit_minutes = max(20, min(45, q_count * 2))
                changed = True

            # Keep a clean domain/difficulty consistent with topic.
            if not test.domain or _title_needs_cleanup(old_title):
                test.domain = inferred_domain
                changed = True

            if not test.difficulty or _title_needs_cleanup(old_title):
                test.difficulty = inferred_difficulty
                changed = True

            if not test.description or len(test.description.strip()) < 25:
                test.description = inferred_desc
                changed = True

            # Replace placeholder titles or known low-quality names.
            base_title = EXACT_TEST_TITLE_RENAMES.get(normalized_old, "")
            if not base_title and _title_needs_cleanup(old_title):
                base_title = inferred_title
            elif normalized_old in EXACT_TEST_TITLE_RENAMES:
                base_title = EXACT_TEST_TITLE_RENAMES[normalized_old]

            if base_title:
                existing_titles.discard(old_title)
                test.title = _make_unique_title(base_title, existing_titles)
                changed = True

            if changed:
                updated_tests += 1

        await session.commit()

    print(f"Updated question packs: {updated_packs}")
    print(f"Updated courses: {updated_courses}")
    print(f"Updated tests: {updated_tests}")
    print("Catalog cleanup completed")


if __name__ == "__main__":
    asyncio.run(clean_catalog_data())
