# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**IT Envanter Takip Sistemi** — an IT inventory tracking system for managing computers, kiosks, printers, licenses, employees, and asset assignments. Includes dynamic category support and process/workflow management. The UI is in Turkish.

## Architecture

- **Backend**: Python 3.12 / FastAPI with SQLAlchemy ORM and SQLite database
- **Frontend**: React 19 (Vite 7, JSX — no TypeScript) with Tailwind CSS v4, Zustand state management, and Axios for API calls
- **Auth**: JWT-based authentication with `DEV_MODE=true` bypassing auth for development. Frontend also has MSAL (Azure AD) integration available.
- **Deployment**: Docker Compose — Nginx reverse proxy (HTTPS with self-signed certs) serving frontend, proxying `/api/` to backend on port 8000
- **Real-time**: WebSocket support for live updates

## Commands

### Backend
```bash
cd backend
pip install -r requirements.txt           # install dependencies
uvicorn app.main:app --reload             # dev server at :8000
python test_quick.py                      # quick smoke test
```

### Frontend
```bash
cd frontend
npm install                               # install dependencies
npm run dev                               # dev server at :5173 (proxies /api to :8000)
npm run build                             # production build to dist/
npm run lint                              # ESLint
```

### Docker
```bash
docker-compose up --build                 # full stack (backend :8000, frontend :80/:443)
```

## Backend Structure

```
backend/app/
├── main.py              # FastAPI app, lifespan (auto-migrations, admin seed)
├── core/
│   ├── config.py        # pydantic-settings (env vars, JWT config, DEV_MODE)
│   ├── database.py      # SQLAlchemy engine, SessionLocal, get_db dependency
│   └── security.py      # JWT and password utilities
├── api/v1/
│   ├── router.py        # aggregates all endpoint routers under /api/v1
│   └── endpoints/       # one file per domain (computers, kiosks, printers, etc.)
├── models/              # SQLAlchemy ORM models
├── schemas/             # Pydantic request/response schemas
└── crud/                # DB query functions per domain
```

All API routes are prefixed `/api/v1`. Database migrations are handled inline in `main.py` lifespan (ALTER TABLE with try/except for SQLite compatibility).

## Frontend Structure

```
frontend/src/
├── App.jsx              # routes, auth guard (ProtectedRoutes)
├── services/api.js      # Axios instance, all API functions, JWT interceptor
├── store/useStore.js    # Zustand global store
├── config/authConfig.js # MSAL Azure AD config
├── hooks/useWebSocket.js
├── pages/               # page-level components (Dashboard, Computers, Kiosks, etc.)
└── components/          # Atomic Design: atoms/ molecules/ organisms/ templates/
```

API base URL defaults to `/api/v1` (overridable via `VITE_API_URL` env var). Auth token stored in `localStorage` as `auth_token`.

## Key Domains

Computers, Kiosks, Printers, Employees, Licenses, Assignments (device↔employee), License Assignments, Dynamic Categories (user-defined inventory types), Processes (workflow steps). Most domains support bulk create endpoints.

## Environment Variables

Backend (via `.env` or env): `DATABASE_URL`, `JWT_SECRET_KEY`, `DEV_MODE`, `CORS_ORIGINS`, `DEBUG`
Frontend: `VITE_API_URL`
