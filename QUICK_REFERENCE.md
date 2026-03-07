# Bug Reference Card - Quick Lookup

**Print This**: Easy reference for developers

---

## 🚨 Critical Bugs Overview (5 Total)

```
┌─────┬────────────────────────────────┬─────────────┬────────────┐
│ # │ Bug                             │ Category    │ Fix Time   │
├─────┼────────────────────────────────┼─────────────┼────────────┤
│ 11  │ Login credentials mismatch     │ Frontend    │ 30 min     │
│ 14  │ Role case sensitivity          │ Frontend    │ 5 min      │
│ 15  │ Missing logger import          │ Backend     │ 2 min      │
│ 26  │ Admin profile auth bypass      │ Backend     │ 1-2 hr     │
│ 29  │ No attempt ownership check     │ Backend     │ 10 min     │
└─────┴────────────────────────────────┴─────────────┴────────────┘
                            TOTAL: ~3-4 hours
```

---

## 🟠 High Priority Bugs (7 Total)

```
┌─────┬────────────────────────────────────┬────────────────┬────────────┐
│ # │ Bug                               │ Category       │ Fix Time   │
├─────┼────────────────────────────────────┼────────────────┼────────────┤
│ 17  │ Week completion ownership missing  │ Backend/Sec    │ 10 min     │
│ 18  │ Task status ownership missing      │ Backend/Sec    │ 10 min     │
│ 19  │ Skill creation race condition      │ Backend/Data   │ 1-2 hr     │
│ 20  │ No enrollment date validation      │ Backend/Biz    │ 30 min     │
│ 21  │ No program publish validation      │ Backend/Biz    │ 2 hr       │
│ 23  │ Cascade delete not handled         │ Backend/DB     │ 1-2 hr     │
│ 24  │ Constraint violations not caught   │ Backend/Error  │ 30 min     │
└─────┴────────────────────────────────────┴────────────────┴────────────┘
                              TOTAL: ~8-10 hours
```

---

## 🟡 Medium Priority Bugs (11 Total)

```
┌─────┬────────────────────────────────────┬────────────────┬────────────┐
│ # │ Bug                               │ File           │ Fix Time   │
├─────┼────────────────────────────────────┼────────────────┼────────────┤
│ 12  │ Duplicate login components         │ Login pages    │ 2 hr       │
│ 13  │ Numeric input validation           │ AdminQuestionGen │ 15 min  │
│ 16  │ Query params should be body        │ attempts.py    │ 1 hr       │
│ 22  │ No soft deletes                    │ programs.py    │ 3-4 hr     │
│ 27  │ No skill level validation          │ skill schemas  │ 5 min      │
│ 31  │ Confusing error messages           │ Multiple       │ 1 hr       │
│ 34  │ Inconsistent date handling         │ AuthProvider   │ 30 min     │
│ 35  │ Missing pagination metadata        │ List endpoints │ 2 hr       │
└─────┴────────────────────────────────────┴────────────────┴────────────┘
                              TOTAL: ~12-15 hours
```

---

## 🟢 Low Priority Bugs (15+ Total)

### Quick Summary:
- Duplicate login components (UX confusion)
- Error message clarity throughout
- Input validation gaps
- Date format handling
- API contract improvements
- Documentation updates

**Total Time**: 8-10 hours

---

## 🎯 By File Location

### `server/app/api/v1/routes/enrollments.py`
- BUG #20: No enrollment date validation (30 min)

### `server/app/api/v1/routes/attempts.py`
- BUG #16: Query params should be body (1 hr)
- BUG #29: No attempt ownership check (10 min)

### `server/app/api/v1/routes/faculty.py`
- BUG #15: Missing logger import (2 min)

### `server/app/api/v1/routes/programs.py`
- BUG #21: No program publish validation (2 hr)
- BUG #22: No soft deletes (3-4 hr)

### `server/app/api/v1/routes/growth_plans.py`
- BUG #17: Week completion ownership (10 min)
- BUG #18: Task status ownership (10 min)

### `server/app/api/v1/deps.py`
- Already updated in Phase 1

### `server/app/db/init_db.py`
- BUG #26: Admin profile auth bypass (1-2 hr)

### `server/app/services/faculty_service.py`
- BUG #19: Skill race condition (1-2 hr)
- BUG #24: Constraint error handling (30 min)

### `server/app/models/program.py`
- BUG #22: Add soft delete field (included in fix)

### `server/app/schemas/skill.py`
- BUG #27: Skill level validation (5 min)

### `client/src/pages/Login.tsx`
- BUG #11: Credentials mismatch (30 min)
- BUG #12: Duplicate components (2 hr)

### `client/src/pages/LoginPage.tsx`
- BUG #11: Credentials mismatch (30 min)
- BUG #12: Duplicate components (2 hr)

### `client/src/app/providers/AuthProvider.tsx`
- BUG #14: Role case sensitivity (5 min)
- BUG #34: Date handling (30 min)

### `client/src/pages/admin/AIQuestionGen.tsx`
- BUG #13: Numeric input validation (15 min)

---

## 📊 By Severity Level

### CRITICAL (Fix Today/Tomorrow): 5 bugs
```
Priority 1: BUG #15 (2 min)
Priority 2: BUG #14 (5 min)
Priority 3: BUG #11 (30 min)
Priority 4: BUG #29 (10 min)
Priority 5: BUG #26 (1-2 hr) ← Largest
```

### HIGH (Fix This Week): 7 bugs
```
Start with: BUG #17, #18 (20 min total)
Then: BUG #20 (30 min)
Then: BUG #24 (30 min)
Then: BUG #21 (2 hr)
Then: BUG #19 (1-2 hr)
Then: BUG #23 (1-2 hr)
```

### MEDIUM (Fix Next 2 Weeks): 11 bugs
```
Quick fixes: BUG #27 (5 min)
Short: BUG #13 (15 min), #31 (1 hr)
Medium: BUG #16 (1 hr), #34 (30 min)
Larger: BUG #35 (2 hr), #12 (2 hr), #22 (3-4 hr)
```

### LOW (Polish): 15+ bugs
```
Future improvements and documentation
```

---

## ⏰ Implementation Timeline

### DAY 1 (4 hours)
```
START:   BUG #15 (2 min)
         BUG #14 (5 min)
         BUG #11 (30 min)
         BUG #29 (10 min)
LUNCH:   Deploy quick fixes
         Test authentication flow
END:     Begin BUG #26 analysis
```

### DAY 2 (4-5 hours)
```
START:   Continue BUG #26 (1-2 hr)
MID:     BUG #17, #18 (20 min)
         BUG #20 (30 min)
         BUG #24 (30 min)
END:     Testing all ownership checks
```

### DAY 3 (3-4 hours)
```
START:   BUG #21 (2 hr)
MID:     BUG #19 (1-2 hr)
END:     Code review and testing
```

### DAY 4 (4 hours)
```
        Deploy Week 1 fixes
        Run full test suite
        Security review
        Prepare documentation
```

---

## 🔐 Security Issues Timeline

### IMMEDIATE (Same day):
- [ ] BUG #29 - Attempt ownership (10 min)
- [ ] BUG #17 - Week ownership (10 min)
- [ ] BUG #18 - Task ownership (10 min)

**Impact**: Prevents users from modifying other users' data

### TODAY:
- [ ] BUG #14 - Role case sensitivity (5 min)
- [ ] BUG #26 - Admin auth bypass (1-2 hr)

**Impact**: Ensures proper RBAC enforcement

### THIS WEEK:
- [ ] BUG #20 - Enrollment validation (30 min)
- [ ] BUG #24 - Error handling (30 min)

**Impact**: Prevents invalid state and information leakage

---

## 📋 Testing Checklist

After each fix:

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] No new warnings
- [ ] Old issues don't regress
- [ ] Error messages are clear
- [ ] API contract unchanged (or documented)

Before deployment:

- [ ] Security review
- [ ] Performance check
- [ ] All tests green
- [ ] Documentation updated
- [ ] Rollback plan ready

---

## 🎓 Code Patterns

### Authorization Check Pattern
```python
# ✅ CORRECT:
if current_user.id != resource.owner_id:
    raise HTTPException(status_code=403, detail="Not found")

# ❌ WRONG: Information leak
if current_user.id != resource.owner_id:
    raise HTTPException(status_code=403, detail="Cannot modify others' resources")

# ❌ WRONG: No check at all
# Just process the request!
```

### Enumeration Handling Pattern
```python
# ✅ CORRECT:
role_value = (
    current_user.role 
    if isinstance(current_user.role, str) 
    else current_user.role.value
)

# ❌ WRONG: May fail with different Python versions
if hasattr(current_user.role, 'value'):
    # ...
```

### Input Validation Pattern
```python
# ✅ CORRECT:
class CreateRequest(BaseModel):
    count: int = Field(ge=1, le=10)

# ❌ WRONG: Only hints, not enforced
<input type="number" min="1" max="10" />
```

### Soft Delete Pattern
```python
# ✅ CORRECT:
class Program(Base):
    deleted_at: Optional[datetime] = None

# In queries:
select(Program).where(Program.deleted_at.is_(None))

# ❌ WRONG:
await db.delete(program)  # Hard delete - data loss!
```

---

## 📞 Need Help?

1. **BUG_TRACKER.md** - Detailed reference for all bugs
2. **COMPREHENSIVE_BUG_ANALYSIS.md** - Technical deep dives
3. **QUICK_FIX_CHECKLIST.md** - Step-by-step implementation
4. **Code comments** - Will be added during fixes

---

*Last Updated: March 7, 2026*
*Total Bugs: 38 | Fixed: 8 | Remaining: 30*
