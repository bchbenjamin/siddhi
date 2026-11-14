# Siddhi

Siddhi is an Individualized Education Program (IEP) tracking platform for schools, special educators, therapists, psychologists, psychiatrists, school heads, administrators, and guardians.

## Application architecture

- **Next.js App Router** is the sole application runtime and serves both the frontend and same-origin `/api/v1` server routes.
- Next.js server handlers connect directly to PostgreSQL using `pg`; authentication uses Argon2 password hashes, signed access JWTs, rotating refresh tokens, and HttpOnly cookies.
- Role and student access checks are enforced in the server layer. Guardian visibility and staff assignment rules are applied to student data.
- Excel exports are generated in the Next.js server using ExcelJS.
- The former FastAPI endpoint files remain as migration/reference material and are not used by the deployed Next.js application. Python/Alembic remains the one-time schema migration and synthetic data provisioning toolchain.

## Repository map

```text
backend/       Legacy API reference, SQLAlchemy models, Alembic migrations, demo seed
frontend/      Next.js App Router, server API, PostgreSQL integration, UI
scripts/       Local database setup helpers
docs/          Design, implementation plan, local setup, and schema documentation
vercel.json    Single Next.js Vercel project configuration
```

## Requirements

- Node.js 20+
- npm
- PostgreSQL 14+
- Python 3.11+ only for Alembic migrations and the existing synthetic demo seed

## Local setup

1. Configure `.env` at the repository root from `.env.example`. Set `DATABASE_URL` and a long random `SECRET_KEY`. Set SMTP values if password-reset email delivery is required.
2. Create the schema and optionally seed synthetic local data:

```bash
python -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
cd backend
../.venv/bin/alembic upgrade head
../.venv/bin/python -m app.seed_demo
cd ../frontend
npm ci
npm run dev
```

Open `http://localhost:3000/login`. There is no FastAPI server to start; Next.js serves the views and API routes together.

## Demo accounts (synthetic; local development only)

Staff log in using their faculty ID. Guardians log in using their email address.

| Faculty ID | Role | Password |
|---|---|---|
| `FAC-ADMIN-001` | School administrator | `SiddhiAdmin2026!` |
| `FAC-HEAD-001` | Principal / school head | `SiddhiHead2026!` |
| `FAC-EDU-001` | Special educator | `SiddhiEducator2026!` |
| `FAC-EDU-002` | Special educator | `SiddhiEducator2026!` |
| `FAC-THER-001` | Therapist | `SiddhiTherapy2026!` |
| `FAC-PSY-001` | Psychologist | `SiddhiPsych2026!` |
| `FAC-PSYCH-001` | Psychiatrist | `SiddhiPsychiatrist2026!` |

| Guardian email | Password |
|---|---|
| `guardian.single@siddhi.test` | `SiddhiGuardian2026!` |
| `guardian.multi@siddhi.test` | `SiddhiGuardian2026!` |

The demo seed includes student records, not student login accounts. The implementation plan defines guardian and school staff workspaces; it does not define a student login role or student credentials. Do not use these synthetic accounts on the production site.

If the demo school already exists, rerunning the seed ensures the psychiatrist demo account, membership, and sample student assignment exist without duplicating the rest of the data.

## API and health

- Health: `GET /api/health`
- API prefix: `/api/v1`
- Authentication: `/api/v1/auth/*`
- The browser calls same-origin Next.js routes; no separate API origin or CORS configuration is required.

## Database

The PostgreSQL schema and relationships are documented in [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md). Apply schema migrations with:

```bash
cd backend
../.venv/bin/alembic upgrade head
```

Do not run the synthetic demo seed in production unless you explicitly intend to create demo records and demo login accounts.

## Validation

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm test -- --run
npm run build
```

Backend schema/seed code is still Python-based tooling; it is not part of the deployed request path.

## Vercel deployment

The repository root is the Vercel Root Directory. `vercel.json` builds the Next.js app from `frontend/`. Required environment variables include `DATABASE_URL` and `SECRET_KEY`. Set `FRONTEND_ORIGIN` to the deployed origin. For password resets, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and `SMTP_FROM`.

Apply schema migrations against the target PostgreSQL database before deploying schema changes. Do not run the demo seed against production by default.

## Documentation

- [Design reference](docs/DESIGN.md)
- [Implementation plan](docs/SIDDHI_IMPLEMENTATION_PLAN.md)
- [Local development](docs/LOCAL_DEVELOPMENT.md)
- [Database schema](docs/DATABASE_SCHEMA.md)
- [Build status](BUILD_STATUS.md)
