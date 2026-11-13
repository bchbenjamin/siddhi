# Local development and login

## Start the backend

From the repository root:

```bash
./scripts/dev-start-backend.sh
```

The script loads the existing `.env`, applies pending Alembic migrations,
runs the idempotent demo seed, and starts the API on
`http://127.0.0.1:8000`. SMTP settings are not needed for local login.

Start the frontend in a second terminal:

```bash
cd frontend
npm run dev
```

Open `http://127.0.0.1:5173/login`.

## Demo accounts

These accounts are created by `backend/app/seed_demo.py`:

| Mode | Email | Password |
|---|---|---|
| School staff | `admin@siddhi.test` | `SiddhiAdmin2026!` |
| Guardian | `guardian.multi@siddhi.test` | `SiddhiGuardian2026!` |

The seed is safe to run repeatedly. Once the demo school exists, it skips
creating duplicate records.

## Health check

```bash
curl http://127.0.0.1:8000/health
```

The response should report `"status":"healthy"` and
`"database":"connected"`.
