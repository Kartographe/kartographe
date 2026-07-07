#!/bin/sh
set -e

# Substitute the ##VITE_*## placeholders baked into the JS bundle at build time
# with the container's runtime env values. Runs from /docker-entrypoint.d on
# every nginx start, so repointing the app at another API / environment is just
# a matter of changing env vars and restarting — no rebuild.
#
# Unset vars collapse to an empty string, which `@t3-oss/env-core`
# (emptyStringAsUndefined) then treats as absent, falling back to the zod
# defaults declared in src/lib/env/env.ts.

ASSETS_DIR="/usr/share/nginx/html/assets"

for file in "$ASSETS_DIR"/*.js; do
  [ -e "$file" ] || continue
  sed -i \
    -e "s|##VITE_APP_NAME##|${VITE_APP_NAME}|g" \
    -e "s|##VITE_APP_ENVIRONMENT##|${VITE_APP_ENVIRONMENT}|g" \
    -e "s|##VITE_APP_TAG_VERSION##|${VITE_APP_TAG_VERSION}|g" \
    -e "s|##VITE_APP_COMMIT_HASH##|${VITE_APP_COMMIT_HASH}|g" \
    -e "s|##VITE_APP_URL##|${VITE_APP_URL}|g" \
    -e "s|##VITE_API_URL##|${VITE_API_URL}|g" \
    -e "s|##VITE_MCP_URL##|${VITE_MCP_URL}|g" \
    "$file"
done
