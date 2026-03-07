# Faculty Skill Development Portal - Complete Bug Tracker

**Last Updated**: March 7, 2026  
**Status**: 38 bugs identified - 8 already fixed, 30 remaining  
**Priority Focus**: Critical (5) → High (7) → Medium (11) → Low (15+)

---

## 📊 Bug Summary

| Status | Count | Time Estimate |
|--------|-------|----------------|
| ✅ FIXED (Previous Session) | 8 | ~8 hours |
| 🔴 CRITICAL - URGENT | 5 | 3-4 hours |
| 🟠 HIGH - Data Integrity | 7 | 8-10 hours |
| 🟡 MEDIUM - Features | 11 | 12-15 hours |
| 🟢 LOW - Polish | 15+ | 8-10 hours |
| **TOTAL** | **38** | **~40-50 hours** |

---

# 🔴 CRITICAL BUGS - FIX THIS WEEK

## BUG #11: Login Credentials Mismatch
- **Severity**: CRITICAL
- **Category**: Frontend / Authentication
- **Files**: 
  - `client/src/pages/Login.tsx` (lines 11-13)
  - `client/src/pages/LoginPage.tsx` (lines 17-18)
- **Problem**: Hardcoded test credentials in UI don't match backend initialization
- **Impact**: Users cannot login using quick-fill buttons, first-time UX broken
- **Symptom**: "Invalid email or password" when using admin button
- **Fix Time**: 30 minutes
- **Root Cause**: Two separate login components with different credentials
- **Solution**:
  1. Remove hardcoded credentials from both components
  2. Create .env variables: `VITE_DEMO_ADMIN_EMAIL`, `VITE_DEMO_ADMIN_PASSWORD`, etc.
  3. Consolidate to single Login component
  4. Use environment variables for demo credentials
- **Testing**:
  ```bash
  # Test both admin and faculty quick-login buttons
  # Verify credentials work
  ```

---

## BUG #14: Role Case Sensitivity Breaking Admin Features
- **Severity**: CRITICAL
- **Category**: Frontend / Authorization
- **File**: `client/src/app/providers/AuthProvider.tsx` (line 17)
- **Problem**: Frontend converts role to lowercase, backend sends uppercase → role checks fail
- **Impact**: Admin features don't show even when logged in as admin
- **Symptom**: 
  ```
  Backend sends: {"role": "ADMIN"}
  Frontend stores: role = "admin"
  Component checks: if (user.role === 'ADMIN') → False
  Result: Admin dashboard hidden
  ```
- **Fix Time**: 5 minutes
- **Solution**: Remove `.toLowerCase()` call
  ```tsx
  // BEFORE:
  role: String(data.role ?? 'FACULTY').toLowerCase() as User['role'],
  
  // AFTER:
  role: (String(data.role ?? 'FACULTY')) as User['role'],
  ```
- **Files to Update**:
  - `client/src/app/providers/AuthProvider.tsx` line 17
  - Ensure User type accepts 'ADMIN' | 'FACULTY' (not lowercase)

---

## BUG #15: Missing Logger Import - Runtime Crash
- **Severity**: CRITICAL
- **Category**: Backend / Runtime
- **File**: `server/app/api/v1/routes/faculty.py` (line 30)
- **Problem**: Code uses `logger` but never imports it
- **Impact**: Route crashes at runtime with `NameError`
- **Symptom**: 
  ```
  GET /api/v1/faculty/
  → NameError: name 'logger' is not defined
  → 500 Internal Server Error
  ```
- **Fix Time**: 2 minutes
- **Solution**: Add imports at top of file
  ```python
  import logging
  logger = logging.getLogger(__name__)
  ```

---

## BUG #26: Admin Profile Authorization Bypass
- **Severity**: CRITICAL
- **Category**: Backend / Security
- **Files**: 
  - `server/app/db/init_db.py` (lines 33-44)
  - Faculty routes checking `faculty_profile` existence
- **Problem**: Admin users created with FacultyProfile, so they pass faculty-only permission checks
- **Impact**: Admin can call faculty-only endpoints (shouldn't be allowed)
- **Endpoints Vulnerable**:
  - All routes in `faculty.py` checking `if not current_user.faculty_profile`
  - `GET /faculty/me`, `POST /faculty/me/skills`, `PATCH /faculty/me`, etc.
  - `POST /enrollments/`, `GET /enrollments/me`
  - `PUT /growth-plans/weeks/{week_id}/complete`
- **Fix Time**: 1-2 hours
- **Solution** - Choose ONE approach:

**Option A**: Check role instead of profile (RECOMMENDED)
```python
# In faculty.py routes
if current_user.role != UserRole.FACULTY:
    raise HTTPException(status_code=403, detail="Only faculty users can access this")
```

**Option B**: Don't create FacultyProfile for admin
```python
# In init_db.py - only create profile for faculty
if admin_user is None:
    admin = User(...)
    session.add(admin)
    # Don't create profile for admin!
```

**Option C**: Check both role AND profile (defensive)
```python
from app.models.enums import UserRole
if current_user.role != UserRole.FACULTY or not current_user.faculty_profile:
    raise HTTPException(status_code=403)
```

---

## BUG #29: Missing Attempt Ownership Verification
- **Severity**: CRITICAL
- **Category**: Backend / Security
- **File**: `server/app/api/v1/routes/attempts.py` (lines 18, 46, 56)
- **Problem**: Users can submit answers to other users' tests
- **Impact**: Complete circumvention of test integrity
- **Vulnerable Endpoints**: 
  - `POST /{attempt_id}/answers`
  - `POST /{attempt_id}/finish`
  - `POST /{attempt_id}/submit`
- **Attack Scenario**:
  ```
  User A: Taking test, on question 5
  User B: Submits answer for User A's attempt
  User B: User A's test score is now affected
  User A: Confused why they got wrong answer they didn't choose
  ```
- **Fix Time**: 10 minutes
- **Solution**: Add ownership check in all three routes
  ```python
  @router.post("/{attempt_id}/answers")
  async def submit_answer(
      attempt_id: str,
      question_id: str,
      selected_option: str,
      current_user: User = Depends(get_current_user),
      db: AsyncSession = Depends(get_session)
  ):
      service = AttemptService(db)
      attempt = await service.get_attempt(attempt_id)
      
      if not attempt:
          raise HTTPException(status_code=404, detail="Attempt not found")
      
      # ADD THIS CHECK:
      if attempt.faculty_id != current_user.faculty_profile.id:
          raise HTTPException(
              status_code=403, 
              detail="Cannot modify other users' attempts"
          )
      
      # ... rest of code
  ```
- **Testing**:
  ```bash
  # Test 1: User A checks if User B can't modify User A's attempt
  # Test 2: Verify 403 error returned
  # Test 3: Verify 404 if attempt doesn't exist
  ```

---

# 🟠 HIGH PRIORITY BUGS - Fix Next Week (Data Integrity & Race Conditions)

## BUG #17: Week Completion Not Ownership Verified
- **Severity**: HIGH
- **Category**: Backend / Security
- **File**: `server/app/api/v1/routes/growth_plans.py` (lines 61-67)
- **Problem**: No check that current user owns the growth plan week
- **Impact**: Users can mark other users' weeks as complete
- **Fix Time**: 10 minutes
- **Solution**: Add ownership check before `complete_week()`
  ```python
  if growth_plan.faculty_id != current_user.faculty_profile.id:
      raise HTTPException(status_code=403)
  ```

---

## BUG #18: Task Status Not Ownership Verified
- **Severity**: HIGH
- **Category**: Backend / Security
- **File**: `server/app/api/v1/routes/growth_plans.py` (lines 70-78)
- **Problem**: No check that current user owns the task
- **Impact**: Users can modify other users' tasks
- **Fix Time**: 10 minutes
- **Solution**: Similar to BUG #17

---

## BUG #19: Race Condition in Skill Creation
- **Severity**: HIGH
- **Category**: Backend / Data Integrity
- **File**: `server/app/services/faculty_service.py` (lines 82-104 in add_skill)
- **Problem**: Two concurrent requests can create duplicate skills
- **Impact**: Database has multiple "Python" skills with different IDs
- **Symptom**: Skill appears multiple times in UI dropdown
- **Fix Time**: 1-2 hours
- **Race Scenario**:
  ```
  Time 1: Request A checks if "Python" exists → Not found
  Time 2: Request B checks if "Python" exists → Not found (A hasn't committed)
  Time 3: Request A creates "Python", commits
  Time 4: Request B creates "Python", commits ← DUPLICATE!
  ```
- **Solution**: Use database UNIQUE constraint + error handling
  ```python
  try:
      skill = Skill(name=skill_in.skill_name, domain=skill_in.domain)
      self.db.add(skill)
      await self.db.commit()
  except IntegrityError:
      await self.db.rollback()
      # Retry the query
      result = await self.db.execute(
          select(Skill).where(Skill.name == skill_in.skill_name)
      )
      skill = result.scalar_one()
  ```
- **Database Change**: Ensure Skill table has UNIQUE constraint on (name, domain)

---

## BUG #20: No Enrollment Date Validation
- **Severity**: HIGH
- **Category**: Backend / Business Logic
- **File**: `server/app/api/v1/routes/enrollments.py` (lines 17-40)
- **Problem**: Users can enroll in programs that already ended
- **Impact**: Users enroll in wrong/past programs
- **Fix Time**: 30 minutes
- **Solution**: Add date checks before allowing enrollment
  ```python
  from datetime import datetime, timezone
  
  now = datetime.now(timezone.utc)
  
  if now > program.end_date:
      raise HTTPException(
          status_code=400, 
          detail="Program enrollment has ended"
      )
  
  if now < program.start_date:
      raise HTTPException(
          status_code=400,
          detail="Program enrollment hasn't started yet"
      )
  ```

---

## BUG #21: No Program Publish Validation
- **Severity**: HIGH
- **Category**: Backend / Business Logic
- **File**: `server/app/api/v1/routes/programs.py` (line 86, publish endpoint)
- **Problem**: Empty/invalid programs can be published
- **Impact**: Users see broken programs in catalog
- **Missing Checks**:
  - [ ] start_date is set
  - [ ] end_date is set and > start_date
  - [ ] description is not empty
  - [ ] seats > 0
  - [ ] at least one topic
- **Fix Time**: 2 hours
- **Solution**: Create validation function
  ```python
  def validate_publishable(program: Program):
      errors = []
      if not program.start_date:
          errors.append("Start date is required")
      if not program.end_date:
          errors.append("End date is required")
      elif program.start_date >= program.end_date:
          errors.append("End date must be after start date")
      if not program.description or not program.description.strip():
          errors.append("Description is required")
      if program.seats <= 0:
          errors.append("Must have at least one seat")
      if not program.topics or len(program.topics) == 0:
          errors.append("Must have at least one topic")
      
      if errors:
          raise HTTPException(
              status_code=400,
              detail="; ".join(errors)
          )
  ```

---

## BUG #23: Cascade Delete Not Handled
- **Severity**: HIGH
- **Category**: Backend / Database
- **File**: Database models and delete endpoints
- **Problem**: Deleting programs doesn't cascade delete related records properly
- **Impact**: Orphaned enrollment records
- **Fix Time**: 1-2 hours
- **Solution**: Review cascade settings in SQLAlchemy relationships

---

## BUG #24: Unique Constraint Violations Not Caught
- **Severity**: HIGH
- **Category**: Backend / Error Handling
- **File**: `server/app/services/faculty_service.py` (add_skill area)
- **Problem**: IntegrityError from unique constraints returns unhelpful 500 errors
- **Impact**: Users see "Internal server error" instead of "Skill already added"
- **Fix Time**: 30 minutes
- **Solution**: Catch IntegrityError
  ```python
  from sqlalchemy.exc import IntegrityError
  
  try:
      db.add(faculty_skill)
      await db.commit()
  except IntegrityError:
      await db.rollback()
      raise HTTPException(
          status_code=400,
          detail="You already have this skill"
      )
  ```

---

# 🟡 MEDIUM PRIORITY BUGS - Fix Next 2 Weeks

## BUG #13: Numeric Input Validation Not Enforced
- **Severity**: MEDIUM
- **Category**: Frontend / Input Validation
- **File**: `client/src/pages/admin/AIQuestionGen.tsx` (line 30)
- **Problem**: HTML `min`/`max` are UI hints only, not enforced
- **Impact**: Users can enter invalid values (-1 questions, 100 questions)
- **Fix Time**: 15 minutes
- **Solution**: Add validation in onChange handler
  ```tsx
  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value);
      if (isNaN(val) || val < 1) setCount(1);
      else if (val > 10) setCount(10);
      else setCount(val);
  };
  ```

---

## BUG #16: Query Parameters Should Be Request Body
- **Severity**: MEDIUM
- **Category**: Backend / API Design
- **File**: `server/app/api/v1/routes/attempts.py` (lines 18-24)
- **Problem**: submit_answer() uses query params instead of request body (not RESTful)
- **Impact**: URL encoding issues, answer text could be truncated
- **Fix Time**: 1 hour
- **Current**: `POST /api/v1/attempts/abc/answers?question_id=q1&selected_option=D`
- **Should be**: `POST /api/v1/attempts/abc/answers` with JSON body
- **Solution**: Create Pydantic model and update route
  ```python
  class SubmitAnswerRequest(BaseModel):
      question_id: str
      selected_option: str
  
  @router.post("/{attempt_id}/answers")
  async def submit_answer(
      attempt_id: str,
      request: SubmitAnswerRequest,
      current_user: User = Depends(get_current_user),
      ...
  ):
      # Use request.question_id and request.selected_option
  ```

---

## BUG #22: No Soft Deletes - Hard Delete Only
- **Severity**: MEDIUM
- **Category**: Backend / Data Integrity
- **File**: `server/app/api/v1/routes/programs.py` (lines 102-107)
- **Problem**: Hard deletes remove programs completely, breaks enrolled users
- **Impact**: Users's past programs disappear from history
- **Fix Time**: 3-4 hours
- **Solution**: Add soft delete pattern
  1. Add `deleted_at` field to Program model:
     ```python
     deleted_at: Mapped[Optional[datetime]] = mapped_column(
         DateTime(timezone=True),
         nullable=True
     )
     ```
  2. Update delete endpoint:
     ```python
     db_program.deleted_at = datetime.now(timezone.utc)
     await db.commit()
     ```
  3. Filter deleted programs in queries:
     ```python
     select(Program).where(Program.deleted_at.is_(None))
     ```

---

## BUG #27: No Skill Level Validation
- **Severity**: MEDIUM
- **Category**: Backend / Validation
- **File**: `server/app/schemas/skill.py` (line 17)
- **Problem**: Skill level accepts any integer (-999, 1000, etc.)
- **Impact**: Database has garbage skill level data
- **Fix Time**: 5 minutes
- **Solution**: Add Pydantic Field validation
  ```python
  from pydantic import Field
  
  class FacultySkillCreate(BaseModel):
      skill_name: str
      domain: SkillDomain
      level: int = Field(default=1, ge=1, le=5, description="Proficiency level 1-5")
  ```

---

## BUG #31: Confusing Error Messages
- **Severity**: MEDIUM
- **Category**: UX / Error Messages
- **Files**: Various route files
- **Problem**: Error messages are vague or misleading
- **Examples**:
  | Current | Better |
  |---------|--------|
  | "Faculty profile not found" (shown to admin) | "Only faculty users can access this" |
  | "Faculty user has no profile" | "Cannot find your faculty profile - contact admin" |
  | "Conflict creating resource" | "You already have this skill added" |
  | "Invalid parameter" | "Count must be between 1 and 10" |
- **Fix Time**: 1 hour
- **Solution**: Audit all HTTPException messages and improve clarity

---

## BUG #34: Inconsistent Date Handling
- **Severity**: MEDIUM
- **Category**: Frontend / API Contract
- **File**: `client/src/app/providers/AuthProvider.tsx` (line 34)
- **Problem**: Frontend manually converts dates from ISO to string - brittle
- **Impact**: If backend changes date format, frontend breaks
- **Fix Time**: 30 minutes
- **Current**:
  ```typescript
  joinedDate: data.created_at != null ? String(data.created_at) : undefined,
  ```
- **Better**:
  ```typescript
  joinedDate: data.created_at ? new Date(data.created_at).toISOString() : undefined,
  ```

---

## BUG #35: Missing Pagination Metadata
- **Severity**: MEDIUM
- **Category**: Backend / API Design
- **Files**: All list endpoints (`/programs/`, `/faculty/`, `/growth-plans/`)
- **Problem**: List endpoints return arrays without pagination info
- **Impact**: Can't show "Showing 1-10 of 47", can't implement pagination
- **Current Response**:
  ```json
  [{"id": "1", "name": "Program 1"}, ...]
  ```
- **Should Return**:
  ```json
  {
    "items": [...],
    "total": 47,
    "skip": 0,
    "limit": 100,
    "has_more": true
  }
  ```
- **Fix Time**: 2 hours
- **Solution**: Create generic pagination response model
  ```python
  from typing import Generic, TypeVar
  from pydantic import BaseModel
  
  T = TypeVar('T')
  
  class PaginatedResponse(BaseModel, Generic[T]):
      items: list[T]
      total: int
      skip: int
      limit: int
      has_more: bool
  ```

---

# 🟢 LOW PRIORITY BUGS - Polish & Testing

## BUG #12: Duplicate Login Components
- **Severity**: LOW
- **Category**: Frontend / UX
- **Files**: 
  - `client/src/pages/Login.tsx`
  - `client/src/pages/LoginPage.tsx`
- **Problem**: Two separate login page components with different layouts and logic
- **Impact**: Confusing for developers, inconsistent UX
- **Fix Time**: 2 hours
- **Solution**: Consolidate to single component

---

# 📈 Recommended Fix Timeline

## Phase 1: CRITICAL (3-4 hours) - Week 1
1. BUG #15 - Logger import (2 min)
2. BUG #14 - Role case sensitivity (5 min)
3. BUG #11 - Login credentials (30 min)
4. BUG #29 - Attempt ownership (10 min)
5. BUG #26 - Admin profile auth (1-2 hours) ← Largest
6. Deploy and test

**Estimated**: Half-day work

## Phase 2: HIGH PRIORITY (8-10 hours) - Week 1-2
1. BUG #19 - Skill race condition (1-2 hours)
2. BUG #24 - Constraint error handling (30 min)
3. BUG #20 - Enrollment date validation (30 min)
4. BUG #21 - Program publish validation (2 hours)
5. BUG #17, #18 - Ownership checks (20 min)
6. BUG #22 - Soft deletes (3-4 hours)

**Estimated**: 2-3 days work

## Phase 3: MEDIUM PRIORITY (12-15 hours) - Week 2-3
1. BUG #27 - Skill level validation (5 min)
2. BUG #16 - Query params to body (1 hour)
3. BUG #13 - Input validation (15 min)
4. BUG #31 - Error messages (1 hour)
5. BUG #34 - Date handling (30 min)
6. BUG #35 - Pagination (2 hours)
7. BUG #12 - Consolidate login (2 hours)
8. BUG #23 - Cascade delete (1-2 hours)

**Estimated**: 3-4 days work

## Phase 4: POLISH & TESTING (8-10 hours) - Week 3-4
- Integration tests for all fixes
- Security review
- Performance testing
- Documentation updates

---

# 🧪 Testing Checklist

### Unit Tests Needed:
- [ ] `test_attempt_ownership_verified()`
- [ ] `test_week_completion_ownership_verified()`
- [ ] `test_cannot_enroll_in_expired_program()`
- [ ] `test_cannot_publish_program_without_dates()`
- [ ] `test_skill_level_validation()`

### Integration Tests Needed:
- [ ] `test_concurrent_skill_creation()` (race condition)
- [ ] `test_admin_cannot_access_faculty_endpoints()`
- [ ] `test_user_cannot_modify_others_attempt()`
- [ ] `test_error_message_on_duplicate_skill()`

### Manual Testing Needed:
- [ ] Admin login with quick-fill button
- [ ] Faculty enrollment in active programs
- [ ] Admin access to faculty endpoints (should be denied)
- [ ] Program publication validation
- [ ] Soft delete functionality

---

# 📚 Related Documentation

See these documents for more details:

1. **COMPREHENSIVE_BUG_ANALYSIS.md**
   - Full details on each bug
   - Attack scenarios and security implications
   - Code examples

2. **QUICK_FIX_CHECKLIST.md**
   - Implementation checklist
   - Code templates
   - Testing instructions

3. **BUG_SUMMARY_BY_CATEGORY.md**
   - Statistics by component
   - Heat maps by severity
   - Timeline recommendations

4. **FIXES_APPLIED.md**
   - Already-fixed bugs (8 total)
   - Environment configuration
   - Configuration next steps

---

# ✅ Status Tracking

- [ ] Create GitHub Issues for all 30 remaining bugs
- [ ] Prioritize with team
- [ ] Assign to developers
- [ ] Create branches for fixes
- [ ] Add tests
- [ ] Code review
- [ ] Merge to main
- [ ] Deploy to staging
- [ ] Test in staging
- [ ] Deploy to production
