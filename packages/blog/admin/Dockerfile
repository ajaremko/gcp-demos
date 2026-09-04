# syntax=docker/dockerfile:1
# Build context is this directory (packages/blog/admin) - the
# @nx/docker plugin's inferred docker:build target runs `docker build .`
# from the project root and can't see the workspace root. This assumes
# `nx build blog-admin` has already produced both `.next/standalone`
# (next.config.js sets `output: 'standalone'`) and `dist/` (the prebuilt
# payload config + migrations, from scripts/build-config.mjs); run that
# build immediately before `docker build`.

# Some dependencies (sharp, and potentially others) ship platform-specific
# native binaries or runtime-dlopen'd shared libraries that Next's
# output-file-tracing can't detect via static import analysis, so it leaves
# them out of .next/standalone. Installing this project's real dependencies
# fresh here, inside the same Alpine/musl environment the final image uses,
# gets npm's own platform detection to resolve correct native binaries for
# every package.
FROM node:22-alpine AS deps
WORKDIR /deps
COPY package.json ./
RUN npm install

FROM node:22-alpine AS app
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
# The prebuilt config, not the TS source: the Next server has its own copy
# compiled into its chunks, so this only ever serves the `payload` CLI,
# which runs with --disable-transpile. See RUNBOOK.md, "What's in the image".
ENV PAYLOAD_CONFIG_PATH=/app/packages/blog/admin/dist/payload.config.js

# --- Next server ---
# Standalone server + traced node_modules. Exclude .env files which Next's
# standalone build copies by default.
COPY --exclude=**/.env* .next/standalone/. ./
# Client assets and public files - not included in the standalone output.
COPY .next/static ./packages/blog/admin/.next/static
COPY public ./packages/blog/admin/public

# --- payload CLI ---
# Prebuilt config + migrations (scripts/build-config.mjs, run by `npm run
# build`). Next's tracing can't see these: they're reached by a separate
# process, not by the server's import graph.
COPY dist ./packages/blog/admin/dist
# --- both ---
# Overwrite whatever output-file-tracing included (or omitted) for
# native/platform-specific dependencies with a complete Alpine-native
# install - see the deps stage above. Also the only source of
# node_modules/payload/bin.js, which the server never imports.
COPY --from=deps /deps/node_modules ./node_modules

CMD ["node", "packages/blog/admin/server.js"]

FROM app AS runner
# Add litestream 
COPY --from=litestream/litestream:0.5 /usr/local/bin/litestream /usr/local/bin/litestream
# litestream configuration is mounted via a volume in the container, so we don't need to copy it here.
# COPY run.sh /run.sh

# CMD ["sh", "-c", "/run.sh"]
