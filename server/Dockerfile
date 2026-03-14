FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install runtime deps (postgres client for diagnostics, curl for health checks).
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python package first for better layer caching.
COPY pyproject.toml ./
COPY app ./app
RUN pip install --no-cache-dir .

# Copy the remaining files needed for migrations/runtime.
COPY alembic.ini ./
COPY migrations ./migrations
COPY . .

# Run as non-root in production containers.
RUN useradd --create-home --uid 10001 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -fsS http://localhost:8000/api/v1/health || exit 1

CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "-w", "2", "-b", "0.0.0.0:8000", "app.main:app", "--access-logfile", "-", "--error-logfile", "-"]
