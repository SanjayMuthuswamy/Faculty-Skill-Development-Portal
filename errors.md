# FSDP Project Exploration - Issues Found

## Overview
Faculty Skill Development Portal - Full-stack FastAPI + React application for faculty skill development tracking and management with role-based access control (ADMIN, FACULTY).

## Key Findings Summary

### 1. **ENROLLMENT LOGIC BUG - CRITICAL**
- **Location**: `server/app/api/v1/routes/enrollments.py`
- **Issue**: `get_my_enrollments()` requires faculty_profile, but ADMIN users don't have one
- **Impact**: Admins trying to fetch enrollments will get 400 error with "User has no faculty profile"
- **Also affects**: `enroll_in_program()` for same reason
- **Fix**: Check if user is ADMIN, skip faculty_profile check or handle appropriately

### 2. **PROGRAM SCHEMA MISMATCH**
- **Location**: `server/app/schemas/program.py` vs `test_create_program.py`
- **Issue**: Schema expects `domain: SkillDomain` but test sends `"domain": "Technology"`
- **Problem**: SkillDomain values are Enum with displaynames like "Technology", "Cloud Computing" not YAML-friendly enum names
- **Test shows**: Accepts "Technology" but might fail validation if strict

### 3. **ROLE-TO-VALUE MAPPING INCONSISTENCY**
- **Location**: `server/app/api/v1/deps.py` - require_role() function
- **Issue**: Has normalization code handling both StrEnum and plain strings - suggests past serialization issues
- **Risk**: UserRole might serialize to different formats causing RBAC checks to fail sporadically

### 4. **FACULTY PROFILE LAZY-LOADING ISSUE**
- **Location**: `server/app/api/v1/deps.py:get_current_user()`
- **Issue**: Has hacky "failsafe" code to manually load faculty_profile if not eagerly loaded
- **Problem**: Lazy loading in async context causes "MissingGreenlet" errors
- **Also seen**: Comments in `programs.py` about "Re-fetch with enrollments eagerly loaded to prevent MissingGreenlet"
- **Pattern**: Across multiple routes - selectinload() used everywhere as workaround

### 5. **ADMIN USER SETUP ISSUES**
- **Location**: `server/app/db/init_db.py` + multiple diagnostic scripts
- **Maintenance scripts**:
  - `fix_admin.py` - resets all admin passwords (suggests lockout issues)
  - `reproduce_403.py` - explicit test for 403 forbidden errors
  - `deep_debug_login.py` - debugging login/auth issues
  - `list_admins.py` - checking if admins exist (suggests they go missing)
- **Initial creds**: `admin@fsdp.com` / `Admin@123` but QUICKSTART mentions `sanjay@fsdp.com` / `123456`
- **Issue**: Multiple credential sets mentioned, unclear which is correct

### 6. **DATABASE INITIALIZATION RACE CONDITIONS**
- **Location**: `server/app/db/init_db.py`
- **Issue**: Creates skill records inside init, but no uniqueness enforcement on first run
- **Could cause**: Duplicate skills if init runs multiple times
- **Also**: FacultyProfile created only for faculty user, not admin

### 7. **FRONTEND AUTH TOKEN HANDLING**
- **Location**: `client/src/app/providers/AuthProvider.tsx`
- **Pattern**: Has special logic to detect role switching without logout (security concern)
- **Issue**: If cached role doesn't match server role, silently clears session and logs user out
- **Could cause**: Confusion in multi-admin scenarios

### 8. **PROGRAM CREATION VALIDATION MISSING**
- **Location**: `server/app/api/v1/routes/programs.py`
- **Issue**: Schema has optional fields but validation doesn't ensure domain is valid SkillDomain
- **Risk**: Frontend sends "Technology" string, backend accepts it as domain string
- **Pattern**: Print debugging left in production code (DEBUG comments throughout)

### 9. **MISSING ADMIN-ONLY ROUTES**
- **Observation**: No dedicated admin routes - all admin operations mixed with general routes
- **Issue**: Faculty endpoints protected with `require_role(UserRole.ADMIN)` (e.g., register-faculty)
- **Problem**: No audit trail, no soft-delete patterns, no admin-specific operations module

### 10. **CONFIGURATION HARDCODED**
- **Location**: `server/app/core/config.py`
- **Issue**: DATABASE_URL and other sensitive values are hardcoded defaults
- **Also**: Debug mode defaults to True in production
- **JWT secrets not set**: Will fail if env vars not present

## COMPREHENSIVE BUG ANALYSIS - Additional Issues Found

### FRONTEND BUGS

#### 11. **LOGIN CREDENTIALS MISMATCH - CRITICAL**
- **Location**: `client/src/pages/Login.tsx` lines 11-13
- **Issue**: Hardcoded test credentials don't match backend
  - Frontend Admin: `ms@email.com` / `123456`
  - Frontend Faculty: `san@gmail.com` / `1234567`
  - Backend Admin (init_db): `admin@fsdp.com` / `Admin@123`
  - Backend Faculty (init_db): `faculty@fsdp.com` / `Faculty@123`
  - LoginPage.tsx uses: `sanjay@fsdp.com` / `123456` and `faculty@fsdp.com` / `123456`
- **Impact**: Users will get login failures when using quick-fill buttons
- **User sees**: "Invalid email or password" even though credentials are "correct"

#### 12. **DUPLICATE LOGIN COMPONENTS - UX BUG**
- **Location**: Two separate login components
  - `client/src/pages/Login.tsx`
  - `client/src/pages/LoginPage.tsx`
- **Issue**: Different credentials configured in each!
- **Impact**: Confusing user experience; one might work while the other doesn't
- **Should consolidate**: Use one authoritative login component

#### 13. **NUMERIC INPUT VALIDATION NOT ENFORCED - BUG**
- **Location**: `client/src/pages/admin/AIQuestionGen.tsx` line 30
- **Issue**: Number of Questions input has `min=1, max=10` but:
  - Users can paste invalid values
  - No validation in onChange
  - No clipping in submission
- **Code**: 
  ```tsx
  <Input
    type="number"
    min={1}
    max={10}
    value={count}
    onChange={(e) => setCount(parseInt(e.target.value))}
  />
  ```
- **Impact**: Could send -1, 0, 11, 100, etc. to backend
- **Backend fallback**: No validation, might create weird data or fail

#### 14. **ROLE CASE SENSITIVITY ISSUE - BUG**
- **Location**: `client/src/app/providers/AuthProvider.tsx` line 17
- **Issue**: Role is converted to lowercase
  - Line: `role: String(data.role ?? 'FACULTY').toLowerCase() as User['role']`
  - Backend sends: `"ADMIN"` or `"FACULTY"` (uppercase)
  - Frontend stores: `"admin"` or `"faculty"` (lowercase)
- **Impact**: Role comparison might fail if TypeScript types expect uppercase
- **Risk**: Conditional rendering based on role might not work correctly
- **Example issue**:
  ```tsx
  if (user.role === 'ADMIN') // This will never match because user.role is 'admin'
  ```

#### 15. **MISSING LOGGER IMPORT - PRODUCTION BUG**
- **Location**: `server/app/api/v1/routes/faculty.py` line 30
- **Issue**: Uses `logger.debug()` but logger is never imported
- **Code**: `logger.debug(f"Retrieved {len(result)} faculty profiles")`
- **Impact**: Will throw NameError if that line executes
- **Fix**: Add `import logging` and `logger = logging.getLogger(__name__)`

### BACKEND validation & CRUD BUGS

#### 16. **MISSING QUERY PARAMETER VALIDATION - BUG**
- **Location**: `server/app/api/v1/routes/attempts.py` line 19
- **Issue**: `submit_answer()` accepts query parameters without body:
  ```python
  async def submit_answer(
      attempt_id: str,
      question_id: str,
      selected_option: str,
      ...
  ):
  ```
- **Problem**: Should be POST body, not query params
- **Impact**: URL encoding issues, query string length limits, security concern
- **Should be**: `AnswerSubmitRequest` Pydantic model in request body

#### 17. **INSUFFICIENT PERMISSION CHECKS - BUG**
- **Location**: `server/app/api/v1/routes/attempts.py` line 66-71
- **Issue**: `complete_week()` endpoint doesn't verify ownership
  ```python
  @router.post("/weeks/{week_id}/complete")
  async def complete_week(
      week_id: str,
      current_user: User = Depends(get_current_user),
      db: AsyncSession = Depends(get_session)
  ):
      service = GrowthPlanService(db)
      success = await service.complete_week(week_id)  # No ownership check!
  ```
- **Impact**: Any authenticated user can complete any week of any faculty
- **Severity**: Data integrity violation - faculty A can mark faculty B's weeks complete

#### 18. **MISSING OWNERSHIP VERIFICATION ON DELETE/PATCH - BUG**
- **Location**: `server/app/api/v1/routes/growth_plans.py` line 45-52
- **Issue**: `update_task_status()` doesn't verify task ownership
- **Code**: Directly calls `service.update_task_status(task_id, done)` with no verification
- **Impact**: Any user can modify any other user's tasks
- **Risk**: Data corruption

#### 19. **MISSING TRANSACTION ISOLATION - BUG**
- **Location**: `server/app/services/faculty_service.py` line 83-107 (add_skill)
- **Issue**: Non-atomic operation across skill lookup/create and link creation
  ```python
  result = await self.db.execute(select(Skill).where(Skill.name == skill_in.skill_name))
  skill = result.scalar_one_or_none()
  
  if not skill:
      skill = Skill(name=skill_in.skill_name, domain=skill_in.domain)
      self.db.add(skill)
      await self.db.commit()  # ← Commits here
      await self.db.refresh(skill)
  
  # Race condition: Another request could have created same skill
  db_skill = FacultySkill(faculty_id=faculty_id, skill_id=skill.id, ...)
  self.db.add(db_skill)
  await self.db.commit()  # ← And here
  ```
- **Race condition**: Two concurrent requests for same skill will create duplicates
- **Should use**: Atomic transaction or unique constraint error handling

#### 20. **NO VALIDATION ON ENROLLMENT DATES - BUG**
- **Location**: `server/app/api/v1/routes/enrollments.py` line 20-41 (enroll_in_program)
- **Issue**: No validation checking:
  - Program's start_date hasn't passed
  - Program's end_date hasn't passed
  - Faculty isn't already enrolled in program (_exists but not checked)
- **Actually has check**: Line 32-33 checks for existing enrollment (good)
- **Missing**: Date validation - can enroll in past or expired programs

#### 21. **NO VALIDATION ON PROGRAM PUBLISH - BUG**
- **Location**: `server/app/api/v1/routes/programs.py`
- **Issue**: No dedicated publish endpoint or validation
- **Missing**: 
  - Check if program has start/end dates
  - Check if program has at least one skill requirement
  - Check if program has content (topics/benefits)
  - Validation before status change to PUBLISHED
- **Impact**: Can publish empty programs

#### 22. **SOFT DELETE NOT IMPLEMENTED - BUG**
- **Location**: `server/app/api/v1/routes/programs.py` line 102-107 (delete_program)
- **Issue**: Hard delete only
  ```python
  await db.delete(db_program)
  await db.commit()
  ```
- **Problem**: 
  - Violates data integrity if Faculty/Enrollments still reference it
  - No audit trail of deletions
  - Users will see "404 not found" for deleted programs they enrolled in
- **Fix**: Use soft delete with `deleted_at` timestamp

#### 23. **NO CASCADE DELETE HANDLING - POTENTIAL BUG**
- **Location**: Database constraint - `Enrollment` has FK to `Program`
- **Issue**: `delete_program()` will fail if:
  - Program has existing enrollments
  - Database cascade delete not set up properly
- **Model check**: `program.py` shows `cascade="all, delete-orphan"` for enrollments
- **Risk**: If cascade works, silently deletes all enrollments! No audit

#### 24. **UNIQUE CONSTRAINT RACE CONDITION - BUG**
- **Location**: `server/app/models/faculty_skill.py` line 11-12
- **Issue**: Unique constraint on `(faculty_id, skill_id)` but:
  - Service first checks if skill exists (line 1 in add_skill)
  - If doesn't exist, creates it
  - Multiple concurrent requests will try to create same skill
  - Will hit unique constraint, but no error handling
- **Code doesn't catch**: `IntegrityError` for the constraint
- **Impact**: Server returns 500 instead of friendly error

#### 25. **NO VALIDATION ON GROWTH PLAN PARAMETERS - BUG**
- **Location**: `server/app/schemas/growth_plan.py` (implied via service)
- **Issue**: No schema provided, but logically missing validations:
  - `current_level` should be 1-5
  - `target_level` should be `> current_level`
  - `weekly_hours` should be positive and reasonable (<100)
- **Impact**: Garbage data in database

### DATA CONSISTENCY BUGS

#### 26. **ADMIN PROFILE CREATION INCONSISTENCY - BUG**
- **Location**: `server/app/db/init_db.py` line 17-44
- **Issue**: Creates FacultyProfile for both admin and faculty
- **But**: Faculty routes assume only FACULTY users have profiles
- **Example**: `faculty.py` line 45 checks:
  ```python
  if not current_user.faculty_profile:
      raise HTTPException(status_code=404, detail="Faculty profile not found")
  ```
- **Problem**: Admin now has profile, might access faculty endpoints they shouldn't
- **Risk**: Admin can modify faculty data through faculty endpoints

#### 27. **NO VALIDATION ON SKILL LEVEL - BUG**
- **Location**: `server/app/schemas/skill.py` line 17
- **Issue**: Level has no constraints
  ```python
  level: int = 1  # No min/max validation
  ```
- **Comment in model**: *// 1 to 5* but not enforced
- **Impact**: Can create skill level 0, -1, 999
- **Should be**: `level: int = Field(1, ge=1, le=5)`

#### 28. **NO DEDUPLICATION IN SKILL CREATION - BUG**
- **Location**: `server/app/db/init_db.py` line 65-76
- **Issue**: Checks for specific skills by name before creating
- **Actually good**: Already handles this
- **However**: Doesn't handle if skills are partially created
- **Edge case**: If process crashes after adding first skill, restart will try to add all
- **Unlikely**: But introduces fragility

#### 29. **MISSING ATTEMPT AUTHORIZATION - BUG**
- **Location**: `server/app/api/v1/routes/attempts.py` line 34-49
- **Issue**: `submit_answer()` and `finish_attempt()` don't verify:
  - Current user owns the attempt
  - Attempt belongs to current user's test
- **Code**: Only checks if attempt exists, not if user is owner
- **Impact**: User A could submit answers to User B's test
- **Fix Required**: Add ownership check before allowing submission

#### 30. **MISSING TEST AUTHORIZATION - BUG**
- **Location**: `server/app/api/v1/routes/attempts.py` line 4-16
- **Issue**: `start_attempt()` doesn't verify test exists before creating attempt
- **Code**: Just calls service without checking test_id validity
- **Impact**: Will create attempt with non-existent test_id
- **Service might handle**: But should validate in route

### UX/WORKFLOW BUGS

#### 31. **CONFUSING ERROR MESSAGES - UX BUG**
- **Location**: Multiple endpoints return generic errors
- **Examples**:
  - `faculty.py` line 45: "Faculty profile not found" (same for admin & missing profile)
  - `enrollments.py` line 28: "Faculty user has no profile" (unclear why)
- **Should be more specific**: "User is not a faculty member" vs "Profile incomplete"

#### 32. **NO ENROLLMENT STATUS TRANSITIONS - INCOMPLETE FEATURE**
- **Location**: `server/app/models/enrollment.py` line 16
- **Has**: `EnrollmentStatus` enum (ENROLLED, etc.)
- **Missing**:
  - Endpoints to change status (complete, abandon, defer)
  - Validation of valid transitions
  - Audit trail of transitions
- **Impact**: Status field added but not used - dead code

#### 33. **INCOMPLETE GROWTH PLAN STATUS FLOW - BUG**
- **Location**: `server/app/models/growth_plan.py` line 13-14
- **Issue**: Has statuses (ACTIVE, COMPLETED, RESET) but:
  - No clear transitions between them
  - `reset_at` field never used/<set
  - No validation of what happens on reset
- **Reset endpoint**: `reset_my_plan()` just calls service.reset_plan()
- **Missing validation**: What makes plan eligible for reset?

### API Contract Issues

#### 34. **INCONSISTENT DATE FORMATS - DATA BUG**
- **Location**: Schema conversion between backend and frontend
- **Backend**: Uses Python `datetime` objects (ISO 8601 when serialized)
- **Frontend**: In AuthProvider.tsx line 17, stores `joinedDate` from `created_at`
- **Risk**: If backend changes date format, frontend breaks

#### 35. **MISSING API DOCUMENTATION FOR FORM DATA - BUG**
- **Location**: `server/app/api/v1/routes/attempts.py` line 18-24
- **Issue**: Submit_answer uses query params instead of request body
- **OpenAPI**: Generated docs will show query params, but:
  - Not RESTful (GET would be idempotent, POST shouldn't accept params)
  - URL encoding issues
  - Swagger docs will be wrong
- **Frontend doesn't know**: How to properly call this endpoint

#### 36. **MISSING PAGINATION METADATA - UX BUG**
- **Location**: List endpoints don't return metadata
  - `programs`: `list_programs()` returns just array
  - `faculty`: `list_faculty_profiles()` returns just array
- **Missing**: Total count, pagination info
- **Frontend impact**: Can't display "Showing 1-10 of 47"
- **Should return**: `{"items": [...], "total": 47, "skip": 0, "limit": 10}`

### CONFIGURATION & DEPLOYMENT BUGS

#### 37. **JWT SECRETS IN CODE - SECURITY BUG**
- **Location**: `server/app/core/config.py` line 12-13
- **Issue**: Default secrets if env vars not set
  - `JWT_ACCESS_SECRET = "change-this-secret-key-in-production"`
  - `JWT_REFRESH_SECRET = "change-this-refresh-secret-key-in-production"`
- **Actually fixed**: README says to set these
- **Risk**: Default values are weak or documented defaults = compromised

#### 38. **DEBUG MODE DEFAULT - SECURITY BUG**
- **Actually fixed**: `DEBUG: bool = False` (checked in config.py)
- **Historical**: Was `True` in production, exposed sensitive errors
- **Still risk**: Easy to accidentally enable

### SUMMARY OF SEVERITY

**CRITICAL (Breaks functionality)**:
- Login credentials mismatch (11)
- Role case sensitivity (14)
- Missing logger import (15)
- Admin profile data mixing (26)
- Attempt ownership not verified (29)
- Missing task ownership checks (18)

**HIGH (Data integrity/security)**:
- Query param vs body mismatch (16)
- Insufficient permission checks (17)
- Add_skill race condition (19)
- Unique constraint race condition (24)
- Skill level no validation (27)
- Cascading deletes without audit (23)

**MEDIUM (Feature incomplete or wrong)**:
- Numeric input not validated (13)
- Enrollment date not validated (20)
- Program publish validation missing (21)
- Soft delete not used (22)
- Enrollment status unused (31)
- Growth plan status incomplete (33)
- Missing pagination metadata (36)

**LOW (UX/Polish)**:
- Confusing error messages (31)
- Duplicate login components (12)
- Date format consistency (34)
- Incomplete documentation (35)
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
# FSDP Project Exploration - Issues Found

## Overview
Faculty Skill Development Portal - Full-stack FastAPI + React application for faculty skill development tracking and management with role-based access control (ADMIN, FACULTY).

## Key Findings Summary

### 1. **ENROLLMENT LOGIC BUG - CRITICAL**
- **Location**: `server/app/api/v1/routes/enrollments.py`
- **Issue**: `get_my_enrollments()` requires faculty_profile, but ADMIN users don't have one
- **Impact**: Admins trying to fetch enrollments will get 400 error with "User has no faculty profile"
- **Also affects**: `enroll_in_program()` for same reason
- **Fix**: Check if user is ADMIN, skip faculty_profile check or handle appropriately

### 2. **PROGRAM SCHEMA MISMATCH**
- **Location**: `server/app/schemas/program.py` vs `test_create_program.py`
- **Issue**: Schema expects `domain: SkillDomain` but test sends `"domain": "Technology"`
- **Problem**: SkillDomain values are Enum with displaynames like "Technology", "Cloud Computing" not YAML-friendly enum names
- **Test shows**: Accepts "Technology" but might fail validation if strict

### 3. **ROLE-TO-VALUE MAPPING INCONSISTENCY**
- **Location**: `server/app/api/v1/deps.py` - require_role() function
- **Issue**: Has normalization code handling both StrEnum and plain strings - suggests past serialization issues
- **Risk**: UserRole might serialize to different formats causing RBAC checks to fail sporadically

### 4. **FACULTY PROFILE LAZY-LOADING ISSUE**
- **Location**: `server/app/api/v1/deps.py:get_current_user()`
- **Issue**: Has hacky "failsafe" code to manually load faculty_profile if not eagerly loaded
- **Problem**: Lazy loading in async context causes "MissingGreenlet" errors
- **Also seen**: Comments in `programs.py` about "Re-fetch with enrollments eagerly loaded to prevent MissingGreenlet"
- **Pattern**: Across multiple routes - selectinload() used everywhere as workaround

### 5. **ADMIN USER SETUP ISSUES**
- **Location**: `server/app/db/init_db.py` + multiple diagnostic scripts
- **Maintenance scripts**:
  - `fix_admin.py` - resets all admin passwords (suggests lockout issues)
  - `reproduce_403.py` - explicit test for 403 forbidden errors
  - `deep_debug_login.py` - debugging login/auth issues
  - `list_admins.py` - checking if admins exist (suggests they go missing)
- **Initial creds**: `admin@fsdp.com` / `Admin@123` but QUICKSTART mentions `sanjay@fsdp.com` / `123456`
- **Issue**: Multiple credential sets mentioned, unclear which is correct

### 6. **DATABASE INITIALIZATION RACE CONDITIONS**
- **Location**: `server/app/db/init_db.py`
- **Issue**: Creates skill records inside init, but no uniqueness enforcement on first run
- **Could cause**: Duplicate skills if init runs multiple times
- **Also**: FacultyProfile created only for faculty user, not admin

### 7. **FRONTEND AUTH TOKEN HANDLING**
- **Location**: `client/src/app/providers/AuthProvider.tsx`
- **Pattern**: Has special logic to detect role switching without logout (security concern)
- **Issue**: If cached role doesn't match server role, silently clears session and logs user out
- **Could cause**: Confusion in multi-admin scenarios

### 8. **PROGRAM CREATION VALIDATION MISSING**
- **Location**: `server/app/api/v1/routes/programs.py`
- **Issue**: Schema has optional fields but validation doesn't ensure domain is valid SkillDomain
- **Risk**: Frontend sends "Technology" string, backend accepts it as domain string
- **Pattern**: Print debugging left in production code (DEBUG comments throughout)

### 9. **MISSING ADMIN-ONLY ROUTES**
- **Observation**: No dedicated admin routes - all admin operations mixed with general routes
- **Issue**: Faculty endpoints protected with `require_role(UserRole.ADMIN)` (e.g., register-faculty)
- **Problem**: No audit trail, no soft-delete patterns, no admin-specific operations module

### 10. **CONFIGURATION HARDCODED**
- **Location**: `server/app/core/config.py`
- **Issue**: DATABASE_URL and other sensitive values are hardcoded defaults
- **Also**: Debug mode defaults to True in production
- **JWT secrets not set**: Will fail if env vars not present

## COMPREHENSIVE BUG ANALYSIS - Additional Issues Found

### FRONTEND BUGS

#### 11. **LOGIN CREDENTIALS MISMATCH - CRITICAL**
- **Location**: `client/src/pages/Login.tsx` lines 11-13
- **Issue**: Hardcoded test credentials don't match backend
  - Frontend Admin: `ms@email.com` / `123456`
  - Frontend Faculty: `san@gmail.com` / `1234567`
  - Backend Admin (init_db): `admin@fsdp.com` / `Admin@123`
  - Backend Faculty (init_db): `faculty@fsdp.com` / `Faculty@123`
  - LoginPage.tsx uses: `sanjay@fsdp.com` / `123456` and `faculty@fsdp.com` / `123456`
- **Impact**: Users will get login failures when using quick-fill buttons
- **User sees**: "Invalid email or password" even though credentials are "correct"

#### 12. **DUPLICATE LOGIN COMPONENTS - UX BUG**
- **Location**: Two separate login components
  - `client/src/pages/Login.tsx`
  - `client/src/pages/LoginPage.tsx`
- **Issue**: Different credentials configured in each!
- **Impact**: Confusing user experience; one might work while the other doesn't
- **Should consolidate**: Use one authoritative login component

#### 13. **NUMERIC INPUT VALIDATION NOT ENFORCED - BUG**
- **Location**: `client/src/pages/admin/AIQuestionGen.tsx` line 30
- **Issue**: Number of Questions input has `min=1, max=10` but:
  - Users can paste invalid values
  - No validation in onChange
  - No clipping in submission
- **Code**: 
  ```tsx
  <Input
    type="number"
    min={1}
    max={10}
    value={count}
    onChange={(e) => setCount(parseInt(e.target.value))}
  />
  ```
- **Impact**: Could send -1, 0, 11, 100, etc. to backend
- **Backend fallback**: No validation, might create weird data or fail

#### 14. **ROLE CASE SENSITIVITY ISSUE - BUG**
- **Location**: `client/src/app/providers/AuthProvider.tsx` line 17
- **Issue**: Role is converted to lowercase
  - Line: `role: String(data.role ?? 'FACULTY').toLowerCase() as User['role']`
  - Backend sends: `"ADMIN"` or `"FACULTY"` (uppercase)
  - Frontend stores: `"admin"` or `"faculty"` (lowercase)
- **Impact**: Role comparison might fail if TypeScript types expect uppercase
- **Risk**: Conditional rendering based on role might not work correctly
- **Example issue**:
  ```tsx
  if (user.role === 'ADMIN') // This will never match because user.role is 'admin'
  ```

#### 15. **MISSING LOGGER IMPORT - PRODUCTION BUG**
- **Location**: `server/app/api/v1/routes/faculty.py` line 30
- **Issue**: Uses `logger.debug()` but logger is never imported
- **Code**: `logger.debug(f"Retrieved {len(result)} faculty profiles")`
- **Impact**: Will throw NameError if that line executes
- **Fix**: Add `import logging` and `logger = logging.getLogger(__name__)`

### BACKEND validation & CRUD BUGS

#### 16. **MISSING QUERY PARAMETER VALIDATION - BUG**
- **Location**: `server/app/api/v1/routes/attempts.py` line 19
- **Issue**: `submit_answer()` accepts query parameters without body:
  ```python
  async def submit_answer(
      attempt_id: str,
      question_id: str,
      selected_option: str,
      ...
  ):
  ```
- **Problem**: Should be POST body, not query params
- **Impact**: URL encoding issues, query string length limits, security concern
- **Should be**: `AnswerSubmitRequest` Pydantic model in request body

#### 17. **INSUFFICIENT PERMISSION CHECKS - BUG**
- **Location**: `server/app/api/v1/routes/attempts.py` line 66-71
- **Issue**: `complete_week()` endpoint doesn't verify ownership
  ```python
  @router.post("/weeks/{week_id}/complete")
  async def complete_week(
      week_id: str,
      current_user: User = Depends(get_current_user),
      db: AsyncSession = Depends(get_session)
  ):
      service = GrowthPlanService(db)
      success = await service.complete_week(week_id)  # No ownership check!
  ```
- **Impact**: Any authenticated user can complete any week of any faculty
- **Severity**: Data integrity violation - faculty A can mark faculty B's weeks complete

#### 18. **MISSING OWNERSHIP VERIFICATION ON DELETE/PATCH - BUG**
- **Location**: `server/app/api/v1/routes/growth_plans.py` line 45-52
- **Issue**: `update_task_status()` doesn't verify task ownership
- **Code**: Directly calls `service.update_task_status(task_id, done)` with no verification
- **Impact**: Any user can modify any other user's tasks
- **Risk**: Data corruption

#### 19. **MISSING TRANSACTION ISOLATION - BUG**
- **Location**: `server/app/services/faculty_service.py` line 83-107 (add_skill)
- **Issue**: Non-atomic operation across skill lookup/create and link creation
  ```python
  result = await self.db.execute(select(Skill).where(Skill.name == skill_in.skill_name))
  skill = result.scalar_one_or_none()
  
  if not skill:
      skill = Skill(name=skill_in.skill_name, domain=skill_in.domain)
      self.db.add(skill)
      await self.db.commit()  # ← Commits here
      await self.db.refresh(skill)
  
  # Race condition: Another request could have created same skill
  db_skill = FacultySkill(faculty_id=faculty_id, skill_id=skill.id, ...)
  self.db.add(db_skill)
  await self.db.commit()  # ← And here
  ```
- **Race condition**: Two concurrent requests for same skill will create duplicates
- **Should use**: Atomic transaction or unique constraint error handling

#### 20. **NO VALIDATION ON ENROLLMENT DATES - BUG**
- **Location**: `server/app/api/v1/routes/enrollments.py` line 20-41 (enroll_in_program)
- **Issue**: No validation checking:
  - Program's start_date hasn't passed
  - Program's end_date hasn't passed
  - Faculty isn't already enrolled in program (_exists but not checked)
- **Actually has check**: Line 32-33 checks for existing enrollment (good)
- **Missing**: Date validation - can enroll in past or expired programs

#### 21. **NO VALIDATION ON PROGRAM PUBLISH - BUG**
- **Location**: `server/app/api/v1/routes/programs.py`
- **Issue**: No dedicated publish endpoint or validation
- **Missing**: 
  - Check if program has start/end dates
  - Check if program has at least one skill requirement
  - Check if program has content (topics/benefits)
  - Validation before status change to PUBLISHED
- **Impact**: Can publish empty programs

#### 22. **SOFT DELETE NOT IMPLEMENTED - BUG**
- **Location**: `server/app/api/v1/routes/programs.py` line 102-107 (delete_program)
- **Issue**: Hard delete only
  ```python
  await db.delete(db_program)
  await db.commit()
  ```
- **Problem**: 
  - Violates data integrity if Faculty/Enrollments still reference it
  - No audit trail of deletions
  - Users will see "404 not found" for deleted programs they enrolled in
- **Fix**: Use soft delete with `deleted_at` timestamp

#### 23. **NO CASCADE DELETE HANDLING - POTENTIAL BUG**
- **Location**: Database constraint - `Enrollment` has FK to `Program`
- **Issue**: `delete_program()` will fail if:
  - Program has existing enrollments
  - Database cascade delete not set up properly
- **Model check**: `program.py` shows `cascade="all, delete-orphan"` for enrollments
- **Risk**: If cascade works, silently deletes all enrollments! No audit

#### 24. **UNIQUE CONSTRAINT RACE CONDITION - BUG**
- **Location**: `server/app/models/faculty_skill.py` line 11-12
- **Issue**: Unique constraint on `(faculty_id, skill_id)` but:
  - Service first checks if skill exists (line 1 in add_skill)
  - If doesn't exist, creates it
  - Multiple concurrent requests will try to create same skill
  - Will hit unique constraint, but no error handling
- **Code doesn't catch**: `IntegrityError` for the constraint
- **Impact**: Server returns 500 instead of friendly error

#### 25. **NO VALIDATION ON GROWTH PLAN PARAMETERS - BUG**
- **Location**: `server/app/schemas/growth_plan.py` (implied via service)
- **Issue**: No schema provided, but logically missing validations:
  - `current_level` should be 1-5
  - `target_level` should be `> current_level`
  - `weekly_hours` should be positive and reasonable (<100)
- **Impact**: Garbage data in database

### DATA CONSISTENCY BUGS

#### 26. **ADMIN PROFILE CREATION INCONSISTENCY - BUG**
- **Location**: `server/app/db/init_db.py` line 17-44
- **Issue**: Creates FacultyProfile for both admin and faculty
- **But**: Faculty routes assume only FACULTY users have profiles
- **Example**: `faculty.py` line 45 checks:
  ```python
  if not current_user.faculty_profile:
      raise HTTPException(status_code=404, detail="Faculty profile not found")
  ```
- **Problem**: Admin now has profile, might access faculty endpoints they shouldn't
- **Risk**: Admin can modify faculty data through faculty endpoints

#### 27. **NO VALIDATION ON SKILL LEVEL - BUG**
- **Location**: `server/app/schemas/skill.py` line 17
- **Issue**: Level has no constraints
  ```python
  level: int = 1  # No min/max validation
  ```
- **Comment in model**: *// 1 to 5* but not enforced
- **Impact**: Can create skill level 0, -1, 999
- **Should be**: `level: int = Field(1, ge=1, le=5)`

#### 28. **NO DEDUPLICATION IN SKILL CREATION - BUG**
- **Location**: `server/app/db/init_db.py` line 65-76
- **Issue**: Checks for specific skills by name before creating
- **Actually good**: Already handles this
- **However**: Doesn't handle if skills are partially created
- **Edge case**: If process crashes after adding first skill, restart will try to add all
- **Unlikely**: But introduces fragility

#### 29. **MISSING ATTEMPT AUTHORIZATION - BUG**
- **Location**: `server/app/api/v1/routes/attempts.py` line 34-49
- **Issue**: `submit_answer()` and `finish_attempt()` don't verify:
  - Current user owns the attempt
  - Attempt belongs to current user's test
- **Code**: Only checks if attempt exists, not if user is owner
- **Impact**: User A could submit answers to User B's test
- **Fix Required**: Add ownership check before allowing submission

#### 30. **MISSING TEST AUTHORIZATION - BUG**
- **Location**: `server/app/api/v1/routes/attempts.py` line 4-16
- **Issue**: `start_attempt()` doesn't verify test exists before creating attempt
- **Code**: Just calls service without checking test_id validity
- **Impact**: Will create attempt with non-existent test_id
- **Service might handle**: But should validate in route

### UX/WORKFLOW BUGS

#### 31. **CONFUSING ERROR MESSAGES - UX BUG**
- **Location**: Multiple endpoints return generic errors
- **Examples**:
  - `faculty.py` line 45: "Faculty profile not found" (same for admin & missing profile)
  - `enrollments.py` line 28: "Faculty user has no profile" (unclear why)
- **Should be more specific**: "User is not a faculty member" vs "Profile incomplete"

#### 32. **NO ENROLLMENT STATUS TRANSITIONS - INCOMPLETE FEATURE**
- **Location**: `server/app/models/enrollment.py` line 16
- **Has**: `EnrollmentStatus` enum (ENROLLED, etc.)
- **Missing**:
  - Endpoints to change status (complete, abandon, defer)
  - Validation of valid transitions
  - Audit trail of transitions
- **Impact**: Status field added but not used - dead code

#### 33. **INCOMPLETE GROWTH PLAN STATUS FLOW - BUG**
- **Location**: `server/app/models/growth_plan.py` line 13-14
- **Issue**: Has statuses (ACTIVE, COMPLETED, RESET) but:
  - No clear transitions between them
  - `reset_at` field never used/<set
  - No validation of what happens on reset
- **Reset endpoint**: `reset_my_plan()` just calls service.reset_plan()
- **Missing validation**: What makes plan eligible for reset?

### API Contract Issues

#### 34. **INCONSISTENT DATE FORMATS - DATA BUG**
- **Location**: Schema conversion between backend and frontend
- **Backend**: Uses Python `datetime` objects (ISO 8601 when serialized)
- **Frontend**: In AuthProvider.tsx line 17, stores `joinedDate` from `created_at`
- **Risk**: If backend changes date format, frontend breaks

#### 35. **MISSING API DOCUMENTATION FOR FORM DATA - BUG**
- **Location**: `server/app/api/v1/routes/attempts.py` line 18-24
- **Issue**: Submit_answer uses query params instead of request body
- **OpenAPI**: Generated docs will show query params, but:
  - Not RESTful (GET would be idempotent, POST shouldn't accept params)
  - URL encoding issues
  - Swagger docs will be wrong
- **Frontend doesn't know**: How to properly call this endpoint

#### 36. **MISSING PAGINATION METADATA - UX BUG**
- **Location**: List endpoints don't return metadata
  - `programs`: `list_programs()` returns just array
  - `faculty`: `list_faculty_profiles()` returns just array
- **Missing**: Total count, pagination info
- **Frontend impact**: Can't display "Showing 1-10 of 47"
- **Should return**: `{"items": [...], "total": 47, "skip": 0, "limit": 10}`

### CONFIGURATION & DEPLOYMENT BUGS

#### 37. **JWT SECRETS IN CODE - SECURITY BUG**
- **Location**: `server/app/core/config.py` line 12-13
- **Issue**: Default secrets if env vars not set
  - `JWT_ACCESS_SECRET = "change-this-secret-key-in-production"`
  - `JWT_REFRESH_SECRET = "change-this-refresh-secret-key-in-production"`
- **Actually fixed**: README says to set these
- **Risk**: Default values are weak or documented defaults = compromised

#### 38. **DEBUG MODE DEFAULT - SECURITY BUG**
- **Actually fixed**: `DEBUG: bool = False` (checked in config.py)
- **Historical**: Was `True` in production, exposed sensitive errors
- **Still risk**: Easy to accidentally enable

### SUMMARY OF SEVERITY

**CRITICAL (Breaks functionality)**:
- Login credentials mismatch (11)
- Role case sensitivity (14)
- Missing logger import (15)
- Admin profile data mixing (26)
- Attempt ownership not verified (29)
- Missing task ownership checks (18)

**HIGH (Data integrity/security)**:
- Query param vs body mismatch (16)
- Insufficient permission checks (17)
- Add_skill race condition (19)
- Unique constraint race condition (24)
- Skill level no validation (27)
- Cascading deletes without audit (23)

**MEDIUM (Feature incomplete or wrong)**:
- Numeric input not validated (13)
- Enrollment date not validated (20)
- Program publish validation missing (21)
- Soft delete not used (22)
- Enrollment status unused (31)
- Growth plan status incomplete (33)
- Missing pagination metadata (36)

**LOW (UX/Polish)**:
- Confusing error messages (31)
- Duplicate login components (12)
- Date format consistency (34)
- Incomplete documentation (35)
