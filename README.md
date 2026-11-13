# Siddhi

Siddhi is an individualized education program (IEP) tracking platform for
schools, special educators, therapists, psychologists, school heads,
administrators, and guardians.

The repository contains:

- A FastAPI/PostgreSQL backend with cookie-based authentication and role-based
  access control.
- A Next.js App Router frontend with the guardian and staff view families.
- Alembic migrations and synthetic demo data for local testing.
- Excel IEP workbook export support.

## Repository map

```text
backend/       FastAPI API, SQLAlchemy models, migrations, tests
docs/          Design, implementation, local setup, and schema documentation
frontend/      Next.js App Router + React + TypeScript application
scripts/       Repeatable local startup helpers
vercel.json    Vercel configuration for the Next.js application
```

## Requirements

- Python 3.11+ (the current development environment uses `.venv`)
- Node.js 20+
- PostgreSQL 14+
- npm

## Local setup

### 1. Configure environment

Copy the example file and set the PostgreSQL connection and secret:

```bash
cp .env.example .env
```

Keep SMTP variables empty for local login. They are only required for password
reset email delivery.

### 2. Install backend dependencies

```bash
python -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
```

### 3. Migrate, seed, and start the backend

```bash
./scripts/dev-start-backend.sh
```

This applies `alembic upgrade head`, runs the idempotent demo seed, and starts
FastAPI at `http://127.0.0.1:8000`.

### 4. Start the frontend

In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:3000/login`.

For the full local walkthrough, see
[docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md).

## Demo accounts

| Mode | Login identifier | Password |
|---|---|---|
| School staff | `FAC-ADMIN-001` | `SiddhiAdmin2026!` |
| Guardian | `guardian.multi@siddhi.test` | `SiddhiGuardian2026!` |

Staff authenticate with their faculty ID. Guardian authentication uses email.
Staff email addresses are not accepted as login identifiers. These are
synthetic local-only accounts; do not use them in a deployed environment.

All seeded faculty IDs:

| Faculty ID | Role | Password |
|---|---|---|
| `FAC-ADMIN-001` | School administrator | `SiddhiAdmin2026!` |
| `FAC-HEAD-001` | School head | `SiddhiHead2026!` |
| `FAC-EDU-001` | Special educator | `SiddhiEducator2026!` |
| `FAC-EDU-002` | Special educator | `SiddhiEducator2026!` |
| `FAC-THER-001` | Therapist | `SiddhiTherapy2026!` |
| `FAC-PSY-001` | Psychologist | `SiddhiPsych2026!` |

## API

- Health: `GET /health`
- OpenAPI in development: `GET /docs`
- API prefix: `/api/v1`
- Authentication uses secure HttpOnly access and refresh cookies.
- The frontend uses `/api/v1` through the Next.js same-origin API bridge.
- Set `BACKEND_URL` for the Next.js server to reach FastAPI.

To point a separately deployed frontend at a deployed API, set:

```text
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1
```

The API must allow the deployed frontend origin in its CORS configuration and
must use HTTPS in non-development environments.

## Database

The complete current schema, relationships, constraints, and deletion rules
are documented in [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md).

Apply migrations manually with:

```bash
cd backend
../.venv/bin/alembic upgrade head
```

Run the seed manually with:

```bash
cd backend
../.venv/bin/python -m app.seed_demo
```

## Testing and validation

Frontend production build:

```bash
cd frontend
npm run build
```

Frontend lint configuration is not currently included in the repository, so
`npm run lint` requires an ESLint flat config before it can run.

Backend tests:

```bash
cd backend
../.venv/bin/pytest -q
```

Backend tests require a reachable PostgreSQL database configured by `.env`.

## Next.js and Vercel deployment

The repository is configured for a Vercel-hosted Next.js application through
[vercel.json](vercel.json). In Vercel, import the repository and configure:

- **Framework preset:** Next.js
- **Build command:** already supplied by `vercel.json`
- **Output directory:** managed by Next.js
- **Environment variable:** `NEXT_PUBLIC_API_BASE_URL=https://<your-api-host>/api/v1` (optional; use the same-origin bridge by default)
- **Environment variable:** `BACKEND_URL=https://<your-api-host>`

The Next.js application owns the browser UI and same-origin API bridge. The
current domain logic and PostgreSQL access remain in the FastAPI service behind
that bridge while endpoint parity is migrated incrementally. Deploy the
FastAPI application and PostgreSQL database separately
to a Python-capable service such as Render, Railway, Fly.io, or a managed
container platform. Vercel should host the static React frontend, not the
long-running FastAPI process.

For the API deployment, set at minimum:

```text
APP_ENV=production
DATABASE_URL=<managed PostgreSQL URL>
SECRET_KEY=<long random secret>
FRONTEND_ORIGIN=https://<your-vercel-domain>
ALLOWED_ORIGINS=["https://<your-vercel-domain>"]
```

Run migrations as a release step before serving traffic:

```bash
alembic upgrade head
```

Do not run the demo seed in production unless you intentionally want the
synthetic demo school and users.

## Documentation

- [Design reference](docs/DESIGN.md)
- [Implementation plan](docs/SIDDHI_IMPLEMENTATION_PLAN.md)
- [Local development and login](docs/LOCAL_DEVELOPMENT.md)
- [Database schema](docs/DATABASE_SCHEMA.md)
- [Build status](BUILD_STATUS.md)
