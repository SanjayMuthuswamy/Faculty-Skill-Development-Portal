# FSDP Error Status (Current)

Generated: March 7, 2026

This file replaces the old exploration dump with current verified status.

## 1. Validation Snapshot

### Frontend
- `npm run type-check` -> PASS
- `npm run build` -> PASS
- Note: Vite reports large bundle warning only (non-blocking).

### Backend
- `python -m py_compile ...` on edited files -> PASS
- `python -m pytest -q` -> EXIT 1 due warnings-only baseline (no test failures printed)

## 2. Critical/High Fixes Completed

- Login demo credentials aligned with backend in both login pages.
- Missing logger import fixed in `server/app/api/v1/routes/faculty.py`.
- Faculty-only route guard added for `/faculty/me*` self-service endpoints.
- Attempt ownership enforcement added for answer/finish/submit/get.
- Growth plan week/task ownership checks added.
- Admin no longer seeded with a faculty profile in DB init.
- Skill add flow made race-safe with `IntegrityError` handling.
- Duplicate skill attach returns clean 400 instead of generic 500.
- Enrollment endpoint now validates program existence/date-end window and duplicate enrollment.
- Program publish validation added for create/update.
- Program hard delete now blocked when enrollments exist.
- Program create now preserves intended HTTP 4xx errors (no accidental 500 wrap).
- Faculty skill update/remove now enforce ownership.
- Admin verify-skill now enforces `faculty_id + skill_id` match.
- Skill level schema validation enforced (`1..5`).
- AI question count is clamped (`1..10`) in admin generator.
- Frontend type blockers fixed (`vite-env`, forum type mismatch, bad import path, unused TS errors).

## 3. Remaining Errors/Warnings

### Backend warning baseline (causes `pytest -q` exit 1)
- Pytest collection warnings for ORM/schema classes named like tests:
  - `app/models/test.py`
  - `app/models/test_pack.py`
  - `app/models/test_question.py`
  - `app/services/test_service.py`
  - related schema classes in `app/schemas/test.py`
- Pydantic v2 deprecation warnings for class-based `Config`:
  - `app/schemas/question_pack.py`
  - `app/schemas/test.py`

## 4. Deferred (Not changed intentionally)

- Full soft-delete architecture for programs (`deleted_at` migration + query filtering).
- Pagination metadata redesign for list endpoints.
- Full login page consolidation to a single component.

These are larger behavior/design changes and were intentionally deferred to avoid unintended regressions.
