# Production Deployment (Docker)

This project now includes a production stack in `docker-compose.prod.yml`:

- `client` (Nginx serving built React app)
- `server` (FastAPI behind Gunicorn/Uvicorn workers)
- `postgres` (PostgreSQL 15)

## 1. Prepare environment

Create a production `.env` file at repository root:

```bash
cp .env.example .env
```

Set at minimum:

- `POSTGRES_PASSWORD`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGINS` (your public frontend origin)
- `ALLOWED_HOSTS` (your API host/domain)

Optional observability:

- `SENTRY_DSN`
- `SENTRY_TRACES_SAMPLE_RATE` (backend, `0.0` to `1.0`)
- `SENTRY_PROFILES_SAMPLE_RATE` (backend, `0.0` to `1.0`)
- `VITE_SENTRY_DSN`
- `VITE_SENTRY_ENABLED=true`
- `VITE_SENTRY_TRACES_SAMPLE_RATE` (frontend, `0.0` to `1.0`)

Recommended secrets:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

## 2. Build and start

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

The server container runs `alembic upgrade head` before startup, then runs `app.db.init_db` for non-destructive initialization.

## 3. Verify health

```bash
docker compose -f docker-compose.prod.yml ps
curl http://localhost:${APP_PORT:-80}/healthz
curl http://localhost:${APP_PORT:-80}/api/v1/health
```

## 4. Deploy updates

After pushing new code:

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

## 5. Recommended next step (internet-facing)

Put this stack behind a TLS reverse proxy (Nginx Proxy Manager, Caddy, or Traefik) and terminate HTTPS there.
