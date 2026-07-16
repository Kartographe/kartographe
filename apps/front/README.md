<!--
SPDX-FileCopyrightText: 2026 ChallengeMyProject

SPDX-License-Identifier: AGPL-3.0-only
-->

# Kartographe Front

React SPA for Kartographe.

## Stack

- **Vite** + **React 19** + **TypeScript**
- **TanStack Router** (file-based routing) + **TanStack Query**
- **Ant Design v6** (+ `@ant-design/cssinjs`) — base UI
- **Tailwind CSS v4**
- **openapi-fetch** / **openapi-react-query** — typed API client
- **@t3-oss/env-core** + **zod** — validated env
- **Biome / Ultracite** — lint & format

## Layout

```
src/
  main.tsx            # app entry (query client + router)
  api/                # openapi-fetch client + $api (react-query) + generated types
  lib/
    env/              # validated import.meta.env
    theme/            # Ant Design ConfigProvider + light/dark store
    antd/             # message bridge (toasts outside React)
    tanstack/         # query-client factory
  routes/             # TanStack Router file routes (__root, index …)
  components/         # shared components
  features/           # feature folders
  utils/              # helpers (cn …)
scripts/api-sync.mjs  # regenerate src/api/generated/* from the API's openapi.json
docker/               # Dockerfile (build → nginx) + nginx conf
```

## Develop

```bash
pnpm install
cp .env.example .env.local   # adjust VITE_API_URL if needed
pnpm dev                     # http://localhost:5173
```

## Sync API types

With the API running (see `apps/back`):

```bash
pnpm api:sync                # writes src/api/generated/{schema.d.ts,schema.enums.ts}
```

## Build / lint

```bash
pnpm build       # tsc -b && vite build
pnpm check       # ultracite (biome) lint
```

## Docker

Built and served via nginx from the root `docker-compose.yml`:

```bash
docker compose up --build front   # http://localhost:5173
```
