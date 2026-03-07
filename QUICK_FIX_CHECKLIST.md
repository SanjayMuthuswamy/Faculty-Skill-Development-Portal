# Quick Fix Checklist - Faculty Skill Development Portal

**Generated**: March 7, 2026  
**Priority**: HIGH - Security and data integrity issues present

---

## 🚨 URGENT - Fix This Week (Security)

### [ ] BUG #29: Attempt Ownership Missing
- **File**: `server/app/api/v1/routes/attempts.py`
- **Lines**: 18, 46, 56
- **Issue**: Users can submit answers to other users' tests
- **Time**: 10 minutes
- **Change needed**:
  ```python
  if attempt.faculty_id != current_user.faculty_profile.id:
      raise HTTPException(status_code=403, detail="Cannot modify others' attempts")
  ```

### [ ] BUG #17: Week Completion Ownership Missing
- **File**: `server/app/api/v1/routes/growth_plans.py`
- **Lines**: 61-67
- **Issue**: Users can mark other users' weeks as complete
- **Time**: 10 minutes
- **Fix**: Add ownership verification before `complete_week()`

### [ ] BUG #18: Task Status Ownership Missing
- **File**: `server/app/api/v1/routes/growth_plans.py`
- **Lines**: 70-78
- **Issue**: Users can update other users' tasks
- **Time**: 10 minutes
- **Fix**: Add check before `update_task_status()`

### [ ] BUG #11: Login Credentials Mismatch
- **Files**: `client/src/pages/Login.tsx`, `client/src/pages/LoginPage.tsx`
- **Issue**: Hardcoded test credentials don't match backend
- **Time**: 30 minutes
- **Action**: 
  - Remove hardcoded CREDENTIALS objects
  - Create environment variables for demo accounts
  - Consolidate both login components

### [ ] BUG #14: Role Case Sensitivity
- **File**: `client/src/app/providers/AuthProvider.tsx`
- **Line**: 17
- **Issue**: `role: String(data.role ?? 'FACULTY').toLowerCase()`
- **Time**: 5 minutes
- **Fix**: Remove `.toLowerCase()` call

### [ ] BUG #26: Admin Profile Authorization Broken
- **Files**: `server/app/db/init_db.py`, update auth checks in faculty routes
- **Issue**: Admin can access faculty-only endpoints
- **Time**: 1-2 hours
- **Choose one**:
  - Option A: Change routes to check role, not profile existence
  - Option B: Don't create FacultyProfile for admin

### [ ] BUG #15: Missing Logger Import
- **File**: `server/app/api/v1/routes/faculty.py`
- **Line**: 30 uses `logger` but not imported
- **Time**: 2 minutes
- **Fix**: Add at top:
  ```python
  import logging
  logger = logging.getLogger(__name__)
  ```

---

## ⚠️ HIGH PRIORITY - Fix Next (Data Integrity)

### [ ] BUG #19: Skill Creation Race Condition
- **File**: `server/app/services/faculty_service.py`
- **Lines**: 82-104
- **Issue**: Concurrent requests create duplicate skills
- **Time**: 1-2 hours
- **Fix**: Use UNIQUE constraint + error handling
  ```python
  try:
      self.db.add(skill)
      await self.db.commit()
  except IntegrityError:
      await self.db.rollback()
      # Re-query for skill
  ```

### [ ] BUG #24: Constraint Violation Not Caught
- **File**: `server/app/services/faculty_service.py`
- **Issue**: Unique constraint violations return 500 errors
- **Time**: 30 minutes
- **Fix**: Catch `IntegrityError` and return friendly message

### [ ] BUG #20: No Enrollment Date Validation
- **File**: `server/app/api/v1/routes/enrollments.py`
- **Lines**: 17-40
- **Issue**: Can enroll in expired programs
- **Time**: 30 minutes
- **Fix**: 
  ```python
  if now > program.end_date:
      raise HTTPException(status_code=400, detail="Program has ended")
  if now < program.start_date:
      raise HTTPException(status_code=400, detail="Program hasn't started")
  ```

### [ ] BUG #21: No Program Publish Validation
- **File**: `server/app/api/v1/routes/programs.py`
- **Issue**: Can publish empty/invalid programs
- **Time**: 2 hours
- **Checks needed**:
  - Dates are valid (start ≤ end)
  - Has description
  - Seats > 0
  - Has topics

### [ ] BUG #22: No Soft Deletes
- **File**: `server/app/models/program.py`, update routes
- **Issue**: Hard deletes break enrollments
- **Time**: 3-4 hours
- **Add**: `deleted_at: Optional[datetime]` field

### [ ] BUG #27: Skill Level No Validation
- **File**: `server/app/schemas/skill.py`
- **Line**: 17
- **Issue**: Can store skill level as -999 or 1000
- **Time**: 5 minutes
- **Fix**:
  ```python
  level: int = Field(default=1, ge=1, le=5)
  ```

---

## 📋 MEDIUM PRIORITY - Fix Next 2 Weeks

### [ ] BUG #13: Numeric Input Validation
- **File**: `client/src/pages/admin/AIQuestionGen.tsx`
- **Line**: 30
- **Issue**: min/max not enforced on input
- **Time**: 15 minutes
- **Fix**: Add validation in onChange handler

### [ ] BUG #16: Query Params Should Be Body
- **File**: `server/app/api/v1/routes/attempts.py`
- **Lines**: 18-24
- **Issue**: submit_answer uses query params instead of body
- **Time**: 1 hour
- **Create**: `SubmitAnswerRequest` Pydantic model

### [ ] BUG #12: Duplicate Login Components
- **Files**: Both login pages
- **Issue**: Two different login UIs and credentials
- **Time**: 2 hours
- **Action**: Consolidate to one component

### [ ] BUG #35: Missing Pagination Metadata
- **Files**: Multiple list endpoints
- **Issue**: No total count or pagination info returned
- **Time**: 2-3 hours
- **Create**: Standard pagination response model

---

## 🟢 NICE TO HAVE - Polish

### [ ] BUG #31: Better Error Messages
- **Time**: 1 hour
- **Action**: Standardize error messages across endpoints

### [ ] BUG #34: Date Format Consistency
- **Time**: 30 minutes
- **Action**: Use proper date parsing in frontend

---

## Testing Checklist

After fixes, test these:

### Security Tests
- [ ] User A cannot submit answers to User B's test
- [ ] User A cannot mark User B's growth week complete  
- [ ] Faculty users cannot access admin endpoints
- [ ] Admin accessing faculty profile doesn't get unauthorized access
- [ ] Login with both credential sets works

### Data Integrity Tests
- [ ] Adding same skill twice doesn't create duplicates
- [ ] Cannot enroll in expired program
- [ ] Cannot publish program without dates
- [ ] Program deletion (soft delete) works correctly
- [ ] Skill levels are validated 1-5

### Functionality Tests
- [ ] Admin dashboard loads

 correctly
- [ ] Faculty dashboard shows correct data
- [ ] Question count input enforces 1-10 range
- [ ] All list endpoints return pagination data
- [ ] Error messages are clear and helpful

---

## Files to Modify Summary

### Backend
- `server/app/api/v1/routes/attempts.py` - 3 security fixes
- `server/app/api/v1/routes/growth_plans.py` - 2 security fixes
- `server/app/api/v1/routes/enrollments.py` - 1 validation fix
- `server/app/api/v1/routes/programs.py` - 2 logic fixes + soft delete
- `server/app/api/v1/routes/faculty.py` - 1 import fix
- `server/app/db/init_db.py` - 1 authorization fix
- `server/app/services/faculty_service.py` - 2 concurrency/error fixes
- `server/app/schemas/skill.py` - 1 validation fix
- `server/app/models/program.py` - 1 schema addition

### Frontend
- `client/src/pages/Login.tsx` - consolidate + credentials fix
- `client/src/pages/LoginPage.tsx` - consolidate + credentials fix
- `client/src/app/providers/AuthProvider.tsx` - role case fix
- `client/src/pages/admin/AIQuestionGen.tsx` - numeric validation

---

## Effort Estimate

| Phase | Fixes | Time |
|-------|-------|------|
| Phase 1: Security | 7 bugs | 4-5 hours |
| Phase 2: Runtime | 1 bug | 5 min |
| Phase 3: Data Integrity | 4 bugs | 4-6 hours |
| Phase 4: Features | 8 bugs | 8-12 hours |
| **Total** | **20 bugs** | **17-24 hours** |

**Realistic timeline**: 2-3 weeks (with other work)

---

## Code Review Checklist

When reviewing fixes, verify:

- [ ] All new checks include proper error messages
- [ ] All concurrent operations use transactions or constraints
- [ ] All authorization checks verify user ID, not just role
- [ ] All validations are implemented at both model and route level
- [ ] All errors are caught and converted to proper HTTP status
- [ ] No hardcoded values in routes (use config)
- [ ] Logger is imported in all files that use it
- [ ] Query parameters follow REST conventions
- [ ] Soft deletes filter out deleted records in all queries

---

## External References

- **Session Memory**: `/memories/session/fsdp_exploration.md` - Full bug details
- **Full Analysis**: `COMPREHENSIVE_BUG_ANALYSIS.md` - Detailed writeup
- **Fixes Applied**: `FIXES_APPLIED.md` - Previous fixes (now outdated)

---

