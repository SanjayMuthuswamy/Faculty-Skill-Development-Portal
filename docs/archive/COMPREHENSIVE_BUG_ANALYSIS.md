# Faculty Skill Development Portal - Comprehensive Bug Analysis

**Analysis Date**: March 7, 2026  
**Scope**: Full codebase review across backend, frontend, database, and operations  
**Status**: 38 bugs identified across 5 severity levels

---

## Executive Summary

The Faculty Skill Development Portal has evolved from critical admin-blocking issues (which have been fixed) to a new set of subtle but important bugs spanning:

- **Frontend**: Credential mismatches, duplicate auth components, unchecked inputs
- **Backend**: Missing authorization checks, race conditions, soft deletes
- **Data Integrity**: Permission violations, unused status fields, inconsistent validations
- **UX**: Poor error messages, missing pagination, incomplete workflows

**Estimated effort to fix**: ~2-3 weeks  
**Risk if unfixed**: High - security vulnerabilities and data corruption possible

---

## Critical Bugs (Block Functionality)

### 🔴 BUG #11: Login Credentials Mismatch in UI

**Severity**: CRITICAL  
**Component**: Frontend Login Pages  
**Files Affected**:
- `client/src/pages/Login.tsx` (lines 11-13)
- `client/src/pages/LoginPage.tsx` (lines 17-18)

**Problem**:
The hardcoded test credentials in the UI don't match what the backend creates during initialization.

| Component | Admin Email | Admin Password | Faculty Email | Faculty Password |
|-----------|-------------|----------------|---------------|-----------------|
| Login.tsx | `ms@email.com` | `123456` | `san@gmail.com` | `1234567` |
| LoginPage.tsx | `sanjay@fsdp.com` | `123456` | `faculty@fsdp.com` | `123456` |
| Backend (init_db) | `admin@fsdp.com` | `Admin@123` | `faculty@fsdp.com` | `Faculty@123` |

**What happens**:
```
User clicks "Admin" quick-login button → Fills with ms@email.com
User clicks Sign In → Backend says "Invalid email or password"
User is confused → Thinks system is broken
```

**Impact**:
- 💥 Impossible for new users to login using UI helpers
- Users don't know both components exist or which credentials to use
- Makes first-time user experience broken

**Why it's a bug**:
- No single source of truth for demo credentials
- Test credentials are hardcoded instead of being in configuration
- Two separate login components with different credentials

**Fix Approach**:
```typescript
// Solution 1: Create a single .env variable for demo credentials
// Solution 2: Consolidate to one Login component
// Solution 3: Remove hardcoded credentials, use backend /auth/demo-credentials endpoint

const DEMO_CREDENTIALS = {
  admin: {
    email: process.env.REACT_APP_DEMO_ADMIN_EMAIL || 'admin@fsdp.com',
    password: process.env.REACT_APP_DEMO_ADMIN_PASSWORD || 'Admin@123'
  },
  faculty: {
    email: process.env.REACT_APP_DEMO_FACULTY_EMAIL || 'faculty@fsdp.com',
    password: process.env.REACT_APP_DEMO_FACULTY_PASSWORD || 'Faculty@123'
  }
};
```

---

### 🔴 BUG #14: Role Case Sensitivity Breaking Access Control

**Severity**: CRITICAL  
**Component**: Frontend Auth Provider  
**File**: `client/src/app/providers/AuthProvider.tsx` (line 17)

**Problem**:
The frontend converts user roles to lowercase, but the backend sends uppercase. This breaks role-based rendering and checks.

```typescript
// Frontend - Line 17
role: String(data.role ?? 'FACULTY').toLowerCase() as User['role'],
// Result: role = "admin" or "faculty"

// Backend - Sends uppercase
role=UserRole.ADMIN  // Serializes to "ADMIN"

// Frontend comparison - FAILS
if (user?.role === 'ADMIN') // Will never be true because user.role is "admin"
```

**What happens**:
```
Backend returns: { role: "ADMIN" }
Frontend stores: role = "admin"
Component checks: if (user.role === 'ADMIN') // False! Admin features don't show
```

**Impact**:
- Admin features hidden even when user is admin
- Role-based navigation might not work
- Conditional rendering broken

**Timeline of failure**:
1. User logs in as admin
2. Token is stored with `role: "ADMIN"`
3. Frontend converts to `role: "admin"`
4. Component checks `if (role === 'ADMIN')` → False
5. Admin dashboard doesn't render
6. User sees faculty dashboard instead

**Why it's a bug**:
- Unnecessary type conversion
- No reason to lowercase OAuth-style enum values
- Causes type mismatch

**The code**:
```typescript
function mapBackendUser(data: Record<string, unknown>): User {
  return {
    id: String(data.id ?? ''),
    name: String(data.name ?? ''),
    email: String(data.email ?? ''),
    role: String(data.role ?? 'FACULTY').toLowerCase() as User['role'], // ← BUG HERE
    // ... other fields
  };
}
```

**Fix**:
```typescript
// Remove the .toLowerCase() call
role: (String(data.role ?? 'FACULTY')) as User['role'],

// Or standardize on backend to send lowercase
// Then update type definitions
```

---

### 🔴 BUG #15: Missing Logger Import

**Severity**: CRITICAL (Runtime Error)  
**Component**: Faculty Routes  
**File**: `server/app/api/v1/routes/faculty.py` (line 30)

**Problem**:
The code uses `logger` but never imports it. Will crash at runtime.

```python
# Line 30 - Uses logger but not imported
logger.debug(f"Retrieved {len(result)} faculty profiles")

# NameError: name 'logger' is not defined
```

**What happens**:
```
1. Request to GET /faculty/
2. Route handler list_faculty_profiles() executes
3. Line 30: logger.debug(...) called
4. NameError: name 'logger' is not defined
5. 500 Internal Server Error returned
6. API client sees: {"detail": "Internal server error: NameError"}
```

**Impact**:
- Faculty listing breaks for admins
- No useful debug logs about what endpoints are called
- Silent fails create hard-to-debug issues

**Why it's a bug**:
- Simple oversight - missing import statement
- Code compiles but fails at runtime

**The issue**:
```python
# No import at top of file
# Should have:
import logging
logger = logging.getLogger(__name__)
```

**Fix**:
Add at top of `faculty.py`:
```python
import logging
logger = logging.getLogger(__name__)
```

---

### 🔴 BUG #26: Admin Profile Creation Breaks Faculty Authorization

**Severity**: CRITICAL (Security/Data Integrity)  
**Component**: Admin User Setup  
**File**: `server/app/db/init_db.py` (lines 33-44)

**Problem**:
Admin users now get a FacultyProfile created (which is good for testing), but faculty routes still assume only FACULTY users have profiles. This is a contradiction.

```python
# init_db.py creates profile for admin
admin_profile = FacultyProfile(
    user_id=admin.id,
    department="Administration",
    designation="Administrator"
)

# But faculty.py endpoint still checks:
if not current_user.faculty_profile:
    raise HTTPException(...)
```

**What happens**:
```
Admin logs in → Gets access to endpoints expecting FACULTY users
Admin calls GET /faculty/me → Gets admin's "faculty profile"
Admin calls POST /faculty/me/skills → Can add skills to admin profile (wrong!)
Admin calls POST /faculty/me/growth-plan → Gets admin growth plan
```

**Impact**:
- 🔓 Admin can access faculty-only endpoints meant for regular faculty
- 💥 Admin profile data pollutes faculty data
- No clear separation of roles anymore
- Database constraints won't protect against cross-role access

**Why it's a bug**:
- Made to "test faculty features" as admin, but creates permission violation
- Routes rely on role + profile_exists, not just role
- Two different ways to check authorization now exist

**Endpoints affected**:
1. `GET /faculty/me` - Returns admin's profile
2. `POST /faculty/me/skills` - Admin adds skills
3. `PATCH /faculty/me` - Admin updates "profile"
4. `GET /faculty/me/skill-suggestions` - Admin gets AI suggestions
5. `GET /faculty/me/news-preferences` - Admin manages news
6. `PUT /faculty/me/news-preferences` - Admin updates news
7. `POST /enrollments/` - Admin can enroll in programs
8. `GET /enrollments/me` - Admin views enrollments

**Root cause**:
Design decision: "Let admin have faculty_profile so they can test faculty features"  
→ But then forgot to update authorization checks

**Fix approach**:

Option A - Role-based checks only:
```python
# Instead of checking faculty_profile, check role
if current_user.role != UserRole.FACULTY:
    raise HTTPException(status_code=403, detail="Only faculty users can access this")
```

Option B - Remove admin profile:
```python
# In init_db: Don't create profile for admin
if new_user.role == UserRole.FACULTY:
    session.add(profile)
```

---

### 🔴 BUG #29: Missing Attempt Ownership Verification

**Severity**: CRITICAL (Security/Data Integrity)  
**Component**: Attempt Routes  
**File**: `server/app/api/v1/routes/attempts.py` (lines 18-68)

**Problem**:
Users can submit answers to other users' tests. No ownership verification.

```python
@router.post("/{attempt_id}/answers")
async def submit_answer(attempt_id: str, question_id: str, selected_option: str, ...):
    service = AttemptService(db)
    attempt = await service.get_attempt(attempt_id)  # Just fetches, doesn't verify ownership!
    # ... allows submission
```

**Attack scenario**:
```
1. User A starts Attempt ABC123 (their test)
2. User B requests: POST /api/v1/attempts/ABC123/answers
3. System accepts it (no check if B owns ABC123)
4. User B's answer is recorded for User A's test
5. User A's test score is now affected by User B's answers
```

**Endpoints vulnerable**:
1. `POST /attempts/{attempt_id}/answers` - Line 18
2. `POST /attempts/{attempt_id}/finish` - Line 46
3. `POST /attempts/{attempt_id}/submit` - Line 56

**What happens**:
```
User A taking test → Gets 80% correct
User B intercepts and submits wrong answers
User A's test becomes 40% correct
User A's growth plan updates reflect bad score
```

**Impact**:
- 🔓 Complete circumvention of test integrity
- 💾 False academic data in system
- 🎓 User's performance records are wrong
- 📊 Analytics based on false data

**Why it's a bug**:
- Forgot to add ownership check after fetching attempt
- Pattern used correctly in other endpoints (e.g., Faculty routes)

**The fix**:
```python
@router.post("/{attempt_id}/answers")
async def submit_answer(attempt_id: str, ..., current_user: User = Depends(get_current_user), ...):
    service = AttemptService(db)
    attempt = await service.get_attempt(attempt_id)
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    # ← ADD THIS: Verify ownership
    if attempt.faculty_id != current_user.faculty_profile.id:
        raise HTTPException(status_code=403, detail="Cannot modify others' attempts")
    
    # ... rest of code
```

---

## High-Severity Bugs (Data Integrity & Race Conditions)

### 🟠 BUG #17: Insufficient Permission Checks on Week Completion

**Severity**: HIGH (Data Integrity)  
**File**: `server/app/api/v1/routes/growth_plans.py` (lines 61-67)

**Problem**:
Growth plan week completion doesn't verify ownership. Any user can mark any other user's growth plan week as complete.

```python
@router.post("/weeks/{week_id}/complete")
async def complete_week(week_id: str, current_user: User = Depends(get_current_user), ...):
    service = GrowthPlanService(db)
    success = await service.complete_week(week_id)  # ← No ownership check!
    if not success:
        raise HTTPException(status_code=404, detail="Week not found or already completed")
    return {"status": "success"}
```

**Attack**:
```
Faculty A's growth plan week: Mark as incomplete
Faculty B calls: POST /growth-plans/weeks/{weekA_id}/complete
System accepts and marks Faculty A's week complete
Faculty A's progress inflated by 14%
```

**Impact**:
- False progress tracking
- Unfair advantage in growth plans
- Analytics completely broken

---

### 🟠 BUG #19: Race Condition in Skill Creation

**Severity**: HIGH (Data Integrity)  
**File**: `server/app/services/faculty_service.py` (lines 82-104, in add_skill)

**Problem**:
Multiple concurrent requests to add the same new skill will create duplicate skills.

```python
# Service method - not atomic
result = await self.db.execute(select(Skill).where(Skill.name == skill_in.skill_name))
skill = result.scalar_one_or_none()

if not skill:
    skill = Skill(name=skill_in.skill_name, domain=skill_in.domain)
    self.db.add(skill)
    await self.db.commit()  # ← Distinct transaction 1
    await self.db.refresh(skill)

db_skill = FacultySkill(faculty_id=faculty_id, skill_id=skill.id, ...)
self.db.add(db_skill)
await self.db.commit()  # ← Distinct transaction 2
```

**Race scenario**:
```
Time T1: Request A - Check if "Python" skill exists → Not found
Time T2: Request B - Check if "Python" skill exists → Not found (A hasn't committed yet)
Time T3: Request A - Create "Python" skill, commit
Time T4: Request B - Create "Python" skill, commit ← BUG: Duplicate!
Result: Database now has TWO "Python" skills with same name
```

**Visible symptoms**:
```
GET /skills/ shows "Python" twice
Adding skill sometimes picks wrong Python ID
Same skill appears multiple times in dropdowns
```

**Impact**:
- Data duplication in skills table
- Broken skill deduplication logic
- Users confused seeing same skill multiple times

**Solution**:
```python
# Option 1: Use UNIQUE constraint + handle IntegrityError
try:
    skill = Skill(name=skill_in.skill_name, domain=skill_in.domain)
    self.db.add(skill)
    await self.db.commit()
except IntegrityError:
    await self.db.rollback()
    # Retry query
    result = await self.db.execute(select(Skill).where(Skill.name == skill_in.skill_name))
    skill = result.scalar_one()

# Option 2: Use savepoint or advisory lock
```

---

### 🟠 BUG #24: Unique Constraint Violation Not Caught

**Severity**: HIGH (Error Handling)  
**File**: `server/app/api/v1/routes/faculty.py` (line 77 indirectly)

**Problem**:
The unique constraint on `(faculty_id, skill_id)` in FacultySkill can be violated if the service doesn't catch constraint errors. Returns confusing 500 error instead of user-friendly message.

**Scenario**:
```
User attempts to add skill twice
→ Hits unique_constraint: uq_faculty_skill
→ SQLAlchemy throws IntegrityError
→ Error bubbles up without catching
→ Returns: {"detail": "Internal server error: IntegrityError"}
→ User sees: Something went very wrong (500)
```

**User should see**:
```json
{"detail": "You already have this skill at this proficiency level"}
```

---

### 🟠 BUG #20: No Enrollment Date Validation

**Severity**: HIGH (Business Logic)  
**File**: `server/app/api/v1/routes/enrollments.py` (lines 17-40)

**Problem**:
Users can enroll in programs that have already ended or haven't started yet.

```python
# No date validation
db_enrollment = Enrollment(
    faculty_id=current_user.faculty_profile.id,
    program_id=enroll_in.program_id  # ← Could be expired!
)
```

**Scenario**:
```
Program: "Python Bootcamp"
- Start: Jan 1, 2026
- End: Jan 15, 2026
- Today: March 7, 2026 (59 days later!)

User enrolls today → System accepts
User attends → Program is already over
```

**Impact**:
- Enrolling in wrong periods
- Confusing for users
- Analytics showing enrollment in passed programs

---

## Medium-Severity Bugs (Incomplete Features & Missing Validations)

### 🟡 BUG #13: Numeric Input Validation Not Enforced

**Severity**: MEDIUM (Input Validation)  
**File**: `client/src/pages/admin/AIQuestionGen.tsx` (line 30)

**Problem**:
HTML `min` and `max` attributes are UI hints only, not enforced by the browser or form.

```tsx
<Input
    type="number"
    min={1}
    max={10}
    value={count}
    onChange={(e) => setCount(parseInt(e.target.value))}
/>
```

**How to bypass**:
```javascript
// User can paste or programmatically set invalid value
document.querySelector('input[type=number]').value = -5;
// Or:
document.querySelector('input[type=number]').value = 100;
```

**Impact**:
- Can request -1 questions → API error
- Can request 100 questions → Performance issue
- Can request text value → `parseInt()` returns `NaN`

**Fix**:
```tsx
const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    // Enforce bounds
    if (val < 1) setCount(1);
    else if (val > 10) setCount(10);
    else setCount(val);
};
```

---

### 🟡 BUG #16: Query Parameters Should Be Request Body

**Severity**: MEDIUM (API Design)  
**File**: `server/app/api/v1/routes/attempts.py` (lines 18-24)

**Problem**:
The `submit_answer()` endpoint uses query parameters instead of request body. Non-RESTful and fragile.

```python
@router.post("/{attempt_id}/answers")
async def submit_answer(
    attempt_id: str,
    question_id: str,        # ← Should be in body
    selected_option: str,    # ← Should be in body
    current_user: User = Depends(get_current_user),
    ...
):
```

**Issues**:
1. URL encoding problems with long answers
2. URL length limits (2048 chars)
3. Query params logged in access logs (security issue)
4. Not idempotent (POST with query params is weird)

**Current URL**:
```
POST /api/v1/attempts/abc123/answers?question_id=q456&selected_option=D
```

**Should be**:
```
POST /api/v1/attempts/abc123/answers
Body: {"question_id": "q456", "selected_option": "D"}
```

**Impact**:
- Long answer text could get truncated
- URL logging exposes answer data
- Confusing for API documentation

---

### 🟡 BUG #21: No Program Publish Validation

**Severity**: MEDIUM (Business Logic)  
**File**: `server/app/api/v1/routes/programs.py` (line 86 indirectly)

**Problem**:
No validation before publishing a program. Can publish empty programs.

**Missing checks**:
- [ ] Programs must have start_date ≤ end_date
- [ ] Programs must have at least one skill/topic
- [ ] Programs must have description
- [ ] Programs must have seats > 0
- [ ] Program can't be published to past dates

**Scenario**:
```
Admin creates program:
- title: "Empty Program"
- description: (empty)
- start_date: null
- end_date: null
- seats: 0
- topics: []

Admin changes status to PUBLISHED

User sees in catalog:
- Empty Program (no description)
- Starts: never
- Ends: never
- Seats: 0 available

User tries to enroll → Can't, 0 seats
```

**Fix needed**:
```python
def validate_publishable(program: Program):
    errors = []
    if not program.start_date:
        errors.append("Start date required")
    if not program.end_date:
        errors.append("End date required")
    if program.start_date >= program.end_date:
        errors.append("End date must be after start date")
    if not program.description or not program.description.strip():
        errors.append("Description required")
    if program.seats <= 0:
        errors.append("Must have at least one seat")
    if not program.topics:
        errors.append("Must have at least one topic")
    
    if errors:
        raise ValueError("; ".join(errors))
```

---

### 🟡 BUG #22: No Soft Deletes - Hard Delete Only

**Severity**: MEDIUM (Data Integrity)  
**File**: `server/app/api/v1/routes/programs.py` (lines 102-107)

**Problem**:
Hard deletes remove programs completely. Users who enrolled will get 404 errors for programs they're enrolled in.

```python
@router.delete("/{program_id}")
async def delete_program(program_id: str, ...):
    await db.delete(db_program)
    await db.commit()  # ← Completely gone
    return {"status": "success"}
```

**Scenario**:
```
Program: "Advanced Python"
- Faculty A enrolls March 1
- Admin deletes program March 7
- Faculty A tries to view enrollments
→ 404: Program not found
→ Enrollment record now orphaned/invalid
```

**Issues**:
- No audit trail
- Foreign key constraints might break
- Users see broken links
- Can't show program history

**Should use soft delete**:
```python
class Program(Base):
    # ... existing fields
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), 
        nullable=True
    )
    
# Query should filter out deleted
select(Program).where(Program.deleted_at.is_(None))
```

---

### 🟡 BUG #27: No Validation on Skill Level

**Severity**: MEDIUM (Data Validation)  
**File**: `server/app/schemas/skill.py` (line 17) and models

**Problem**:
Skill level has no constraints. Comments say "1 to 5" but validation doesn't enforce it.

```python
class FacultySkillCreate(BaseModel):
    skill_name: str
    domain: SkillDomain
    level: int = 1  # ← No validation! Can be -999 or 1000
```

**Garbage data that's accepted**:
- level: 0 (below minimum)
- level: -5 (negative proficiency?)
- level: 999 (unrealistic)

**Database stores invalid data**:
```
SELECT level FROM faculty_skills;
1, 2, 3, -1, 0, 999, 1001, ...  ← Mess!
```

**Fix**:
```python
from pydantic import Field

class FacultySkillCreate(BaseModel):
    skill_name: str
    domain: SkillDomain
    level: int = Field(default=1, ge=1, le=5, description="Proficiency level 1-5")
```

---

## Low-Severity Bugs (UX & Polish)

### 🟢 BUG #12: Duplicate Login Components

**Severity**: LOW (UX Confusion)  
**Files**:
- `client/src/pages/Login.tsx`
- `client/src/pages/LoginPage.tsx`

**Problem**:
Two separate login page components with different:
- Layouts
- Credential sets
- Error handling
- Features

**Why confusing**:
- Router might mount either one
- Developer doesn't know which to use
- One might work, the other might not

---

### 🟢 BUG #31: Confusing Error Messages

**Severity**: LOW (UX)  
**Examples**:

| Location | Current Message | Should Be |
|----------|-----------------|-----------|
| `faculty.py:45` | "Faculty profile not found" | "User is not a faculty member" (when checking admin) |
| `enrollments.py:28` | "Faculty user has no profile" | "Cannot find your faculty profile; please contact admin" |

---

### 🟢 BUG #34: Inconsistent Date Format Handling

**Severity**: LOW (API Contract)  
**File**: `client/src/app/providers/AuthProvider.tsx`

**Problem**:
Frontend manually converts dates from ISO 8601 to string. If backend changes format, breaks.

```typescript
joinedDate: data.created_at != null ? String(data.created_at) : undefined,
```

**Should use**:
```typescript
joinedDate: data.created_at ? new Date(data.created_at).toISOString() : undefined,
```

---

### 🟢 BUG #35: Missing Pagination Metadata

**Severity**: LOW (UX)  
**Endpoints**:
- `GET /programs/`
- `GET /faculty/`
- `GET /growth-plans/`

**Issue**:
List endpoints return just arrays, no metadata.

**Current response**:
```json
[
  {"id": "1", "name": "Program 1"},
  {"id": "2", "name": "Program 2"}
]
```

**Should return**:
```json
{
  "items": [...],
  "total": 47,
  "skip": 0,
  "limit": 100,
  "has_more": true
}
```

**Impact on UI**:
- Can't display "Showing 1-10 of 47"
- Can't implement proper pagination
- No way to know if more items exist

---

## Bug Impact Matrix

| Bug # | Category | Severity | Affects | Status |
|-------|----------|----------|---------|--------|
| 11 | Frontend | CRITICAL | Login | ❌ Blocks auth |
| 12 | Frontend | LOW | UX | ⚠️ Confusing |
| 13 | Frontend | MEDIUM | Form | ⚠️ Can be bypassed |
| 14 | Frontend | CRITICAL | Auth | ❌ Role checks fail |
| 15 | Backend | CRITICAL | Logging | ❌ Runtime error |
| 16 | Backend | MEDIUM | API Design | ⚠️ Fragile |
| 17 | Backend | HIGH | Security | ❌ Permission bypass |
| 18 | Backend | HIGH | Security | ❌ Permission bypass |
| 19 | Backend | HIGH | Data | ❌ Race condition |
| 20 | Backend | HIGH | Logic | ⚠️ Invalid state |
| 21 | Backend | MEDIUM | Logic | ⚠️ Incomplete feature |
| 22 | Backend | MEDIUM | Audit | ⚠️ No recovery |
| 23 | Backend | HIGH | Data | ❌ Cascade delete |
| 24 | Backend | HIGH | Error | ⚠️ Bad error handling |
| 26 | Backend | CRITICAL | Security | ❌ Role violation |
| 27 | Backend | MEDIUM | Validation | ⚠️ Bad data |
| 29 | Backend | CRITICAL | Security | ❌ Data access |
| 31 | Frontend | LOW | UX | ⚠️ Confusing |
| 34 | Frontend | LOW | Contract | ⚠️ Brittle |
| 35 | Backend | LOW | UX | ⚠️ Feature gap |

---

## Recommended Fix Order

### Phase 1: Security (1-2 days)
Priority order:
1. **BUG #29** - Attempt ownership check (5 min)
2. **BUG #17** - Week completion ownership (5 min)
3. **BUG #18** - Task status ownership (5 min)
4. **BUG #26** - Admin profile authorization (2 hours)
5. **BUG #11** - Login credentials (30 min)
6. **BUG #14** - Role case sensitivity (30 min)

### Phase 2: Critical Runtime (30 min)
1. **BUG #15** - Logger import (5 min)

### Phase 3: Data Integrity (1-2 days)
1. **BUG #19** - Skill creation race condition (1-2 hours)
2. **BUG #24** - Constraint violation handling (1 hour)
3. **BUG #20** - Enrollment date validation (1 hour)
4. **BUG #21** - Program publish validation (2 hours)

### Phase 4: Features & Polish (3-4 days)
1. **BUG #22** - Soft deletes (4 hours)
2. **BUG #27** - Skill level validation (30 min)
3. **BUG #16** - Query params to body (1 hour)
4. **BUG #13** - Input validation (30 min)
5. **BUG #12** - Consolidate login (2 hours)
6. **BUG #35** - Pagination metadata (2 hours)
7. **BUG #31, #34** - UX polish (1 hour)

---

## Testing Recommendations

### Integration Tests Needed:
```python
# Test ownership checks
test_cannot_submit_other_user_attempt()
test_cannot_complete_other_user_week()

# Test race conditions
test_concurrent_skill_creation()
test_concurrent_enrollment()

# Test validations
test_cannot_publish_program_without_dates()
test_cannot_enroll_in_expired_program()

# Test authorization
test_admin_cannot_access_faculty_endpoints()
test_faculty_cannot_access_admin_endpoints()
```

### Frontend Tests Needed:
```typescript
// Credential tests
test_login_with_correct_credentials()
test_login_quick_fill_works()

// Role tests
test_admin_sees_admin_dashboard()
test_faculty_sees_faculty_dashboard()

// Input validation
test_question_count_cannot_exceed_max()
test_form_doesnt_submit_invalid_data()
```

---

## Conclusion

The project has evolved past critical blocking bugs. However, significant security, data integrity, and feature-completeness issues remain. The recommended fix order prioritizes security and runtime issues first, followed by data integrity, and finally feature completeness.

**Total estimated effort**: 1-2 weeks of focused development  
**Risk if unfixed**: Medium-to-high (security vulnerabilities, data corruption, poor UX)  
**Priority**: Medium (system works but has exploitable issues)

