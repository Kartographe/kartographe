#!/bin/sh
set -e

# Apply database migrations before boot when RUN_MIGRATIONS=true. Left off by
# default so the service can come up to serve the docs without a reachable DB.
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    echo "Running database migrations…"
    alembic upgrade head
fi

exec uvicorn server_api:app --host 0.0.0.0 --port "${PORT:-8000}"
