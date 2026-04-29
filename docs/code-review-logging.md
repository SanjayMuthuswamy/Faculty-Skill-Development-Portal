# Code Review: Backend Logging

## 1. Logging setup is never invoked

- File: `server/app/main.py`
- Line: 17
- Severity: Medium

`main.py` imports and runs `setup_sentry()`, but nothing calls `setup_logging()`. As a result, the application may never apply the intended log level, format, stdout handler, or logger overrides from `server/app/core/logging.py`.

Suggested fix: import and call `setup_logging()` during application startup before creating or using module loggers.

## 2. `basicConfig` may be ignored under Uvicorn

- File: `server/app/core/logging.py`
- Line: 8
- Severity: Medium

`logging.basicConfig(...)` does not reconfigure logging when handlers already exist. Uvicorn and other bootstrap paths commonly install handlers before app code runs, so this configuration can silently become a no-op.

Suggested fix: use `force=True` on supported Python versions, or switch to `logging.config.dictConfig(...)` for deterministic application logging.

## 3. Access logs are suppressed in every environment

- File: `server/app/core/logging.py`
- Line: 14
- Severity: Low

`uvicorn.access` is always set to `WARNING`, which hides request logs even when `settings.DEBUG` is enabled. That makes local debugging and request tracing harder.

Suggested fix: suppress access logs only outside debug or development environments.
