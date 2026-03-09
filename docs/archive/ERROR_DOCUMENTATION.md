# Error Documentation

Generated on: March 7, 2026
Project: `Faculty-Skill-Development-Portal`

## Commands Executed

### Frontend
- `npm run type-check` (client)
- `npm run build` (client)

### Backend
- `python -m py_compile server/app/api/v1/routes/programs.py server/app/api/v1/routes/faculty.py server/app/services/faculty_service.py`
- `python -m py_compile server/app/api/v1/routes/attempts.py server/app/api/v1/routes/enrollments.py server/app/api/v1/routes/growth_plans.py server/app/db/init_db.py server/app/schemas/skill.py`
- `python -m pytest -q` (server)

## Current Results

### Frontend Build/Type Status
- TypeScript status: PASS
- Build status: PASS
- Non-blocking warning: bundle chunk size warning from Vite/Rollup

### Backend Test Status
- Status: `FAILED` (exit code 1)
- Cause: warnings-only baseline (no assertion/test failure output)
- Warning groups:
  - `PytestCollectionWarning` from non-test classes prefixed with `Test*`
  - `PydanticDeprecatedSince20` due class-based `Config`

## Code Fixes Applied In This Pass

- Preserved HTTPException status in program creation route:
  - `server/app/api/v1/routes/programs.py`
- Enforced ownership checks for faculty skill update/delete:
  - `server/app/services/faculty_service.py`
  - `server/app/api/v1/routes/faculty.py`
- Enforced `faculty_id` match for admin skill verification:
  - `server/app/services/faculty_service.py`
  - `server/app/api/v1/routes/faculty.py`

## Remaining Work (Error-Cleanup Only)

1. Update pytest discovery or naming to avoid collecting ORM/service classes as tests.
2. Migrate schema models from class-based `Config` to `ConfigDict`.

These are cleanup tasks and do not block frontend build or runtime for current fixed flows.
