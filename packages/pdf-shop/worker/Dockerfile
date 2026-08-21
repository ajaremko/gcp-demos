# Build context is this directory (packages/pdf-shop/worker) - the
# @nx/docker plugin's inferred docker:build target runs `docker build .`
# from the project root and can't see the workspace root. This assumes
# `nx build pdf-shop-worker` has already produced `dist/main.js` here; run
# that build immediately before `docker build`.
#
# webpack.config.js bundles @org/pdf-shop-application directly into
# dist/main.js (it has no npm registry entry to install from), but keeps
# express/pino/tslib as real dependencies - pino dynamically loads its
# transport at runtime in a way that breaks if pino itself is bundled.
# package.json still lists @org/pdf-shop-application (needed for local
# dev/build), so it's stripped here before installing the rest; tslib
# isn't a direct dependency of this package at all (only of the
# now-bundled @org/pdf-shop-application), so it's added explicitly.

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
RUN npm pkg delete "dependencies.@org/pdf-shop-application" \
  && npm pkg set "dependencies.tslib=^2.3.0" \
  && npm install --omit=dev

COPY dist/main.js ./

# Cloud Run injects PORT at runtime; main.ts reads it directly via
# process.env.PORT, so it's never hardcoded here. EXPOSE is documentation-only.
EXPOSE 8080

CMD ["node", "main.js"]
