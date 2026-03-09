from __future__ import annotations

import ast
import json
from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle, PageBreak

ROOT = Path(__file__).resolve().parents[1]
API_ROOT = ROOT / "server" / "app" / "api" / "v1"
ROUTES_DIR = API_ROOT / "routes"
OUTPUT_DIR = ROOT / "docs" / "final_viva"


@dataclass
class Endpoint:
    tag: str
    method: str
    path: str
    source: str


def normalize_path(*parts: str) -> str:
    out = "/".join(p.strip("/") for p in parts if p is not None)
    out = "/" + out.strip("/")
    return out if out != "" else "/"


def parse_router_prefixes() -> dict[str, str]:
    api_file = API_ROOT / "api.py"
    tree = ast.parse(api_file.read_text(encoding="utf-8"))
    prefixes: dict[str, str] = {}

    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        if not isinstance(node.func, ast.Attribute) or node.func.attr != "include_router":
            continue

        module_name = None
        if node.args:
            first_arg = node.args[0]
            if isinstance(first_arg, ast.Attribute) and isinstance(first_arg.value, ast.Name):
                module_name = first_arg.value.id

        prefix = ""
        for kw in node.keywords:
            if kw.arg == "prefix" and isinstance(kw.value, ast.Constant) and isinstance(kw.value.value, str):
                prefix = kw.value.value

        if module_name:
            prefixes[module_name] = prefix

    return prefixes


def parse_endpoints(prefixes: dict[str, str]) -> list[Endpoint]:
    endpoints: list[Endpoint] = []

    for route_file in sorted(ROUTES_DIR.glob("*.py")):
        if route_file.name == "__init__.py":
            continue

        module = route_file.stem
        prefix = prefixes.get(module, "")
        tree = ast.parse(route_file.read_text(encoding="utf-8"))

        for node in tree.body:
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue

            for dec in node.decorator_list:
                if not isinstance(dec, ast.Call):
                    continue
                if not isinstance(dec.func, ast.Attribute):
                    continue
                if not isinstance(dec.func.value, ast.Name) or dec.func.value.id != "router":
                    continue

                method = dec.func.attr.upper()
                if method not in {"GET", "POST", "PUT", "PATCH", "DELETE"}:
                    continue

                relative = ""
                if dec.args and isinstance(dec.args[0], ast.Constant) and isinstance(dec.args[0].value, str):
                    relative = dec.args[0].value

                full_path = normalize_path("api/v1", prefix, relative)
                endpoints.append(
                    Endpoint(
                        tag=module.replace("_", "-"),
                        method=method,
                        path=full_path,
                        source=str(route_file.relative_to(ROOT)).replace("\\", "/"),
                    )
                )

    endpoints.sort(key=lambda e: (e.tag, e.path, e.method))
    return endpoints


def build_postman(endpoints: list[Endpoint]) -> dict:
    grouped: dict[str, list[Endpoint]] = defaultdict(list)
    for e in endpoints:
        grouped[e.tag].append(e)

    folders = []
    for tag in sorted(grouped):
        items = []
        for e in grouped[tag]:
            segments = [seg for seg in e.path.split("/") if seg]
            items.append(
                {
                    "name": f"{e.method} {e.path}",
                    "request": {
                        "method": e.method,
                        "header": [
                            {"key": "Authorization", "value": "Bearer {{access_token}}", "type": "text"}
                        ] if tag not in {"auth", "health"} else [],
                        "url": {
                            "raw": "{{baseUrl}}" + e.path,
                            "host": ["{{baseUrl}}"],
                            "path": segments,
                        },
                    },
                }
            )
        folders.append({"name": tag, "item": items})

    return {
        "info": {
            "name": "Faculty Skill Development Portal API",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
            "description": "Auto-generated from FastAPI route source files.",
        },
        "item": folders,
        "variable": [
            {"key": "baseUrl", "value": "http://localhost:8000"},
            {"key": "access_token", "value": ""},
        ],
    }


def make_styles():
    regular_font = "Times-Roman"
    bold_font = "Times-Bold"
    tnr_regular = Path("C:/Windows/Fonts/times.ttf")
    tnr_bold = Path("C:/Windows/Fonts/timesbd.ttf")
    if tnr_regular.exists() and tnr_bold.exists():
        pdfmetrics.registerFont(TTFont("TimesNewRoman", str(tnr_regular)))
        pdfmetrics.registerFont(TTFont("TimesNewRoman-Bold", str(tnr_bold)))
        regular_font = "TimesNewRoman"
        bold_font = "TimesNewRoman-Bold"

    styles = getSampleStyleSheet()
    body = ParagraphStyle(
        "BodyTNR",
        parent=styles["Normal"],
        fontName=regular_font,
        fontSize=11,
        leading=16,
        spaceAfter=8,
    )
    h1 = ParagraphStyle(
        "H1TNR",
        parent=styles["Heading1"],
        fontName=bold_font,
        fontSize=18,
        leading=24,
        spaceBefore=14,
        spaceAfter=10,
    )
    h2 = ParagraphStyle(
        "H2TNR",
        parent=styles["Heading2"],
        fontName=bold_font,
        fontSize=14,
        leading=19,
        spaceBefore=12,
        spaceAfter=8,
    )
    h3 = ParagraphStyle(
        "H3TNR",
        parent=styles["Heading3"],
        fontName=bold_font,
        fontSize=12,
        leading=16,
        spaceBefore=8,
        spaceAfter=6,
    )
    small = ParagraphStyle(
        "SmallTNR",
        parent=body,
        fontSize=10,
        leading=14,
    )
    return body, h1, h2, h3, small, regular_font, bold_font


def bullet(lines: list[str], style: ParagraphStyle) -> list[Paragraph]:
    return [Paragraph(f"- {line}", style) for line in lines]


def build_pdf(endpoints: list[Endpoint], out_pdf: Path) -> None:
    body, h1, h2, h3, small, regular_font, bold_font = make_styles()
    doc = SimpleDocTemplate(
        str(out_pdf),
        pagesize=A4,
        rightMargin=0.9 * inch,
        leftMargin=0.9 * inch,
        topMargin=0.9 * inch,
        bottomMargin=0.9 * inch,
        title="Faculty Skill Development Portal - Project Report and Viva Guide",
        author="Project Team",
    )

    tag_counts: dict[str, int] = defaultdict(int)
    for e in endpoints:
        tag_counts[e.tag] += 1

    story = []
    today = date.today().strftime("%d %B %Y")

    story.append(Paragraph("Faculty Skill Development Portal", h1))
    story.append(Paragraph("Comprehensive Project Report, API Documentation, and Viva Preparation Guide", h2))
    story.append(Spacer(1, 10))
    story.append(Paragraph(f"Date: {today}", body))
    story.append(Paragraph("Document Type: Final Viva Submission", body))
    story.append(Spacer(1, 14))
    story.append(Paragraph("Executive Summary", h2))
    story.append(
        Paragraph(
            "This project delivers a full-stack Faculty Skill Development Portal that enables administrators to manage learning assets and monitor outcomes while faculty users plan skills, take assessments, enroll in programs/courses, and track growth progress.",
            body,
        )
    )
    story.extend(
        bullet(
            [
                "Backend: FastAPI with role-based authorization, JWT tokens, and SQLAlchemy data layer.",
                "Frontend: React + TypeScript with dashboard workflows for Admin and Faculty roles.",
                "Database: PostgreSQL schema managed using Alembic migrations.",
                f"API Scope: {len(endpoints)} REST operations across {len(tag_counts)} route modules.",
            ],
            body,
        )
    )

    story.append(Paragraph("Project Objectives", h2))
    story.extend(
        bullet(
            [
                "Digitize and centralize faculty upskilling workflows.",
                "Provide role-specific experiences (Admin vs Faculty).",
                "Integrate AI features for question generation and coaching.",
                "Enable measurable progress through analytics and structured learning paths.",
            ],
            body,
        )
    )

    story.append(Paragraph("Technology Stack", h2))
    tech_rows = [
        ["Layer", "Technologies"],
        ["Frontend", "React 18, TypeScript, Vite, Tailwind CSS, TanStack Query"],
        ["Backend", "FastAPI, Pydantic, SQLAlchemy, Alembic, JWT Auth"],
        ["Database", "PostgreSQL"],
        ["Tooling", "Docker Compose, npm, Python virtual environment"],
    ]
    tech_tbl = Table(tech_rows, colWidths=[1.5 * inch, 4.6 * inch])
    tech_tbl.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), bold_font),
                ("FONTNAME", (0, 1), (-1, -1), regular_font),
                ("FONTSIZE", (0, 0), (-1, -1), 10.5),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(tech_tbl)
    story.append(Spacer(1, 10))

    story.append(Paragraph("High-Level Architecture", h2))
    story.extend(
        bullet(
            [
                "Client UI issues authenticated REST calls through API wrappers.",
                "FastAPI routers route requests to service-layer business logic.",
                "Services use SQLAlchemy models for persistence and query operations.",
                "RBAC checks are enforced via dependencies and token-derived role context.",
                "AI integrations support coaching and draft question generation features.",
            ],
            body,
        )
    )

    story.append(Paragraph("Major Functional Modules", h2))
    story.extend(
        bullet(
            [
                "Authentication and session identity (`auth`).",
                "Faculty profile, skill tracking, and personalized news (`faculty`).",
                "Programs, enrollments, tests, attempts, and practice sets.",
                "Growth plans and roadmaps for structured learning progression.",
                "Courses with modules, quizzes, assessments, and completion tracking.",
                "Discussion/query management and analytics reporting for admins.",
            ],
            body,
        )
    )

    story.append(PageBreak())
    story.append(Paragraph("API Documentation", h1))
    story.append(
        Paragraph(
            "Swagger is available at `http://localhost:8000/docs` when the backend runs. The table below is generated from route source files and can be imported into Postman using the attached collection JSON.",
            body,
        )
    )

    api_rows = [["Module (Tag)", "Operation Count"]]
    for tag in sorted(tag_counts):
        api_rows.append([tag, str(tag_counts[tag])])

    api_tbl = Table(api_rows, colWidths=[4.8 * inch, 1.3 * inch])
    api_tbl.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), bold_font),
                ("FONTNAME", (0, 1), (-1, -1), regular_font),
                ("FONTSIZE", (0, 0), (-1, -1), 10.5),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ALIGN", (1, 1), (1, -1), "CENTER"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(api_tbl)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Authentication Flow (Viva Ready)", h2))
    story.extend(
        bullet(
            [
                "`POST /api/v1/auth/login` validates credentials and issues JWT access/refresh tokens.",
                "Client stores token and sends `Authorization: Bearer <token>` for protected endpoints.",
                "Protected dependencies read claims and enforce role checks for ADMIN/FACULTY operations.",
                "`GET /api/v1/auth/me` returns logged-in user profile for session bootstrap.",
            ],
            body,
        )
    )

    story.append(Paragraph("Viva Explanation Script", h2))
    story.append(Paragraph("Suggested 6-8 minute sequence:", body))
    story.extend(
        bullet(
            [
                "State problem and target users: faculty and institute administrators.",
                "Explain architecture: React frontend, FastAPI backend, PostgreSQL persistence.",
                "Show RBAC and JWT flow, then demonstrate protected API call behavior.",
                "Walk through one core journey: faculty login -> enroll -> complete assessment -> view analytics.",
                "Present AI-enhanced modules (AI coach and AI question generation) as productivity features.",
                "Close with testing, scalability, and future enhancements.",
            ],
            body,
        )
    )

    story.append(Paragraph("Common Viva Questions with Answers", h2))
    qa = [
        ("Why FastAPI?", "FastAPI gives fast async performance, native OpenAPI docs, and strict Pydantic validation for reliable APIs."),
        ("How is security handled?", "Password hashing plus JWT-based auth and role-checked dependencies control access."),
        ("How do you maintain schema changes?", "Alembic migration scripts version-control database changes."),
        ("How can this scale?", "Stateless APIs can scale horizontally behind a load balancer; PostgreSQL can be optimized with indexing and read replicas."),
        ("What is the project impact?", "It centralizes faculty development tracking and gives measurable skill progression through structured workflows."),
    ]
    for q, a in qa:
        story.append(Paragraph(f"Q: {q}", h3))
        story.append(Paragraph(f"A: {a}", body))

    story.append(PageBreak())
    story.append(Paragraph("Appendix A: Endpoint Inventory", h1))
    story.append(Paragraph("Generated from `server/app/api/v1/routes` decorators.", small))

    for tag in sorted(tag_counts):
        story.append(Paragraph(tag, h2))
        tag_rows = [["Method", "Path", "Source"]]
        for e in [x for x in endpoints if x.tag == tag]:
            tag_rows.append([e.method, e.path, e.source])
        tbl = Table(tag_rows, colWidths=[0.85 * inch, 3.05 * inch, 2.2 * inch], repeatRows=1)
        tbl.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (-1, 0), bold_font),
                    ("FONTNAME", (0, 1), (-1, -1), regular_font),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f6f6f6")),
                    ("GRID", (0, 0), (-1, -1), 0.35, colors.grey),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ]
            )
        )
        story.append(tbl)
        story.append(Spacer(1, 8))

    doc.build(story)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    prefixes = parse_router_prefixes()
    endpoints = parse_endpoints(prefixes)

    collection = build_postman(endpoints)
    collection_path = OUTPUT_DIR / "FSDP_API_Postman_Collection.json"
    collection_path.write_text(json.dumps(collection, indent=2), encoding="utf-8")

    pdf_path = OUTPUT_DIR / "Faculty_Skill_Development_Portal_Report_and_Viva.pdf"
    build_pdf(endpoints, pdf_path)

    summary_path = OUTPUT_DIR / "README.txt"
    summary_path.write_text(
        "Generated deliverables:\n"
        "1. Faculty_Skill_Development_Portal_Report_and_Viva.pdf\n"
        "2. FSDP_API_Postman_Collection.json\n"
        "\nOpen API docs via Swagger at: http://localhost:8000/docs (when backend is running).\n",
        encoding="utf-8",
    )

    print(f"Created: {pdf_path}")
    print(f"Created: {collection_path}")


if __name__ == "__main__":
    main()
