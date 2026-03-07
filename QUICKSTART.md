# Quick Start Guide

## One-Command Setup (Recommended)

### Using Docker Compose
```bash
docker-compose up
```

**This will:**
- ✅ Start PostgreSQL database on port 5432
- ✅ Initialize database schema and seed demo users
- ✅ Start FastAPI server on port 8000
- ✅ API docs available at http://localhost:8000/docs

**Frontend:**
- Run separately: `cd client && npm install && npm run dev`
- Access at http://localhost:5173

---

## Demo Login Credentials

| Role   | Email              | Password    |
|--------|-------------------|-------------|
| Admin  | sanjay@fsdp.com   | 123456      |
| Faculty| faculty@fsdp.com  | 123456      |

---

## Troubleshooting

### Port Conflicts
```bash
# Backend (8000) or Frontend (5173) already in use?
docker-compose down
# Or change ports in docker-compose.yml and vite.config.ts
```

### Database Connection Failed
```bash
# Check if PostgreSQL container is healthy
docker-compose ps
# Restart services
docker-compose restart postgres server
```

### Frontend Can't Connect to Backend
```bash
# Verify CORS is configured
# Check CORS_ORIGINS in server/.env matches frontend origin
# Default: http://localhost:5173
```

### Node Modules Issues
```bash
cd client
rm -rf node_modules package-lock.json
npm install
```

---

## Development Workflow

### Backend Development
```bash
cd server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Ensure PostgreSQL is running (docker-compose up postgres)
uvicorn app.main:app --reload
```

### Frontend Development
```bash
cd client
npm install
cp .env.example .env
npm run dev
```

### Database Migrations
```bash
cd server
# Run migration
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "Add new table"
```

---

## Key Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | `/api/v1/auth/login` | Login | ❌ No |
| GET | `/api/v1/auth/me` | Get user info | ✅ Yes |
| GET | `/api/v1/health` | Health check | ❌ No |

---

## Frontend Routes

| Path | Protected | Required Role | Purpose |
|------|-----------|---------------|---------|
| `/login` | ❌ No | - | Login page |
| `/admin/dashboard` | ✅ Yes | ADMIN | Admin dashboard |
| `/faculty/dashboard` | ✅ Yes | FACULTY | Faculty dashboard |

---

## Next Steps

1. **Extend Models**: Add new database models in `server/app/models/`
2. **Create Endpoints**: Add routes in `server/app/api/v1/routes/`
3. **Build UI**: Create pages in `client/src/pages/`
4. **Database**: Run `alembic upgrade head` after migrations
5. **Deploy**: Use docker-compose or build images separately

---

## Useful Commands

### Docker
```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f server

# Rebuild images
docker-compose up --build
```

### Backend
```bash
# Run tests
pytest

# Format code
black .

# Type check
mypy .

# Lint
ruff check .
```

### Frontend
```bash
# Type check
npm run type-check

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│            http://localhost:5173                            │
└────────────────────────┬────────────────────────────────────┘
                         │ API Calls
                         │ (Axios with JWT Auth)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (FastAPI)                          │
│         http://localhost:8000 (API docs: /docs)            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Authentication → RBAC → Business Logic → Database   │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ SQL Queries
                         │ (SQLAlchemy)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                        │
│            docker-compose postgres service                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Environment Files

### Backend (`server/.env`)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fsdp_db
JWT_ACCESS_SECRET=<change-me-in-production>
JWT_REFRESH_SECRET=<change-me-in-production>
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=["http://localhost:5173"]
DEBUG=True
```

### Frontend (`client/.env`)
```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## Common Tasks

### Add a New User Model Field
1. Update `server/app/models/user.py`
2. Create migration: `alembic revision --autogenerate -m "Add field"`
3. Run migration: `alembic upgrade head`
4. Update schemas in `server/app/schemas/user.py`

### Add a New API Endpoint
1. Create route function in `server/app/api/v1/routes/new_route.py`
2. Include router in `server/app/api/v1/api.py`
3. Add Pydantic schemas as needed
4. Create service logic if complex

### Add Frontend Page
1. Create page component in `client/src/pages/`
2. Add route in `client/src/app/router/AppRouter.tsx`
3. If protected, use `<ProtectedRoute>` wrapper
4. Call API using `authApi` from `lib/api/`

---

**For detailed documentation, see [README.md](../README.md)**
