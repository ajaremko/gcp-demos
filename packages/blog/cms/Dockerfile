# syntax=docker/dockerfile:1
# Build context is this directory (packages/blog/cms) - the
# @nx/docker plugin's inferred docker:build target runs `docker build .`
# from the project root and can't see the workspace root. This assumes
# `nx build blog-cms` has already produced `.next/standalone`
# here (next.config.js sets `output: 'standalone'`); run that build
# immediately before `docker build`.

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

# Standalone server + trimmed production node_modules. Next's standalone
# build copies the project's own .env into this tree (see
# known-issues.md) - excluded here so it never lands in an image layer at
# all; production config comes entirely from the deployed environment.
COPY --exclude=**/.env* .next/standalone/. ./
# Static assets and public files aren't included in the standalone output.
COPY .next/static ./packages/blog/cms/.next/static
COPY public ./packages/blog/cms/public
# Overwrite whatever output-file-tracing included (or omitted) for
# native/platform-specific dependencies with a complete Alpine-native
# install - see the deps stage above.
COPY --from=deps /deps/node_modules ./node_modules

CMD ["node", "packages/blog/cms/server.js"]

FROM app AS runner
# Add litestream 
COPY --from=litestream/litestream:0.5 /usr/local/bin/litestream /usr/local/bin/litestream
# litestream configuration is mounted via a volume in the container, so we don't need to copy it here.
# COPY litestream.yml /etc/litestream.yml
COPY run.sh /run.sh

CMD ["sh", "-c", "/run.sh"]
