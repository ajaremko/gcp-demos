FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
RUN npm install --omit=dev

COPY dist/main.js ./

EXPOSE 8080

CMD ["node", "main.js"]
