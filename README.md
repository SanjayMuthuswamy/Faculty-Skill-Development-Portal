# Faculty Skill Development Portal (FSDP)

A production-grade full-stack boilerplate for a Faculty Skill Development Portal with role-based access control (RBAC).

## 📋 Features

- **Backend API**: FastAPI with SQLAlchemy 2.0 ORM
- **Authentication**: JWT-based with access and refresh tokens
- **Database**: PostgreSQL with Alembic migrations
- **Authorization**: Role-based access control (ADMIN, FACULTY)
- **Frontend**: React 18 with TypeScript, Vite, and Tailwind CSS
- **Type Safety**: Pydantic v2 for backend, TypeScript for frontend
- **Modern UI**: Responsive design with Tailwind CSS
- **State Management**: TanStack Query for server state, React Context for auth
- **Form Validation**: React Hook Form + Zod on frontend, Pydantic on backend
- **Docker Support**: Docker Compose for local development

## 🏗️ Project Structure

```
fsdp-portal/
├── server/                          # Backend (FastAPI)
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── routes/
│   │   │   │   ├── auth.py         # Authentication endpoints
│   │   │   │   └── health.py       # Health check endpoint
│   │   │   ├── api.py              # API router aggregation
│   │   │   └── deps.py             # Dependency injection
│   │   ├── core/
│   │   │   ├── config.py           # Configuration from env vars
│   │   │   ├── security.py         # JWT and password utilities
│   │   │   └── logging.py          # Structured logging
│   │   ├── db/
│   │   │   ├── base.py             # SQLAlchemy base
│   │   │   ├── session.py          # Database session management
│   │   │   └── init_db.py          # Database initialization & seeding
│   │   ├── models/
│   │   │   └── user.py             # User model with roles
│   │   ├── schemas/
│   │   │   ├── auth.py             # Auth request/response schemas
│   │   │   └── user.py             # User schemas
│   │   ├── services/
│   │   │   └── auth_service.py     # Authentication business logic
│   │   └── main.py                 # FastAPI app entry point
│   ├── alembic/
│   │   ├── versions/
│   │   │   └── 001_initial.py      # Initial schema migration
│   │   ├── env.py                  # Alembic configuration
│   │   └── __init__.py
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── requirements.txt
│   ├── alembic.ini
│   └── .env.example
│
├── client/                          # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── app/
│   │   │   ├── providers/
│   │   │   │   ├── AuthProvider.tsx       # Auth context provider
│   │   │   │   └── QueryProvider.tsx      # TanStack Query provider
│   │   │   └── router/
│   │   │       ├── AppRouter.tsx          # Main router setup
│   │   │       ├── ProtectedRoute.tsx     # Protected route component
│   │   │       └── routes.ts              # Route constants
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx            # Navigation sidebar
│   │   │   │   ├── Topbar.tsx             # Top navigation bar
│   │   │   │   └── PageShell.tsx          # Layout wrapper
│   │   │   └── ui/
│   │   │       ├── Button.tsx
│   │   │       ├── Input.tsx
│   │   │       ├── Card.tsx
│   │   │       ├── Modal.tsx
│   │   │       └── Toast.tsx
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   │   ├── http.ts                # Axios instance with interceptors
│   │   │   │   └── auth.ts                # Auth API calls
│   │   │   └── storage/
│   │   │       └── storage.ts             # LocalStorage utilities
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── admin/
│   │   │   │   └── AdminDashboard.tsx
│   │   │   └── faculty/
│   │   │       └── FacultyDashboard.tsx
│   │   ├── styles/
│   │   │   └── globals.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── package.json
│   └── .env.example
│
├── docker-compose.yml
├── .gitignore
└── README.md (this file)
```

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

### Setup with Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   cd fsdp-portal
   ```

2. **Start all services**
   ```bash
   docker-compose up
   ```

   This will:
   - Start PostgreSQL database
   - Initialize the database with seed data
   - Start the FastAPI server at `http://localhost:8000`

3. **Access the application**
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:8000`
   - API Documentation: `http://localhost:8000/docs`

4. **Login with demo accounts**
   - Admin: `admin@fsdp.com` / `Admin@123`
   - Faculty: `faculty@fsdp.com` / `Faculty@123`

### Local Setup (Development)

#### Backend Setup

1. **Navigate to server directory**
   ```bash
   cd server
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start PostgreSQL** (ensure it's running)
   ```bash
   docker compose up postgres
   ```

6. **Initialize database**
   ```bash
   python -c "from app.db.init_db import init_db_command; init_db_command()"
   ```

7. **Run Alembic migrations** (optional, already done in init_db)
   ```bash
   alembic upgrade head
   ```

8. **Start the server**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

#### Frontend Setup

1. **Navigate to client directory**
   ```bash
   cd client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env if needed (default localhost:8000 is fine)
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   Frontend will be available at `http://localhost:5173`

## 📚 API Documentation

### Available Endpoints

#### Authentication
- **POST** `/api/v1/auth/login` - Login with email and password
  ```json
  {
    "email": "admin@fsdp.com",
    "password": "Admin@123"
  }
  ```
  Response:
  ```json
  {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "token_type": "bearer"
  }
  ```

- **GET** `/api/v1/auth/me` - Get current user info (requires auth token)
  ```json
  {
    "id": "uuid",
    "name": "Admin User",
    "email": "admin@fsdp.com",
    "role": "ADMIN",
    "is_active": true,
    "created_at": "2024-01-01T12:00:00Z"
  }
  ```

#### Health
- **GET** `/api/v1/health` - Health check endpoint
  ```json
  {
    "status": "ok",
    "database": "connected"
  }
  ```

### Interactive API Documentation

FastAPI automatically generates interactive API documentation:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## 🔐 Authentication & Authorization

### JWT Implementation
- **Access Token**: Short-lived (default 30 min)
- **Refresh Token**: Long-lived (default 7 days)
- **Signing Algorithm**: HS256

### Role-Based Access Control (RBAC)
- **ADMIN**: Full system access
- **FACULTY**: Faculty-specific features

Routes are protected using the `ProtectedRoute` component (frontend) and dependency injection (backend).

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'FACULTY') DEFAULT 'FACULTY',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/fsdp_db

# JWT
JWT_ACCESS_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]

# Server
DEBUG=True
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:8000
```

## 📦 Build & Deployment

### Build Frontend
```bash
cd client
npm run build
# Output in dist/
```

### Build Docker Image
```bash
docker build -t fsdp-server:latest ./server
```

### Environment-Specific Builds
Create separate `.env.production` and update configuration in `server/app/core/config.py` and `client/vite.config.ts` for production builds.

## ✅ Security Considerations

1. **Secrets Management**: Use strong, randomly generated secrets for JWT
2. **CORS**: Configure CORS origins appropriately for production
3. **Password Hashing**: Using bcrypt with salting (via passlib)
4. **HTTPS**: Deploy behind TLS/SSL in production
5. **Refresh Token Rotation**: Consider implementing token rotation for security
6. **Rate Limiting**: Add rate limiting middleware to prevent brute force attacks
7. **Input Validation**: All inputs validated with Pydantic and Zod

## 🧪 Testing

### Backend Tests
```bash
cd server
pytest
```

### Frontend Tests
```bash
cd client
npm test
```

## 📝 Development Guidelines

### Code Style
- Backend: Follow PEP 8, use Black formatter
- Frontend: Follow ESLint config, use Prettier

### Type Checking
- Backend: `mypy`
- Frontend: `tsc`

### Git Workflow
1. Create feature branch
2. Make changes
3. Run tests and linting
4. Create pull request

## 🚨 Troubleshooting

### Port Already in Use
```bash
# Find process using port
lsof -i :8000
# Kill it if needed
kill -9 <PID>
```

### Database Connection Issues
1. Ensure PostgreSQL is running
2. Check `DATABASE_URL` in `.env`
3. Verify database exists: `psql -l`

### Frontend Not Loading
1. Check frontend is running: `npm run dev`
2. Verify `VITE_API_BASE_URL` points to backend
3. Check CORS configuration in backend

### Authentication Errors
1. Verify tokens are being stored in localStorage
2. Check JWT secrets match between backend and any token generation
3. Ensure tokens haven't expired (check expiry times)

## 📖 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy 2.0 Documentation](https://docs.sqlalchemy.org/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vite Documentation](https://vitejs.dev/)

## 📄 License

This boilerplate is provided as-is for educational and development purposes.

## 🤝 Contributing

To extend this boilerplate:
1. Add new database models in `server/app/models/`
2. Create new API routes in `server/app/api/v1/routes/`
3. Add frontend pages in `client/src/pages/`
4. Update both `.env.example` files with new variables
5. Document changes in this README

## ⚡ Next Steps

This is a production-grade foundation. Common additions include:

### Backend
- [ ] Email verification
- [ ] Password reset flow
- [ ] User management endpoints
- [ ] Course management system
- [ ] Assessment/grading system
- [ ] File upload handling
- [ ] Pagination and filtering
- [ ] Search functionality

### Frontend
- [ ] User management interface
- [ ] Course creation/management
- [ ] Student enrollment
- [ ] Assignment submission
- [ ] Grading interface
- [ ] Progress tracking
- [ ] Notifications system
- [ ] File upload UI

---

**Version**: 0.1.0  
**Last Updated**: 2024-01-15
