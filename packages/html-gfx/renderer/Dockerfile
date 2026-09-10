FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update \
    && apt-get -yq upgrade \
    && apt-get install \
    && apt-get autoremove \
    && apt-get autoclean

# Install latest chrome dev package and fonts 
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y \
      google-chrome-stable \
      fonts-ipafont-gothic \
      fonts-wqy-zenhei \
      fonts-thai-tlwg \
      fonts-kacst \
      fonts-freefont-ttf \
      libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Use the system Chrome installed above instead of Puppeteer's own managed download
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package.json ./

RUN npm pkg set "dependencies.tslib=^2.3.0" \
    && npm install --omit=dev

COPY dist/main.js ./

EXPOSE 8080

CMD ["node", "main.js"]
