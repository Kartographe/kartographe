# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

# Multi-stage build: compile the Vite bundle with ##VITE_*## placeholders,
# then serve it with nginx. The placeholders are substituted at container
# start by docker/prepare.sh (installed into /docker-entrypoint.d), so the
# same image can be repointed at another API / environment without a rebuild.
FROM node:24-alpine AS build

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Bake literal placeholders into the bundle (highest precedence in Vite, so
# they win over any .env file). prepare.sh swaps them for real values at boot.
ENV VITE_APP_NAME="##VITE_APP_NAME##" \
    VITE_APP_ENVIRONMENT="##VITE_APP_ENVIRONMENT##" \
    VITE_APP_TAG_VERSION="##VITE_APP_TAG_VERSION##" \
    VITE_APP_COMMIT_HASH="##VITE_APP_COMMIT_HASH##" \
    VITE_APP_URL="##VITE_APP_URL##" \
    VITE_API_URL="##VITE_API_URL##" \
    VITE_MCP_URL="##VITE_MCP_URL##" \
    VITE_TURNSTILE_SITE_KEY="##VITE_TURNSTILE_SITE_KEY##" \
    VITE_GOOGLE_CLIENT_ID="##VITE_GOOGLE_CLIENT_ID##"

RUN pnpm build

FROM nginx:alpine

COPY docker/conf.d /etc/nginx/conf.d
# nginx runs /docker-entrypoint.d/*.sh before starting; this rewrites the
# baked placeholders from the container env on every boot.
COPY docker/prepare.sh /docker-entrypoint.d/40-kartographe-env.sh
RUN chmod +x /docker-entrypoint.d/40-kartographe-env.sh

COPY --from=build /app/dist /usr/share/nginx/html
