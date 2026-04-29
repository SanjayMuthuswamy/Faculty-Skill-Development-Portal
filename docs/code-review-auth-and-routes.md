# Code Review: Auth and API Routes

## 1. Public password reset lets anyone change a user's password

- File: `server/app/api/v1/routes/auth.py`
- Line: 54
- Severity: High

`POST /reset-password` accepts only an email address and a new password, then updates the password without requiring an authenticated user, reset token, one-time code, or admin role. Anyone who knows a user's email address can take over that account.

Suggested fix: require a signed, expiring reset token delivered through a verified channel, or move this operation behind admin authentication and authorization.

## 2. Inactive users can still log in and call protected APIs

- Files: `server/app/services/auth_service.py`, `server/app/api/v1/deps.py`
- Lines: `server/app/services/auth_service.py:17`, `server/app/api/v1/deps.py:21`
- Severity: High

Authentication verifies the email and password but never checks `User.is_active`. The main `get_current_user` dependency also returns inactive users as long as their token is valid, so disabled accounts can continue using protected endpoints.

Suggested fix: reject inactive users during login and in `get_current_user`, returning `401` or `403` consistently.

## 3. Legacy API dependency references a missing setting

- File: `server/app/api/deps.py`
- Line: 12
- Severity: Medium

`oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/auth/login")` references `settings.API_PREFIX`, but `Settings` defines `API_V1_STR` instead. Importing this module will raise `AttributeError`, which can break any future route or test that still uses `app.api.deps`.

Suggested fix: replace `settings.API_PREFIX` with `settings.API_V1_STR`, or remove the stale dependency module if all routes have migrated to `app.api.v1.deps`.

## 4. Discussion creation accepts unvalidated arbitrary dictionaries

- File: `server/app/api/v1/routes/discussions.py`
- Line: 92
- Severity: Medium

`create_discussion` accepts `body: dict` and writes `body.get("title", "")` and `body.get("content", "")` directly. Missing or blank fields become empty strings, so invalid discussions can be persisted even though the model requires meaningful text.

Suggested fix: define a Pydantic request schema with trimmed `title` and `content` fields, minimum lengths, and an explicit category field.

## 5. Reply creation does not verify the parent discussion exists

- File: `server/app/api/v1/routes/discussions.py`
- Line: 138
- Severity: Medium

`add_reply` inserts a `DiscussionReply` for the provided `discussion_id` without first checking that the discussion exists. Invalid IDs can surface as database integrity errors and return a 500 instead of a controlled 404.

Suggested fix: query for the parent discussion before inserting the reply and return `404` when it does not exist.
