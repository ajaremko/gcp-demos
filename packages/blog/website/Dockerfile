FROM node:22-alpine AS runtime

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

RUN npm install

COPY dist ./

ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 4321
CMD ["node", "./server/entry.mjs"]