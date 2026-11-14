# Local development and login

## Start the Next.js application

Next.js is the single application runtime: it serves the UI and `/api/v1` server routes. There is no separate FastAPI server to start.

From the repository root, ensure `.env` contains a reachable `DATABASE_URL` and a strong `SECRET_KEY`. Apply the schema and create synthetic test records if needed:

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

Open `http://localhost:3000/login`.

## Demo accounts

These synthetic accounts are created by `backend/app/seed_demo.py`. Staff sign in with faculty IDs; guardians sign in with email addresses.

| Account | Login identifier | Password |
|---|---|---|
| School administrator | `FAC-ADMIN-001` | `SiddhiAdmin2026!` |
| Principal / school head | `FAC-HEAD-001` | `SiddhiHead2026!` |
| Special educator 1 | `FAC-EDU-001` | `SiddhiEducator2026!` |
| Special educator 2 | `FAC-EDU-002` | `SiddhiEducator2026!` |
| Therapist | `FAC-THER-001` | `SiddhiTherapy2026!` |
| Psychologist | `FAC-PSY-001` | `SiddhiPsych2026!` |
| Psychiatrist | `FAC-PSYCH-001` | `SiddhiPsychiatrist2026!` |
| Guardian (one child) | `guardian.single@siddhi.test` | `SiddhiGuardian2026!` |
| Guardian (two children) | `guardian.multi@siddhi.test` | `SiddhiGuardian2026!` |

The seed contains student profiles but does not create student accounts. Students are not an authenticated role in the supplied implementation plan.

## Health check

```bash
curl http://localhost:3000/api/health
```

A healthy response reports `"status":"healthy"` and `"database":"connected"`.

## Password reset

In development, when SMTP is not configured, the reset URL is written to the Next.js server console. In deployed environments, configure SMTP environment variables so the reset email can be delivered.
