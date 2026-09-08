# syntax=docker/dockerfile:1

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

COPY --exclude=**/.env* .next/standalone/. ./
COPY .next/static ./packages/html-gfx/website/.next/static
COPY public ./packages/html-gfx/website/public

CMD ["node", "packages/html-gfx/website/server.js"]
