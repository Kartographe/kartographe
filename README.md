<!--
SPDX-FileCopyrightText: 2026 ChallengeMyProject
SPDX-License-Identifier: AGPL-3.0-only
-->

# Kartographe

Map what your software actually is.

Kartographe keeps a living model of a software product — its applications and
their routes, environments and versions; its databases down to columns and
migrations; its features, user journeys, personas and services — in one place,
owned by the team rather than scattered across wikis that went stale a year ago.

The API doubles as an [MCP](https://modelcontextprotocol.io) server, so an AI
agent can query that model as a set of tools rather than guess at your
architecture.

Open source, self-hostable, and sold as a hosted or on-premise service.

## Licence

**Open core.** Two licences, and where a file lives decides which applies:

| Location | Licence |
| --- | --- |
| Everything except `ee/` | [AGPL-3.0-only](./LICENSES/AGPL-3.0-only.txt) |
| `apps/back/ee`, `apps/front/src/ee` | [Elastic-2.0](./LICENSES/Elastic-2.0.txt) |

Every source file carries an SPDX header saying so, and that header is
authoritative. The repository follows the [REUSE](https://reuse.software)
specification.

**The AGPL core is the product, not a demo of one.** It is free forever, fully
functional, and CI deletes `ee/` and runs the test suite on every change
specifically so that stays true. If you self-host for your own use, you need
nothing from us.

Read [`LICENSING.md`](./LICENSING.md) for the scope, the reasoning, and an
honest account of what the licence does and does not enforce. Commercial
licensing: **license@kartographe.eu**.

> The repository shows no licence badge on GitHub. That is deliberate and
> explained in `LICENSING.md` — please read it before "fixing" it.

## Run it

Everything is driven by the root `.env`:

```bash
cp .env.example .env
docker compose up --build
```

| | |
| --- | --- |
| SPA | http://localhost:5173 |
| API reference (Scalar) | http://localhost:8000/docs |
| OpenAPI | http://localhost:8000/openapi.json |
| MCP | http://localhost:8000/mcp |
| Postgres | `localhost:5431` |

Set `RUN_MIGRATIONS=true` on the `api` service to apply migrations on boot.

To run one app on the host against the dockerised database, see
[`apps/back/README.md`](./apps/back/README.md) and
[`apps/front/README.md`](./apps/front/README.md).

## Layout

Two apps, scaffolded independently, orchestrated by one `docker-compose.yml` and
one `.env`:

```
apps/back    FastAPI + SQLModel + Alembic  (Python 3.14, pipenv)
apps/front   React 19 SPA                  (Vite 7, TypeScript, pnpm)
```

**The backend's OpenAPI spec is the single source of truth.** Three things
consume it: the Scalar reference, the MCP server, and the frontend's TypeScript
types. The frontend hand-writes no API types — `apps/front/src/api/generated/`
is committed and regenerated with `pnpm api:sync`. A route missing its
`operation_id`, `response_model` or `summary` breaks all three at once, so it is
treated as a defect rather than a detail.

## Contributing

Contributions to the AGPL core are welcome and it is where nearly everything
lives. Two things are specific to this project and worth knowing before you
open a pull request — a CLA, and the licensing boundary. Both are explained in
[`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Source availability

The AGPL's section 13 requires that users interacting with this software over a
network be offered its Corresponding Source. This version's source is at
https://github.com/Kartographe/kartographe.

If you deploy a modified version, that obligation is yours toward your own
users. Publishing this URL does not discharge it for you.

## Copyright

© 2026 ChallengeMyProject (SIREN 880 614 110) —
[challengemyproject.bzh](https://www.challengemyproject.bzh). See
[`NOTICE`](./NOTICE).
