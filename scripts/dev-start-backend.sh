#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="${PYTHON:-$ROOT_DIR/.venv/bin/python}"

if [[ ! -x "$PYTHON" ]]; then
  echo "Python virtual environment not found at $PYTHON" >&2
  echo "Create it and install backend/requirements.txt before starting Siddhi." >&2
  exit 1
fi

cd "$ROOT_DIR/backend"
"$PYTHON" -m alembic upgrade head
"$PYTHON" -m app.seed_demo
exec "$ROOT_DIR/.venv/bin/uvicorn" app.main:app --host "${HOST:-127.0.0.1}" --port "${PORT:-8000}"
