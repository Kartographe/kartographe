<!--
SPDX-FileCopyrightText: 2026 ChallengeMyProject

SPDX-License-Identifier: AGPL-3.0-only
-->

# Kartographe API

FastAPI backend for Kartographe.

## Stack

- **FastAPI** — HTTP layer
- **SQLModel** + **psycopg2** — ORM / Postgres driver
- **Alembic** — migrations
- **PyJWT** — auth tokens
- **FastAPI-MCP** — exposes `/v1/*` routes as MCP tools at `/mcp`
- **scalar-fastapi** — API reference served at `/docs`

## Layout

```
src/
  app_factory.py     # builds the FastAPI app (CORS, Scalar docs, MCP)
  settings.py        # pydantic-settings config (reads .env)
  database.py        # SQLModel engine + request-scoped session
  openapi_info.py    # public OpenAPI metadata
  openapi_tags.py    # Scalar sidebar tags
  models/            # SQLModel tables (BaseModel in _base.py)
  routes/api/        # routers (health, then /v1/* features)
  serializes/        # Pydantic response models
  forms/             # request payload models
  filters/           # list-endpoint query filters
  utils/             # shared helpers
alembic/             # migration environment + versions
server_api.py        # ASGI entrypoint (`app`)
```

## Run

Via docker-compose (from the repo root) — brings up Postgres + the API:

```bash
cp .env.example .env
docker compose up --build
```

- Docs: http://localhost:8000/docs
- OpenAPI: http://localhost:8000/openapi.json
- Health: http://localhost:8000/health

### Locally (app on host, Postgres in Docker)

```bash
docker compose up -d database
pip install -r requirements.txt
uvicorn server_api:app --reload
```

## Migrations

```bash
alembic revision --autogenerate -m "message"
alembic upgrade head
```

In Docker, set `RUN_MIGRATIONS=true` on the `back` service to apply migrations
on boot.

## Tests

```bash
pytest
```
