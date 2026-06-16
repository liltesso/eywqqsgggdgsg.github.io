#!/usr/bin/env bash
# Convenience launcher for local development.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "No .env found — copying from .env.example (edit it before going live)."
  cp .env.example .env
fi

python -m pip install -q -r requirements.txt
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --reload
