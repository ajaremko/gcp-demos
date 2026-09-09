FROM timbru31/node-chrome:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package.json ./
RUN npm pkg set "dependencies.tslib=^2.3.0" \
  && npm install --omit=dev

COPY dist/main.js ./

EXPOSE 8080

CMD ["node", "main.js"]
