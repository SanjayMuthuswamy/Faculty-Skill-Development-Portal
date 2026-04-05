# Faculty Skill Development Portal

Faculty Skill Development Portal (FSDP) is a full-stack platform for managing faculty learning, assessment, and performance workflows. It combines a FastAPI backend, a React + Vite frontend, PostgreSQL persistence, and role-based access for administrators and faculty users.

## What It Does

The current codebase supports both admin and faculty workflows, including:

- Faculty account registration and profile management
- Skill tracking and verification
- Program and enrollment management
- Course publishing, enrollment, learning progress, quizzes, and assessments
- Question banks, question packs, tests, and attempt tracking
- AI-assisted question generation, coaching, roadmaps, and growth plans
- Faculty analytics, reports, and department-level summaries
- Discussion/forum-style interactions and faculty query handling
- Personalized news preferences and news feed delivery

## Tech Stack

### Frontend

- React 18
- TypeScript
- Vite 5
- Tailwind CSS
- TanStack Query
- React Hook Form + Zod
- Axios
- Framer Motion
- Recharts
- Sentry

### Backend

- FastAPI
- SQLAlchemy 2
- Alembic
- PostgreSQL
- Pydantic v2
- JWT authentication
- Passlib / bcrypt
- Sentry

## Repository Structure

```text
Faculty-Skill-Development-Portal/
|-- client/                 # React frontend
|   |-- src/
|   |   |-- app/           # Providers and router
|   |   |-- components/    # Shared UI and layout
|   |   |-- lib/           # API clients and utilities
|   |   `-- pages/         # Admin and faculty screens
|-- server/                 # FastAPI backend
|   |-- app/
|   |   |-- api/v1/routes/ # REST endpoints
|   |   |-- core/          # Config, security, monitoring, cache
|   |   |-- db/            # DB setup
|   |   |-- models/        # SQLAlchemy models
|   |   |-- schemas/       # Pydantic schemas
|   |   `-- services/      # Business logic
|   |-- migrations/        # Alembic migrations
|   |-- tests/             # Backend tests
|   `-- seed_db.py         # Seed/demo data script
|-- maintenance_scripts/    # Project maintenance helpers
|-- docker-compose.yml      # Local Docker services
`-- README.md
```

## Main Application Areas

### Admin UI

Key screens under `client/src/pages/admin/` include:

- Dashboard
- Faculty list, details, performance, and account management
- Programs
- Course manager and course analytics
- Question bank and question packs
- Test builder
- AI question generation and draft review
- Query manager
- Reports

### Faculty UI

Key screens under `client/src/pages/faculty/` include:

- Dashboard and profile
- Programs and program details
- Courses, course detail, module quiz, assessment, and certificate
- Tests, practice, and result/player flows
- AI coach and AI growth plan
- Trends
- Forum

### Backend APIs

The backend currently exposes route groups for:

- `auth`
- `users`
- `faculty`
- `skills`
- `programs`
- `enrollments`
- `question-packs`
- `tests`
- `attempts`
- `growth-plans`
- `analytics`
- `news`
- `ai-questions`
- `practice-sets`
- `roadmaps`
- `ai-coach`
- `courses`
- `discussions`
- `queries`
- `health`

## Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 15+ for local non-Docker development
- Docker Desktop or Docker Engine for containerized setup

## Environment Setup

### Backend

Copy [`server/.env.example`](/d:/Projects/Faculty-Skill-Development-Portal/server/.env.example) to `server/.env` and update values as needed.

Important variables:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGINS`
- `BOOTSTRAP_DEMO_USERS`
- `DEMO_ADMIN_EMAIL`
- `DEMO_ADMIN_PASSWORD`
- `DEMO_FACULTY_EMAIL`
- `DEMO_FACULTY_PASSWORD`
- `NEWSDATA_API_KEY`
- `SENTRY_DSN`

### Frontend

Copy [`client/.env.example`](/d:/Projects/Faculty-Skill-Development-Portal/client/.env.example) to `client/.env`.

Important variables:

- `VITE_API_BASE_URL`
- `VITE_SENTRY_DSN`
- `VITE_SENTRY_ENABLED`

## Run With Docker

The root [`docker-compose.yml`](/d:/Projects/Faculty-Skill-Development-Portal/docker-compose.yml) starts:

- PostgreSQL on `localhost:5432`
- FastAPI server on `localhost:8000`

The compose file expects JWT secrets in your shell environment before startup.

```powershell
$env:JWT_ACCESS_SECRET="change-me"
$env:JWT_REFRESH_SECRET="change-me-too"
docker compose up --build
```

Notes:

- The current compose file does not start the Vite frontend.
- Run the frontend separately with `npm run dev` from `client/`.
- Demo users are bootstrapped by Docker with:
  - `admin@fsdp.com` / `123456`
  - `faculty@fsdp.com` / `123456`

## Local Development

### 1. Start the backend

```powershell
cd server
python -m venv venv
.\venv\Scripts\activate
pip install -e .[dev]
```

Create `server/.env`, then run:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Seed data if needed

From `server/`:

```powershell
python seed_db.py
```

If you prefer demo-user bootstrap through environment variables, set:

- `BOOTSTRAP_DEMO_USERS=true`
- `DEMO_ADMIN_PASSWORD`
- `DEMO_FACULTY_PASSWORD`

### 3. Start the frontend

```powershell
cd client
npm install
npm run dev
```

## Default Local URLs

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Available Scripts

### Frontend

From `client/`:

```powershell
npm run dev
npm run build
npm run preview
npm run type-check
npm test
```

### Backend

From `server/`:

```powershell
pytest
```

Helpful dev commands:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
alembic upgrade head
```

## Authentication

- Authentication is JWT-based.
- The API exposes login and current-user endpoints under `/api/v1/auth`.
- The frontend uses protected routes for role-aware navigation.
- Roles currently used across the app are `ADMIN` and `FACULTY`.

## File Uploads

The FastAPI app mounts an uploads directory at `/uploads`. Uploaded assets are stored under `server/uploads/`.

## Monitoring and Production Notes

- Sentry is wired into both frontend and backend.
- API docs can be disabled with `ENABLE_API_DOCS=false`.
- Host header filtering is supported via `ALLOWED_HOSTS`.
- GZip and CORS are configurable from backend settings.

Production deployment references:

- [`docs/PRODUCTION_DEPLOYMENT.md`](/d:/Projects/Faculty-Skill-Development-Portal/docs/PRODUCTION_DEPLOYMENT.md)
- [`docs/VERCEL_RENDER_DEPLOY.md`](/d:/Projects/Faculty-Skill-Development-Portal/docs/VERCEL_RENDER_DEPLOY.md)

## Current Version

- App version: `0.1.0`
- README updated: `2026-04-04`
