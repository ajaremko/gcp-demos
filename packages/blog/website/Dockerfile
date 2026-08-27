FROM node:22-alpine AS runtime

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY dist ./dist

ENV NODE_ENV=production
ENV HOST=0.0.0.0

CMD ["node", "./dist/server/entry.mjs"]