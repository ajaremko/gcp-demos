# syntax=docker/dockerfile:1
# Build context is this directory (packages/pdf-shop/website) — the
# @nx/docker plugin's inferred docker:build target runs `docker build .`
# from the project root and can't see the workspace root. This assumes
# `nx build pdf-shop-website` has already produced `.next/standalone`
# here (next.config.js sets `output: 'standalone'`); run that build
# immediately before `docker build`.

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

# Standalone server + trimmed production node_modules. Next's standalone
# build copies the project's own .env into this tree (see
# known-issues.md) — excluded here so it never lands in an image layer at
# all; production config comes entirely from the deployed environment.
COPY --exclude=**/.env* .next/standalone/. ./
# Static assets and public files aren't included in the standalone output.
COPY .next/static ./packages/pdf-shop/website/.next/static
COPY public ./packages/pdf-shop/website/public

# Cloud Run injects PORT at runtime; Next's standalone server.js reads it
# directly, so it's never hardcoded here. EXPOSE is documentation-only.
EXPOSE 8080

CMD ["node", "packages/pdf-shop/website/server.js"]
