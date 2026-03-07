# Error Documentation

Generated on: March 7, 2026
Project: `Faculty-Skill-Development-Portal`

## 1. Scan Commands Run

### Frontend
- `npm run type-check` (client)
- `npm run build` (client)

### Backend
- `python -m pytest -q` (server)

### Backend static tooling (attempted)
- `python -m ruff check app` -> failed (`No module named ruff`)
- `python -m mypy app` -> failed (`No module named mypy`)
- `server\venv\Scripts\python.exe -m ruff check app` -> failed (`No module named ruff`)
- `server\venv\Scripts\python.exe -m mypy app` -> failed (`No module named mypy`)

## 2. Frontend TypeScript Errors (Blocking Build)

Status: `FAILED`
Total errors reported: 25

### A) Unused imports/variables (TS6133 / TS6192 / TS6196)
- `src/app/providers/QueryProvider.tsx:1` - `React` imported but unused.
- `src/components/AICoachChat.tsx:45` - `variables` declared but unused.
- `src/components/ui/Button.tsx:1` - `React` imported but unused.
- `src/components/ui/Input.tsx:1` - `React` imported but unused.
- `src/components/ui/Modal.tsx:16` - `overlayRef` declared but unused.
- `src/lib/api/auth.ts:4` - `LoginRequest` declared but unused.
- `src/lib/api/mockApi.ts:777` - `facultySkills` declared but unused.
- `src/lib/storage/index.ts:1` - `PracticeQuestion` imported/declared but unused.
- `src/pages/faculty/CourseAssessment.tsx:107` - `setAnswers` declared but unused.
- `src/pages/faculty/FacultyDashboard.tsx:1` - `React` imported but unused.
- `src/pages/faculty/Profile.tsx:20` - `Calendar` imported but unused.
- `src/pages/faculty/Profile.tsx:25` - `AlertCircle` imported but unused.
- `src/pages/faculty/Profile.tsx:30` - `Download` imported but unused.
- `src/pages/faculty/Profile.tsx:35` - `ChevronRight` imported but unused.
- `src/pages/faculty/Profile.tsx:36` - `TrendingUp` imported but unused.
- `src/pages/faculty/ProgramDetails.tsx:1` - all imports unused.
- `src/pages/faculty/ProgramDetails.tsx:8` - `CardFooter` imported but unused.
- `src/pages/faculty/Tests.tsx:12` - `ArrowRight` imported but unused.

### B) Missing types/module issues
- `src/lib/api/http.ts:4` - `TS2339`: `import.meta.env` missing typing on `ImportMeta`.
- `src/pages/faculty/Profile.tsx:39` - `TS2307`: cannot find module `../../types`.

### C) Forum type contract mismatch
- `src/pages/faculty/Forum.tsx:55` - `TS2339`: `Discussion` has no `replies`.
- `src/pages/faculty/Forum.tsx:57` - `TS2339`: `Discussion` has no `replies`.
- `src/pages/faculty/Forum.tsx:58` - `TS2339`: `Discussion` has no `replies`.
- `src/pages/faculty/Forum.tsx:58` - `TS7006`: `reply` has implicit `any`.
- `src/pages/faculty/Forum.tsx:210` - `TS2345`: `Discussion` not assignable to `DiscussionDetail` (missing `replies`).

## 3. Frontend Build Status

Status: `FAILED`

Reason: TypeScript stage (`tsc -b`) fails with the same 25 errors above, so Vite build does not proceed.

## 4. Backend Test Status

Command: `python -m pytest -q`
Status: `FAILED` (exit code 1)

Observed output:
- No test failures were reported.
- 11 warnings were reported.
- Runtime line: `11 warnings in 6.79s`

### Backend warning inventory
- `PytestCollectionWarning`: classes named like tests but not test classes (have `__init__`), e.g.:
  - `app/models/test_pack.py:9`
  - `app/models/test_question.py:7`
  - `app/models/test.py:13`
  - `app/services/test_service.py:16`
  - plus related schema classes in `app/schemas/test.py`
- `PydanticDeprecatedSince20`: class-based `Config` usage deprecated:
  - `app/schemas/question_pack.py:34`
  - `app/schemas/question_pack.py:62`
  - `app/schemas/test.py:34`

## 5. Priority Fix Order (Recommended)

1. Fix contract/type blockers:
   - `src/lib/api/http.ts` (`import.meta.env` typing)
   - `src/pages/faculty/Profile.tsx` missing module `../../types`
   - `src/pages/faculty/Forum.tsx` discussion/replies type mismatch
2. Remove/resolve unused imports and variables across frontend files.
3. Re-run `npm run type-check` and `npm run build`.
4. Clean backend warnings:
   - rename non-test classes or adjust pytest discovery scope
   - migrate Pydantic class-based `Config` to `ConfigDict`
5. Add/install backend static tooling (`ruff`, `mypy`) and run checks.

## 6. Notes

- This document captures the current repository state only.
- Error counts can change immediately after any edit.
